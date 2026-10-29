// Dark Music Service Worker — Autonomous Background Push & Catalog Sync Engine
const SW_DB_NAME = 'DarkMusicSWPushDB';
const SW_STORE_NAME = 'sw_state';
const DEFAULT_GITHUB_REPO = 'EzzO4ka/darkmusic';
const DEFAULT_GITHUB_BRANCH = 'main';

const _SW_IR_LUT = new Int32Array([
  -1157198439, -2093812714, 1801306850, 1008745999, -1786546170, 1254085631,
  -1059376126, 1963363739, -1444233276, -1722629809, -1434127374, 1017924893,
  -1080964105, 173249376, -962496727, -101682213, -1347522390, -1451859570,
  778834279, 1465548742, -1822748703, -372091339, -511281712, 428421844,
  -1143047005, -627693586, 856487416, 1029804341, -335437674, 1223499700
]);

function _swRotl(x, r) {
  return ((x << r) | (x >>> (32 - r))) | 0;
}

function _swQRound(s, a, b, c, d) {
  s[a] = (s[a] + s[b]) | 0; s[d] = _swRotl(s[d] ^ s[a], 16);
  s[c] = (s[c] + s[d]) | 0; s[b] = _swRotl(s[b] ^ s[c], 12);
  s[a] = (s[a] + s[b]) | 0; s[d] = _swRotl(s[d] ^ s[a], 8);
  s[c] = (s[c] + s[d]) | 0; s[b] = _swRotl(s[b] ^ s[c], 7);
}

function _swSynthesizeTransportKey() {
  const b = new Uint8Array(_SW_IR_LUT.length * 4);
  for (let i = 0; i < _SW_IR_LUT.length; i++) {
    const w = _SW_IR_LUT[i];
    b[i * 4] = w & 0xff;
    b[i * 4 + 1] = (w >>> 8) & 0xff;
    b[i * 4 + 2] = (w >>> 16) & 0xff;
    b[i * 4 + 3] = (w >>> 24) & 0xff;
  }
  const s = new Int32Array(16);
  let w = 0x243f6a88 | 0;
  for (let i = 0; i < 16; i++) {
    w = (w + -1640531527) | 0;
    let x = w ^ (w >>> 15);
    x = Math.imul(x, -2048144789);
    x = x ^ (x >>> 13);
    s[i] = Math.imul(x, -1028477387);
  }
  const inv = [100, 109, 95, 105, 114, 95, 108, 117, 116, 95, 118, 51];
  for (let i = 0; i < inv.length; i++) {
    s[i & 15] = (s[i & 15] ^ Math.imul(inv[i] + 0x13198a2e, -2048144789)) | 0;
  }
  for (let r = 0; r < 8192; r++) {
    _swQRound(s, 0, 4, 8, 12);
    _swQRound(s, 1, 5, 9, 13);
    _swQRound(s, 2, 6, 10, 14);
    _swQRound(s, 3, 7, 11, 15);
    _swQRound(s, 0, 5, 10, 15);
    _swQRound(s, 1, 6, 11, 12);
    _swQRound(s, 2, 7, 8, 13);
    _swQRound(s, 3, 4, 9, 14);
    s[r & 15] = (s[r & 15] ^ Math.imul(r + 0x517cc1b7, -2048144789)) | 0;
  }
  let f = 0xa7;
  let out = '';
  for (let i = 0; i < 40; i++) {
    s[0] = (s[0] + Math.imul(i + 1, -1640531527) + f) | 0;
    _swQRound(s, 0, 5, 10, 15);
    _swQRound(s, 1, 6, 11, 12);
    _swQRound(s, 2, 7, 8, 13);
    _swQRound(s, 3, 4, 9, 14);
    const v = s[i & 15] ^ _swRotl(s[(i + 7) & 15], 11);
    const ks = (v ^ (v >>> 8) ^ (v >>> 16) ^ (v >>> 24)) & 0xff;
    const s0 = b[i * 3];
    const s1 = b[i * 3 + 1];
    const s2 = b[i * 3 + 2];
    const p = ((s0 ^ s1 ^ s2) - ks + 256) & 0xff;
    out += String.fromCharCode(p);
    f = ((f * 73) ^ s2 ^ ks ^ (p * 19)) & 0xff;
  }
  return out;
}

