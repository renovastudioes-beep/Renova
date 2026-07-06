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

  const cache = new Map();
  const dataFingerprints = new Map();
  let client = null;
  let workspaceId = 'onyx';
  let ready = false;
  let readyPromise = null;
  let realtimeChannel = null;
  const pendingWrites = new Map();
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
    return fallback;
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

    cache.set(key, value);
    dataFingerprints.set(key, fp);
    writeLocal(key, value);
    queueCloudWrite(key, value);
    scheduleNotify(key);
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
      cache.set(row.collection_key, row.data);
      cache.set(`__ver:${row.collection_key}`, row.version || 0);
      dataFingerprints.set(row.collection_key, fingerprint(row.data));
      writeLocal(row.collection_key, row.data);
    });
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

    const fp = fingerprint(row.data);
    if (dataFingerprints.get(key) === fp) return;

    cache.set(key, row.data);
    cache.set(`__ver:${key}`, remoteVersion);
    dataFingerprints.set(key, fp);
    writeLocal(key, row.data);
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
      subscribeRealtime();
      ready = true;
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

  /** Push current browser localStorage studio keys to Supabase (one-time migration). */
  async function migrateLocalToCloud() {
    if (!client) throw new Error('Cloud storage not initialized.');
    const payload = [];
    STUDIO_KEYS.forEach((key) => {
      const data = readLocal(key, key === 'renova-studio-client-photos' ? {} : []);
      if (
        (Array.isArray(data) && data.length === 0)
        || (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0)
      ) return;
      cache.set(key, data);
      dataFingerprints.set(key, fingerprint(data));
      payload.push({
        workspace_id: workspaceId,
        collection_key: key,
        data,
        version: 1,
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
    return { migrated: payload.length };
  }

  function exportLocalSnapshot() {
    const out = {};
    STUDIO_KEYS.forEach((key) => {
      out[key] = readLocal(key, key === 'renova-studio-client-photos' ? {} : []);
    });
    return out;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init(); });
  } else {
    init();
  }

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
    exportLocalSnapshot,
  };
})();