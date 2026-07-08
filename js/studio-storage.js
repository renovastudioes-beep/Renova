/**
 * Shared studio storage — localStorage (offline) or Supabase (production).
 * Drop-in replacement for studio-admin.js read/write when cloud mode is enabled.
 */
window.StudioStorage = (function () {
  'use strict';

  const STUDIO_KEYS = new Set([
    'renova-studio-inquiries',
    'renvoa-studio-bookings',
    'renova-studio-clients',
    'renova-studio-appointments',
    'renova-studio-transactions',
    'renova-studio-calendar-settings',
    'renova-studio-pricing-overrides',
    'renova-studio-settings',
    'renova-studio-staff',
    'renova-studio-client-credits',
    'renova-studio-program-overrides',
    'renova-studio-client-photos',
    'renova-studio-program-visit-log',
    'renova-studio-program-warranty-log',
  ]);

  const FETCH_TIMEOUT_MS = 12000;
  const INIT_FETCH_TIMEOUT_MS = 20000;
  const INIT_MAX_ATTEMPTS = 3;
  const WRITE_DEBOUNCE_MS = 500;
  const NOTIFY_DEBOUNCE_MS = 120;
  const ECHO_SUPPRESS_MS = 2500;
  const FLUSH_MAX_ATTEMPTS = 3;

  const ARRAY_MERGE_KEYS = new Set([
    'renova-studio-clients',
    'renova-studio-appointments',
    'renova-studio-transactions',
    'renova-studio-client-credits',
    'renova-studio-program-overrides',
    'renova-studio-program-visit-log',
    'renova-studio-program-warranty-log',
    'renova-studio-inquiries',
    'renvoa-studio-bookings',
    'renova-studio-staff',
  ]);

  const cache = new Map();
  const dataFingerprints = new Map();
  let client = null;
  let workspaceId = 'onyx';
  let ready = false;
  let readyPromise = null;
  let realtimeChannel = null;
  const pendingWrites = new Map();
  const preReadyWrites = new Map();
  const writeTimers = new Map();
  const listeners = new Set();
  const echoSuppress = new Map();
  const flushInFlight = new Map();
  let notifyTimer = null;
  const pendingNotifyKeys = new Set();
  let initError = null;
  let cloudClientCount = null;

  function cfg() {
    return window.RENVOA_CONFIG?.cloud || {};
  }

  function isCloudEnabled() {
    const c = cfg();
    return !!(c.enabled && c.supabaseUrl && c.supabaseAnonKey);
  }

  function isManagedKey(key) {
    return STUDIO_KEYS.has(key);
  }

  function fingerprint(value) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(Date.now());
    }
  }

  function recordTimestamp(item) {
    return new Date(item?.updatedAt || item?.createdAt || item?.at || 0).getTime();
  }

  function mergeArrayUnion(incoming, existing) {
    if (!Array.isArray(incoming)) return incoming;
    if (!Array.isArray(existing) || !existing.length) return incoming;
    const byId = new Map();
    existing.forEach((item) => {
      const id = String(item?.id || '').trim();
      if (id) byId.set(id, item);
    });
    incoming.forEach((item) => {
      const id = String(item?.id || '').trim();
      if (!id) return;
      const prev = byId.get(id);
      if (!prev) {
        byId.set(id, item);
        return;
      }
      byId.set(id, recordTimestamp(item) >= recordTimestamp(prev) ? item : prev);
    });
    return [...byId.values()];
  }

  function getExistingCollection(key, fallback = []) {
    return getBestLocalSnapshot(key, fallback);
  }

  /** Union of in-memory cache and localStorage — never miss records that exist only on disk. */
  function getBestLocalSnapshot(key, fallback) {
    const local = readLocal(key, fallback);
    if (!cache.has(key)) return local;
    const cached = cache.get(key);
    if (ARRAY_MERGE_KEYS.has(key) && Array.isArray(cached) && Array.isArray(local)) {
      return mergeArrayUnion(local, cached);
    }
    if (ARRAY_MERGE_KEYS.has(key) && Array.isArray(cached)) return cached;
    if (cached !== undefined && cached !== null) return cached;
    return local;
  }

  function mergeValueForUpload(key, localValue, cloudData) {
    if (ARRAY_MERGE_KEYS.has(key) && Array.isArray(localValue) && Array.isArray(cloudData)) {
      return mergeArrayUnion(localValue, cloudData);
    }
    if (cloudData == null || cloudData === undefined) return localValue;
    const localEmpty = Array.isArray(localValue)
      ? !localValue.length
      : (localValue && typeof localValue === 'object' && !Object.keys(localValue).length);
    if (localEmpty) return cloudData;
    return localValue;
  }

  async function fetchCloudRow(key) {
    const { data, error } = await withTimeout(
      client
        .from('studio_collections')
        .select('collection_key, data, version, updated_at')
        .eq('workspace_id', workspaceId)
        .eq('collection_key', key)
        .limit(1),
      FETCH_TIMEOUT_MS,
      `Cloud read (${key})`,
    );
    if (error) throw new Error(error.message || `Could not read ${key} from cloud.`);
    return (data && data[0]) || null;
  }

  /** Union-merge for cloud load, realtime, and refresh — never drop rows from other devices. */
  function mergeArrayFromRemote(key, incoming) {
    if (!ARRAY_MERGE_KEYS.has(key) || !Array.isArray(incoming)) return incoming;
    const existing = getExistingCollection(key, []);
    if (!Array.isArray(existing) || !existing.length) return incoming;
    return mergeArrayUnion(incoming, existing);
  }

  /**
   * Write-path merge: honor intentional deletions (strict subset), but block stale
   * partial snapshots from one device overwriting a fuller list in cloud.
   */
  function reconcileArrayWrite(key, incoming) {
    if (!ARRAY_MERGE_KEYS.has(key) || !Array.isArray(incoming)) return incoming;
    const existing = getExistingCollection(key, []);
    if (!Array.isArray(existing) || !existing.length) return incoming;

    const existingById = new Map();
    existing.forEach((item) => {
      const id = String(item?.id || '').trim();
      if (id) existingById.set(id, item);
    });

    const incomingIds = incoming
      .map((item) => String(item?.id || '').trim())
      .filter(Boolean);
    if (!incomingIds.length) return incoming;

    const allIncomingKnown = incomingIds.every((id) => existingById.has(id));
    const isDeletion = allIncomingKnown && incoming.length < existing.length;

    if (isDeletion) {
      return incoming.map((item) => {
        const id = String(item?.id || '').trim();
        const prev = existingById.get(id);
        if (!prev) return item;
        return recordTimestamp(item) >= recordTimestamp(prev) ? item : prev;
      });
    }

    if (incoming.length < existing.length) {
      return mergeArrayUnion(incoming, existing);
    }

    return mergeArrayUnion(incoming, existing);
  }

  function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${label || 'Request'} timed out after ${ms / 1000}s`));
      }, ms);
      Promise.resolve(promise)
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  function readLocal(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeLocal(key, value) {
    const next = fingerprint(value);
    if (dataFingerprints.get(key) === next) return;
    dataFingerprints.set(key, next);
    localStorage.setItem(key, JSON.stringify(value));
  }

  function scheduleNotify(key) {
    pendingNotifyKeys.add(key);
    if (notifyTimer) return;
    notifyTimer = setTimeout(() => {
      notifyTimer = null;
      const keys = [...pendingNotifyKeys];
      pendingNotifyKeys.clear();
      keys.forEach((k) => {
        listeners.forEach((fn) => {
          try { fn(k); } catch (err) { console.error('StudioStorage listener error', err); }
        });
      });
    }, NOTIFY_DEBOUNCE_MS);
  }

  function read(key, fallback) {
    if (!isCloudEnabled() || !isManagedKey(key)) return readLocal(key, fallback);
    if (!ready) return readLocal(key, fallback);
    const snapshot = getBestLocalSnapshot(key, fallback);
    if (snapshot !== fallback) {
      const fp = fingerprint(snapshot);
      if (dataFingerprints.get(key) !== fp || !cache.has(key)) {
        cache.set(key, snapshot);
        dataFingerprints.set(key, fp);
      }
    }
    return snapshot;
  }

  function write(key, value) {
    const fp = fingerprint(value);
    const unchanged = dataFingerprints.get(key) === fp;
    if (unchanged && cache.has(key)) return;

    if (!isCloudEnabled() || !isManagedKey(key)) {
      writeLocal(key, value);
      if (!unchanged) scheduleNotify(key);
      return;
    }

    if (!ready) {
      preReadyWrites.set(key, value);
      writeLocal(key, value);
      if (!unchanged) scheduleNotify(key);
      return;
    }

    const nextValue = reconcileArrayWrite(key, value);
    const nextFp = fingerprint(nextValue);
    cache.set(key, nextValue);
    dataFingerprints.set(key, nextFp);
    writeLocal(key, nextValue);
    queueCloudWrite(key, nextValue);
    scheduleNotify(key);
  }

  function applyPreReadyWrites() {
    if (!preReadyWrites.size) return;
    preReadyWrites.forEach((value, key) => {
      const merged = reconcileArrayWrite(key, value);
      const fp = fingerprint(merged);
      if (dataFingerprints.get(key) === fp && cache.has(key)) return;
      cache.set(key, merged);
      dataFingerprints.set(key, fp);
      writeLocal(key, merged);
      queueCloudWrite(key, merged);
      scheduleNotify(key);
    });
    preReadyWrites.clear();
  }

  function queueCloudWrite(key, value) {
    pendingWrites.set(key, value);
    if (writeTimers.has(key)) clearTimeout(writeTimers.get(key));
    writeTimers.set(key, setTimeout(() => flushWrite(key), WRITE_DEBOUNCE_MS));
  }

  async function flushWrite(key) {
    writeTimers.delete(key);
    const value = pendingWrites.get(key);
    pendingWrites.delete(key);
    if (!client || value === undefined) return;

    const prior = flushInFlight.get(key);
    if (prior) {
      await prior.catch(() => {});
      if (pendingWrites.has(key)) queueCloudWrite(key, pendingWrites.get(key));
      return;
    }

    const job = performFlushWrite(key, value);
    flushInFlight.set(key, job);
    try {
      await job;
    } finally {
      flushInFlight.delete(key);
    }
  }

  async function performFlushWrite(key, localValue) {
    let lastError = null;

    for (let attempt = 1; attempt <= FLUSH_MAX_ATTEMPTS; attempt += 1) {
      try {
        const cloudRow = await fetchCloudRow(key);
        const cloudData = cloudRow?.data;
        const cloudVersion = cloudRow?.version || 0;
        const merged = mergeValueForUpload(key, localValue, cloudData);
        const localVersion = cache.get(`__ver:${key}`) || 0;
        const nextVersion = Math.max(cloudVersion, localVersion) + 1;

        const mergedFp = fingerprint(merged);
        if (dataFingerprints.get(key) !== mergedFp) {
          applyMergedRow(key, merged, nextVersion);
          scheduleNotify(key);
        } else {
          cache.set(`__ver:${key}`, nextVersion);
        }

        echoSuppress.set(`${key}:${nextVersion}`, Date.now());

        const { error } = await withTimeout(
          client
            .from('studio_collections')
            .upsert({
              workspace_id: workspaceId,
              collection_key: key,
              data: merged,
              version: nextVersion,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'workspace_id,collection_key' }),
          FETCH_TIMEOUT_MS,
          `Cloud save (${key})`,
        );

        if (error) throw new Error(error.message || String(error));
        if (key === 'renova-studio-clients' && Array.isArray(merged)) {
          cloudClientCount = merged.length;
        }
        return;
      } catch (err) {
        lastError = err;
        if (attempt < FLUSH_MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
        }
      }
    }

    console.error('StudioStorage cloud write failed:', key, lastError);
    pendingWrites.set(key, getBestLocalSnapshot(key, localValue));
    queueCloudWrite(key, pendingWrites.get(key));
    window.dispatchEvent(new CustomEvent('studio-storage-error', {
      detail: { key, error: lastError?.message || String(lastError) },
    }));
  }

  async function flushAll() {
    const keys = [...pendingWrites.keys()];
    await Promise.all(keys.map((key) => flushWrite(key)));
  }

  function applyMergedRow(key, merged, version) {
    cache.set(key, merged);
    if (version != null) cache.set(`__ver:${key}`, version);
    dataFingerprints.set(key, fingerprint(merged));
    writeLocal(key, merged);
  }

  async function loadFromCloud(timeoutMs = FETCH_TIMEOUT_MS) {
    const { data, error } = await withTimeout(
      client
        .from('studio_collections')
        .select('collection_key, data, version, updated_at')
        .eq('workspace_id', workspaceId),
      timeoutMs,
      'Cloud load',
    );

    if (error) throw new Error(error.message || 'Could not load studio data from cloud.');

    const cloudKeys = new Set();
    (data || []).forEach((row) => {
      cloudKeys.add(row.collection_key);
      const merged = mergeArrayFromRemote(row.collection_key, row.data);
      applyMergedRow(row.collection_key, merged, row.version || 0);
      if (row.collection_key === 'renova-studio-clients' && Array.isArray(merged)) {
        cloudClientCount = merged.length;
      }
    });

    STUDIO_KEYS.forEach((key) => {
      if (cloudKeys.has(key)) return;
      const local = readLocal(key, key === 'renova-studio-client-photos' ? {} : []);
      const hasLocal = Array.isArray(local)
        ? local.length > 0
        : (local && typeof local === 'object' && Object.keys(local).length > 0);
      if (!hasLocal) return;
      applyMergedRow(key, local, cache.get(`__ver:${key}`) || 0);
    });
  }

  /** Push union-merged local data to cloud when this device has records the server lacks. */
  async function reconcileToCloud() {
    if (!client || !ready || !isCloudEnabled()) {
      return { ok: false, reason: 'not-ready' };
    }

    const { data, error } = await withTimeout(
      client
        .from('studio_collections')
        .select('collection_key, data, version')
        .eq('workspace_id', workspaceId),
      FETCH_TIMEOUT_MS,
      'Cloud reconcile',
    );
    if (error) throw new Error(error.message || 'Could not reconcile studio data with cloud.');

    const cloudByKey = new Map((data || []).map((row) => [row.collection_key, row]));
    const payload = [];

    STUDIO_KEYS.forEach((key) => {
      const fallback = key === 'renova-studio-client-photos' ? {} : [];
      const localMerged = getBestLocalSnapshot(key, fallback);
      const cloudRow = cloudByKey.get(key);
      const cloudData = cloudRow?.data;
      let merged = localMerged;

      if (ARRAY_MERGE_KEYS.has(key) && Array.isArray(localMerged) && Array.isArray(cloudData)) {
        merged = mergeArrayUnion(localMerged, cloudData);
      } else if (
        (!Array.isArray(localMerged) || !localMerged.length)
        && cloudData
        && (Array.isArray(cloudData) ? cloudData.length : Object.keys(cloudData).length)
      ) {
        merged = cloudData;
      }

      const emptyArray = Array.isArray(merged) && merged.length === 0;
      const emptyObject = merged && typeof merged === 'object' && !Array.isArray(merged) && !Object.keys(merged).length;
      if (emptyArray || emptyObject) return;

      const mergedFp = fingerprint(merged);
      if (cloudRow && fingerprint(cloudData) === mergedFp) {
        applyMergedRow(key, merged, cloudRow.version || 0);
        return;
      }

      applyMergedRow(key, merged, Math.max(cloudRow?.version || 0, cache.get(`__ver:${key}`) || 0));
      const version = Math.max(cloudRow?.version || 0, cache.get(`__ver:${key}`) || 0) + 1;
      cache.set(`__ver:${key}`, version);
      payload.push({
        workspace_id: workspaceId,
        collection_key: key,
        data: merged,
        version,
        updated_at: new Date().toISOString(),
      });
    });

    if (!payload.length) {
      return { ok: true, uploaded: 0 };
    }

    const { error: upsertError } = await withTimeout(
      client.from('studio_collections').upsert(payload, {
        onConflict: 'workspace_id,collection_key',
      }),
      FETCH_TIMEOUT_MS * 2,
      'Cloud reconcile upload',
    );
    if (upsertError) throw new Error(upsertError.message || 'Cloud reconcile upload failed.');

    payload.forEach((row) => {
      if (row.collection_key === 'renova-studio-clients' && Array.isArray(row.data)) {
        cloudClientCount = row.data.length;
      }
      scheduleNotify(row.collection_key);
    });

    return { ok: true, uploaded: payload.length };
  }

  async function syncNow() {
    if (!client || !ready || !isCloudEnabled()) {
      return { ok: false, reason: 'not-ready' };
    }
    const refresh = await refreshFromCloud();
    const reconcile = await reconcileToCloud();
    const counts = await fetchCloudCounts().catch(() => null);
    return { ok: true, refresh, reconcile, counts };
  }

  async function fetchCloudCounts() {
    if (!client || !isCloudEnabled()) return null;
    const { data, error } = await withTimeout(
      client
        .from('studio_collections')
        .select('collection_key, data')
        .eq('workspace_id', workspaceId)
        .in('collection_key', ['renova-studio-clients', 'renova-studio-appointments']),
      FETCH_TIMEOUT_MS,
      'Cloud counts',
    );
    if (error) throw new Error(error.message || 'Could not fetch cloud counts.');
    const clientsRow = (data || []).find((r) => r.collection_key === 'renova-studio-clients');
    const apptsRow = (data || []).find((r) => r.collection_key === 'renova-studio-appointments');
    const clients = Array.isArray(clientsRow?.data) ? clientsRow.data.length : 0;
    const appointments = Array.isArray(apptsRow?.data) ? apptsRow.data.length : 0;
    cloudClientCount = clients;
    return { clients, appointments };
  }

  async function refreshFromCloud() {
    if (!client || !ready || !isCloudEnabled()) {
      return { ok: false, reason: 'not-ready' };
    }
    const { data, error } = await withTimeout(
      client
        .from('studio_collections')
        .select('collection_key, data, version, updated_at')
        .eq('workspace_id', workspaceId),
      FETCH_TIMEOUT_MS,
      'Cloud refresh',
    );
    if (error) throw new Error(error.message || 'Could not refresh studio data from cloud.');

    const touched = [];
    (data || []).forEach((row) => {
      const merged = mergeArrayFromRemote(row.collection_key, row.data);
      const fp = fingerprint(merged);
      if (dataFingerprints.get(row.collection_key) === fp && cache.has(row.collection_key)) return;
      cache.set(row.collection_key, merged);
      cache.set(`__ver:${row.collection_key}`, row.version || 0);
      dataFingerprints.set(row.collection_key, fp);
      writeLocal(row.collection_key, merged);
      scheduleNotify(row.collection_key);
      touched.push(row.collection_key);
    });
    if (touched.length) {
      window.dispatchEvent(new CustomEvent('studio-storage-remote', { detail: { keys: touched } }));
    }
    return { ok: true, collections: (data || []).length, updated: touched.length };
  }

  function shouldSuppressEcho(key, version) {
    const stamp = echoSuppress.get(`${key}:${version}`);
    if (!stamp) return false;
    if (Date.now() - stamp > ECHO_SUPPRESS_MS) {
      echoSuppress.delete(`${key}:${version}`);
      return false;
    }
    return true;
  }

  function applyRemoteRow(row) {
    if (!row?.collection_key) return;
    const key = row.collection_key;
    const remoteVersion = row.version || 0;
    if (shouldSuppressEcho(key, remoteVersion)) return;

    const localVersion = cache.get(`__ver:${key}`) || 0;
    if (remoteVersion < localVersion) return;

    const merged = mergeArrayFromRemote(key, row.data);
    const fp = fingerprint(merged);
    if (dataFingerprints.get(key) === fp) return;

    cache.set(key, merged);
    cache.set(`__ver:${key}`, remoteVersion);
    dataFingerprints.set(key, fp);
    writeLocal(key, merged);
    scheduleNotify(key);
    window.dispatchEvent(new CustomEvent('studio-storage-remote', { detail: { key } }));
  }

  function subscribeRealtime() {
    if (!client || realtimeChannel) return;
    realtimeChannel = client
      .channel(`studio-collections:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'studio_collections',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const row = payload.new || payload.old;
          if (payload.eventType === 'DELETE') return;
          applyRemoteRow(row);
        },
      )
      .subscribe();
  }

  async function connectCloud(options = {}) {
    workspaceId = options.workspaceId || cfg().workspaceId || 'onyx';
    initError = null;

    if (!window.supabase?.createClient) {
      throw new Error('Supabase client not loaded. Add the CDN script before studio-storage.js.');
    }

    client = window.supabase.createClient(cfg().supabaseUrl, cfg().supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let lastErr = null;
    for (let attempt = 1; attempt <= INIT_MAX_ATTEMPTS; attempt += 1) {
      try {
        const timeoutMs = attempt >= INIT_MAX_ATTEMPTS ? INIT_FETCH_TIMEOUT_MS : FETCH_TIMEOUT_MS;
        await loadFromCloud(timeoutMs);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        console.warn(`StudioStorage cloud load attempt ${attempt}/${INIT_MAX_ATTEMPTS} failed:`, err);
        if (attempt < INIT_MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
        }
      }
    }
    if (lastErr) throw lastErr;

    ready = true;
    applyPreReadyWrites();
    try {
      await reconcileToCloud();
    } catch (reconcileErr) {
      console.warn('StudioStorage reconcile on init failed:', reconcileErr);
    }
    subscribeRealtime();
    fetchCloudCounts().catch(() => {});
    if (!document.hidden) {
      refreshFromCloud().catch((err) => {
        console.warn('StudioStorage post-init refresh failed:', err);
      });
    }
    return { mode: 'cloud', workspaceId, collections: cache.size };
  }

  async function init(options = {}) {
    if (readyPromise) return readyPromise;

    readyPromise = (async () => {
      if (!isCloudEnabled()) {
        ready = true;
        return { mode: 'local' };
      }
      return connectCloud(options);
    })().catch((err) => {
      initError = err.message || String(err);
      readyPromise = null;
      console.error('StudioStorage init failed — falling back to local data.', err);
      ready = true;
      return { mode: 'local-fallback', error: initError };
    });

    return readyPromise;
  }

  async function retryCloudConnection(options = {}) {
    if (!isCloudEnabled()) return { ok: false, reason: 'cloud-disabled' };
    if (realtimeChannel) {
      try { client?.removeChannel(realtimeChannel); } catch { /* ignore */ }
      realtimeChannel = null;
    }
    readyPromise = null;
    ready = false;
    initError = null;
    const result = await init(options);
    if (result.mode === 'cloud') {
      window.dispatchEvent(new CustomEvent('studio-storage-remote', { detail: { keys: [...STUDIO_KEYS] } }));
    }
    return { ok: result.mode === 'cloud', ...result };
  }

  function whenReady() {
    return readyPromise || Promise.resolve({ mode: ready ? 'local' : 'pending' });
  }

  function isReady() {
    return ready;
  }

  function getInitError() {
    return initError;
  }

  function getMode() {
    if (!isCloudEnabled()) return 'local';
    if (!ready) return 'initializing';
    if (initError) return 'local-fallback';
    return 'cloud';
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  /** Push this device's data to Supabase, union-merged with whatever is already in cloud. */
  async function migrateLocalToCloud() {
    if (!client) throw new Error('Cloud storage not initialized.');

    const { data: cloudRows, error: loadError } = await withTimeout(
      client
        .from('studio_collections')
        .select('collection_key, data, version')
        .eq('workspace_id', workspaceId),
      FETCH_TIMEOUT_MS * 2,
      'Cloud migration load',
    );
    if (loadError) throw new Error(loadError.message || 'Could not read cloud data before upload.');

    const cloudByKey = new Map((cloudRows || []).map((row) => [row.collection_key, row]));

    const payload = [];
    STUDIO_KEYS.forEach((key) => {
      const fallback = key === 'renova-studio-client-photos' ? {} : [];
      const local = getBestLocalSnapshot(key, fallback);
      const cloudRow = cloudByKey.get(key);
      const cloudData = cloudRow?.data;
      let merged = local;

      if (ARRAY_MERGE_KEYS.has(key) && Array.isArray(local) && Array.isArray(cloudData)) {
        merged = mergeArrayUnion(local, cloudData);
      } else if (
        (!Array.isArray(local) || !local.length)
        && cloudData
        && (Array.isArray(cloudData) ? cloudData.length : Object.keys(cloudData).length)
      ) {
        merged = cloudData;
      }

      const emptyArray = Array.isArray(merged) && merged.length === 0;
      const emptyObject = merged && typeof merged === 'object' && !Array.isArray(merged) && !Object.keys(merged).length;
      if (emptyArray || emptyObject) return;

      const version = Math.max(cloudRow?.version || 0, cache.get(`__ver:${key}`) || 0) + 1;
      cache.set(key, merged);
      cache.set(`__ver:${key}`, version);
      dataFingerprints.set(key, fingerprint(merged));
      writeLocal(key, merged);
      payload.push({
        workspace_id: workspaceId,
        collection_key: key,
        data: merged,
        version,
        updated_at: new Date().toISOString(),
      });
    });

    if (!payload.length) return { migrated: 0 };
    const { error } = await withTimeout(
      client.from('studio_collections').upsert(payload, {
        onConflict: 'workspace_id,collection_key',
      }),
      FETCH_TIMEOUT_MS * 2,
      'Cloud migration',
    );
    if (error) throw new Error(error.message || 'Migration failed.');
    payload.forEach((row) => scheduleNotify(row.collection_key));
    return { migrated: payload.length };
  }

  function getCollectionCounts() {
    const clients = getExistingCollection('renova-studio-clients', []);
    const appointments = getExistingCollection('renova-studio-appointments', []);
    return {
      clients: Array.isArray(clients) ? clients.length : 0,
      appointments: Array.isArray(appointments) ? appointments.length : 0,
      cloudClients: cloudClientCount,
    };
  }

  function exportLocalSnapshot() {
    const out = {};
    STUDIO_KEYS.forEach((key) => {
      out[key] = readLocal(key, key === 'renova-studio-client-photos' ? {} : []);
    });
    return out;
  }

  let refreshInFlight = null;

  function scheduleCloudRefresh() {
    if (!ready || !client || document.hidden) return;
    if (refreshInFlight) return;
    refreshInFlight = refreshFromCloud()
      .catch((err) => {
        console.warn('StudioStorage visibility refresh failed:', err);
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init(); });
  } else {
    init();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleCloudRefresh();
  });

  window.addEventListener('focus', scheduleCloudRefresh);

  window.addEventListener('beforeunload', () => {
    flushAll();
  });

  return {
    STUDIO_KEYS,
    init,
    whenReady,
    isReady,
    getInitError,
    getMode,
    isCloudEnabled,
    read,
    write,
    flushAll,
    onChange,
    migrateLocalToCloud,
    reconcileToCloud,
    refreshFromCloud,
    syncNow,
    retryCloudConnection,
    fetchCloudCounts,
    getCollectionCounts,
    exportLocalSnapshot,
  };
})();