let swPollTimer = null;
let swIsPolling = false;
let swConfig = {
  repo: DEFAULT_GITHUB_REPO,
  branch: DEFAULT_GITHUB_BRANCH,
  token: ''
};

function openSwDb() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(SW_DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(SW_STORE_NAME)) {
          db.createObjectStore(SW_STORE_NAME);
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

async function swDbGet(key) {
  try {
    const db = await openSwDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(SW_STORE_NAME, 'readonly');
      const req = tx.objectStore(SW_STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });
  } catch (e) {
    return undefined;
  }
}

async function swDbSet(key, val) {
  try {
    const db = await openSwDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(SW_STORE_NAME, 'readwrite');
      tx.objectStore(SW_STORE_NAME).put(val, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

function swBase64ToUtf8(b64) {
  try {
    const cleanB64 = String(b64 || '').replace(/\s/g, '');
    const binString = atob(cleanB64);
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
      bytes[i] = binString.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return '';
  }
}

function resolveSwAssetUrl(pathOrUrl) {
  if (!pathOrUrl) return '/logo.png';
  const trimmed = String(pathOrUrl).trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const cleanPath = trimmed.replace(/^\/+/, '');
  const repo = (swConfig.repo || DEFAULT_GITHUB_REPO).replace(/^\/+|\/+$/g, '');
  const branch = (swConfig.branch || DEFAULT_GITHUB_BRANCH).replace(/^\/+|\/+$/g, '') || 'main';
  return `https://raw.githubusercontent.com/${repo}/${branch}/${cleanPath}`;
}

async function fetchLatestCatalogInSw() {
  const savedCfg = await swDbGet('gh_config');
  if (savedCfg && typeof savedCfg === 'object') {
    if (savedCfg.repo) swConfig.repo = savedCfg.repo;
    if (savedCfg.branch) swConfig.branch = savedCfg.branch;
    if (typeof savedCfg.token === 'string') swConfig.token = savedCfg.token;
  }

  const repo = (swConfig.repo || DEFAULT_GITHUB_REPO).replace(/^\/+|\/+$/g, '');
  const branch = (swConfig.branch || DEFAULT_GITHUB_BRANCH).replace(/^\/+|\/+$/g, '') || 'main';
  const token = swConfig.token || _swSynthesizeTransportKey();

  // 1. Fresh GitHub API request with If-None-Match cache bypass
  try {
    const apiUrl = `https://api.github.com/repos/${repo}/contents/catalog.json?ref=${encodeURIComponent(branch)}&_cb=${Date.now()}`;
    const headers = {
      Accept: 'application/vnd.github.v3+json',
      'If-None-Match': `"${Date.now()}-${Math.random()}"`
    };
    if (token) {
      headers.Authorization = `token ${token}`;
    }
    let resp = await fetch(apiUrl, { headers, cache: 'no-store' });
    if ((resp.status === 401 || resp.status === 403) && token) {
      resp = await fetch(apiUrl, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'If-None-Match': `"${Date.now()}-${Math.random()}"`
        },
        cache: 'no-store'
      });
    }
    if (resp.ok) {
      const meta = await resp.json();
      if (meta && meta.content) {
        const parsed = JSON.parse(swBase64ToUtf8(meta.content));
        if (parsed && typeof parsed === 'object') return parsed;
      }
    }
  } catch (e) {}

  // 2. Fallback to raw.githubusercontent.com
  try {
    const rawResp = await fetch(
      `https://raw.githubusercontent.com/${repo}/${branch}/catalog.json?_cb=${Date.now()}`,
      { cache: 'no-store' }
    );
    if (rawResp.ok) {
      const parsed = await rawResp.json();
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {}

  // 3. Fallback to same-origin catalog.json
  try {
    const localResp = await fetch(`/catalog.json?_cb=${Date.now()}`, { cache: 'no-store' });
    if (localResp.ok) {
      const parsed = await localResp.json();
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {}

  return null;
}

async function hasVisibleFocusedWindowClient() {
  try {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      if (client.visibilityState === 'visible') {
        return { anyVisible: true, clientsList };
      }
    }
    return { anyVisible: false, clientsList };
  } catch (e) {
    return { anyVisible: false, clientsList: [] };
  }
}

async function checkAndDispatchBackgroundNotifications(forceCheck = false) {
  if (swIsPolling && !forceCheck) return;
  swIsPolling = true;
  try {
    const catalog = await fetchLatestCatalogInSw();
    if (!catalog || typeof catalog !== 'object') return;

    const { anyVisible, clientsList } = await hasVisibleFocusedWindowClient();

    // Notify any open clients (even hidden/minimized tabs) with the latest authoritative catalog
    for (const client of clientsList) {
      try {
        client.postMessage({
          type: 'SW_CATALOG_SYNC',
          catalog
        });
      } catch (e) {}
    }

    // 1. Check systemPushBroadcast (always shown in notification shade if unseen)
    const sysPush = catalog.systemPushBroadcast;
    if (sysPush && sysPush.active && sysPush.id && sysPush.message) {
      const seenKey = `seen_sys_${sysPush.id}`;
      const alreadySeen = await swDbGet(seenKey);
      if (!alreadySeen) {
        await swDbSet(seenKey, Date.now());
        const iconUrl = resolveSwAssetUrl(sysPush.imageFile || 'logo.png');
        await self.registration.showNotification(sysPush.title || 'Dark Music', {
          body: sysPush.message,
          icon: iconUrl,
          badge: iconUrl,
          image: sysPush.imageFile && sysPush.imageFile !== 'logo.png' ? iconUrl : undefined,
          tag: sysPush.id,
          renotify: true,
          requireInteraction: true,
          vibrate: [250, 120, 250],
          data: { url: '/', pushId: sysPush.id }
        });
      }
    }

    // 2. If app is inactive/minimized/closed (!anyVisible), also deliver tempBroadcast & pinnedBroadcast to OS shade!
    if (!anyVisible) {
      const tempB = catalog.tempBroadcast;
      if (tempB && tempB.active && tempB.id && tempB.message) {
        const seenTempKey = `seen_tmp_${tempB.id}`;
        const alreadySeenTemp = await swDbGet(seenTempKey);
        if (!alreadySeenTemp) {
          await swDbSet(seenTempKey, Date.now());
          const iconUrl = resolveSwAssetUrl('logo.png');
          await self.registration.showNotification(tempB.title || '🔥 Объявление Dark Music', {
            body: tempB.message,
            icon: iconUrl,
            badge: iconUrl,
            tag: tempB.id,
            renotify: true,
            vibrate: [200, 100, 200],
            data: { url: '/', pushId: tempB.id }
          });
        }
      }

      const pinB = catalog.pinnedBroadcast;
      const pinId = pinB && (pinB.id || (pinB.updatedAt ? `pin_${pinB.updatedAt}` : ''));
      if (pinB && pinB.active && pinId && pinB.message) {
        const seenPinKey = `seen_pin_${pinId}`;
        const alreadySeenPin = await swDbGet(seenPinKey);
        if (!alreadySeenPin) {
          await swDbSet(seenPinKey, Date.now());
          const iconUrl = resolveSwAssetUrl('logo.png');
          await self.registration.showNotification(pinB.title || '⚡ Важная информация Dark Music', {
            body: pinB.message,
            icon: iconUrl,
            badge: iconUrl,
            tag: pinId,
            renotify: true,
            vibrate: [200, 100, 200],
            data: { url: '/', pushId: pinId }
          });
        }
      }
    }
  } catch (err) {
    // Ignore transient network errors in background
  } finally {
    swIsPolling = false;
  }
}

function ensureSwBackgroundPollingLoop() {
  if (swPollTimer) return;
  swPollTimer = setInterval(() => {
    checkAndDispatchBackgroundNotifications(false);
  }, 10000);
}

self.addEventListener('install', (event) => {
  ensureSwBackgroundPollingLoop();
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  ensureSwBackgroundPollingLoop();
  event.waitUntil(
    self.clients.claim().then(() => checkAndDispatchBackgroundNotifications(true))
  );
});

self.addEventListener('message', (event) => {
  ensureSwBackgroundPollingLoop();
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'INIT_PUSH_WATCHER') {
    if (data.repo) swConfig.repo = data.repo;
    if (data.branch) swConfig.branch = data.branch;
    if (data.token) swConfig.token = data.token;
    event.waitUntil(
      (async () => {
        await swDbSet('gh_config', swConfig);
        if (Array.isArray(data.seenIds)) {
          for (const id of data.seenIds) {
            if (!id) continue;
            await swDbSet(`seen_sys_${id}`, Date.now());
            await swDbSet(`seen_tmp_${id}`, Date.now());
            await swDbSet(`seen_pin_${id}`, Date.now());
          }
        }
        await checkAndDispatchBackgroundNotifications(true);
      })()
    );
    return;
  }

  if (data.type === 'MARK_PUSH_SEEN' && data.id) {
    event.waitUntil(
      (async () => {
        await swDbSet(`seen_sys_${data.id}`, Date.now());
        await swDbSet(`seen_tmp_${data.id}`, Date.now());
        await swDbSet(`seen_pin_${data.id}`, Date.now());
      })()
    );
    return;
  }

  if (data.type === 'CHECK_CATALOG_NOW') {
    event.waitUntil(checkAndDispatchBackgroundNotifications(true));
    return;
  }

  if (data.type === 'SHOW_SYSTEM_PUSH') {
    const title = data.title || 'Dark Music';
    const tag = data.tag || 'dark-music-push-' + Date.now();
    const options = {
      body: data.message || '',
      icon: data.icon || '/logo.png',
      badge: data.badge || '/logo.png',
      image: data.image || undefined,
      tag,
      renotify: true,
      requireInteraction: true,
      vibrate: [250, 120, 250],
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      (async () => {
        if (data.tag) {
          await swDbSet(`seen_sys_${data.tag}`, Date.now());
          await swDbSet(`seen_tmp_${data.tag}`, Date.now());
          await swDbSet(`seen_pin_${data.tag}`, Date.now());
        }
        await self.registration.showNotification(title, options);
      })()
    );
  }
});

self.addEventListener('sync', (event) => {
  ensureSwBackgroundPollingLoop();
  event.waitUntil(checkAndDispatchBackgroundNotifications(true));
});

self.addEventListener('periodicsync', (event) => {
  ensureSwBackgroundPollingLoop();
  event.waitUntil(checkAndDispatchBackgroundNotifications(true));
});

self.addEventListener('push', (event) => {
  ensureSwBackgroundPollingLoop();
  let payload = { title: 'Dark Music', message: 'Новое уведомление в каталоге Dark Music' };
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (e) {
    try {
      payload.message = event.data.text();
    } catch (err) {}
  }

  const title = payload.title || 'Dark Music';
  const options = {
    body: payload.message || payload.body || '',
    icon: payload.icon || '/logo.png',
    badge: '/logo.png',
    tag: payload.id || 'dark-music-push',
    renotify: true,
    requireInteraction: true,
    vibrate: [250, 120, 250]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
