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
  const WRITE_DEBOUNCE_MS = 500;
  const NOTIFY_DEBOUNCE_MS = 120;
  const ECHO_SUPPRESS_MS = 2500;

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
  let notifyTimer = null;
  const pendingNotifyKeys = new Set();
  let initError = null;

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
    if (cache.has(key)) return cache.get(key);
    return readLocal(key, fallback);
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
    if (cache.has(key)) return cache.get(key);
    const local = readLocal(key, fallback);
    if (local !== fallback) {
      cache.set(key, local);
      dataFingerprints.set(key, fingerprint(local));
    }
    return local;
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

    const currentVersion = (cache.get(`__ver:${key}`) || 0) + 1;
    cache.set(`__ver:${key}`, currentVersion);
    echoSuppress.set(`${key}:${currentVersion}`, Date.now());

    const { error } = await withTimeout(
      client
        .from('studio_collections')
        .upsert({
          workspace_id: workspaceId,
          collection_key: key,
          data: value,
          version: currentVersion,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id,collection_key' }),
      FETCH_TIMEOUT_MS,
      `Cloud save (${key})`,
    );

    if (error) {
      console.error('StudioStorage cloud write failed:', key, error);
      window.dispatchEvent(new CustomEvent('studio-storage-error', {
        detail: { key, error: error.message || String(error) },
      }));
    }
  }

  async function flushAll() {
    const keys = [...pendingWrites.keys()];
    await Promise.all(keys.map((key) => flushWrite(key)));
  }

  async function loadFromCloud() {
    const { data, error } = await withTimeout(
      client
        .from('studio_collections')
        .select('collection_key, data, version, updated_at')
        .eq('workspace_id', workspaceId),
      FETCH_TIMEOUT_MS,
      'Cloud load',
    );

    if (error) throw new Error(error.message || 'Could not load studio data from cloud.');

    (data || []).forEach((row) => {
      const merged = mergeArrayFromRemote(row.collection_key, row.data);
      cache.set(row.collection_key, merged);
      cache.set(`__ver:${row.collection_key}`, row.version || 0);
      dataFingerprints.set(row.collection_key, fingerprint(merged));
      writeLocal(row.collection_key, merged);
    });
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

  async function init(options = {}) {
    if (readyPromise) return readyPromise;

    readyPromise = (async () => {
      workspaceId = options.workspaceId || cfg().workspaceId || 'onyx';
      initError = null;

      if (!isCloudEnabled()) {
        ready = true;
        return { mode: 'local' };
      }

      if (!window.supabase?.createClient) {
        throw new Error('Supabase client not loaded. Add the CDN script before studio-storage.js.');
      }

      client = window.supabase.createClient(cfg().supabaseUrl, cfg().supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      await loadFromCloud();
      ready = true;
      applyPreReadyWrites();
      subscribeRealtime();
      if (!document.hidden) {
        refreshFromCloud().catch((err) => {
          console.warn('StudioStorage post-init refresh failed:', err);
        });
      }
      return { mode: 'cloud', workspaceId, collections: cache.size };
    })().catch((err) => {
      initError = err.message || String(err);
      readyPromise = null;
      console.error('StudioStorage init failed — falling back to local data.', err);
      ready = true;
      return { mode: 'local-fallback', error: initError };
    });

    return readyPromise;
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
      const local = readLocal(key, key === 'renova-studio-client-photos' ? {} : []);
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
    refreshFromCloud,
    getCollectionCounts,
    exportLocalSnapshot,
  };
})();