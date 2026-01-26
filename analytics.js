// --- GA Proxy config ---
const PROXY_BASE_URL = "https://asia-south1-extensions-analytics-prod.cloudfunctions.net/forcepaster-ga-proxy";
export const TOKEN_STORAGE_KEY = "forcepaster_install_token";
export const CLIENT_ID_STORAGE_KEY = "forcepaster_ga_client_id";
const SESSION_STORAGE_KEY = "forcepaster_ga_session";
const SESSION_EXPIRATION_MIN = 30;
const DEFAULT_ENGAGEMENT_TIME_MS = 100;
const VALID_CLIENT_ID_RE = /^\d+\.\d+$/;

function randomUint32() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] >>> 0) || 1;
}

async function getOrCreateClientId() {
  const result = await chrome.storage.local.get(CLIENT_ID_STORAGE_KEY);
  let clientId = result[CLIENT_ID_STORAGE_KEY];
  if (!clientId || !VALID_CLIENT_ID_RE.test(clientId)) {
    const unixSeconds = Math.floor(Date.now() / 1000);
    clientId = `${randomUint32()}.${unixSeconds}`;
    await chrome.storage.local.set({ [CLIENT_ID_STORAGE_KEY]: clientId });
  }
  return clientId;
}

async function getOrCreateSessionId() {
  const now = Date.now();
  const result = await chrome.storage.session.get(SESSION_STORAGE_KEY);
  let session = result[SESSION_STORAGE_KEY];

  if (session?.timestamp) {
    const durationMin = (now - Number(session.timestamp)) / 60000;
    if (durationMin <= SESSION_EXPIRATION_MIN) {
      session.timestamp = String(now);
      await chrome.storage.session.set({ [SESSION_STORAGE_KEY]: session });
      return session.session_id;
    }
  }

  session = { session_id: String(now), timestamp: String(now) };
  await chrome.storage.session.set({ [SESSION_STORAGE_KEY]: session });
  return session.session_id;
}

async function registerInstallToken() {
  const res = await fetch(`${PROXY_BASE_URL}/v1/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Extension-Id": chrome.runtime.id
    },
    body: JSON.stringify({})
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`register failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  if (!data?.token) throw new Error("register failed: missing token");

  await chrome.storage.local.set({ [TOKEN_STORAGE_KEY]: data.token });
  return data.token;
}

async function getOrRegisterToken(force = false) {
  if (!force) {
    const result = await chrome.storage.local.get(TOKEN_STORAGE_KEY);
    const token = result[TOKEN_STORAGE_KEY];
    if (token) return token;
  }
  return registerInstallToken();
}

export async function sendProxyEvent(eventName, params = {}, opts = {}) {
  const client_id = await getOrCreateClientId();
  const session_id = await getOrCreateSessionId();
  const token = await getOrRegisterToken(false);
  const debug = opts.debug || true;

  const payload = {
    client_id,
    events: [
      {
        name: eventName,
        params: {
          session_id,
          engagement_time_msec: DEFAULT_ENGAGEMENT_TIME_MS,
          ext_version: chrome.runtime.getManifest().version,
          ...params,
        }
      }
    ]
  };

  if (opts.userProperties) {
    payload.user_properties = toUserProperties(opts.userProperties);
  }

  const url = debug
    ? `${PROXY_BASE_URL}/v1/collect?debug_view=1`
    : `${PROXY_BASE_URL}/v1/collect`;

  async function doSend(bearerToken) {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${bearerToken}`,
        "X-Extension-Id": chrome.runtime.id
      },
      body: JSON.stringify(payload)
    });
  }

  let res = await doSend(token);
  if (res.status === 401) {
    // Token missing/invalid. Re-register once and retry once.
    const newToken = await getOrRegisterToken(true);
    res = await doSend(newToken);
  }

  if (!res.ok && !debug) {
    const txt = await res.text();
    throw new Error(`collect failed: ${res.status} ${txt}`);
  }

  return res;
}

const GA4_PROPERTY_NAME_LIMIT = 24;
const GA4_PROPERTY_VALUE_LIMIT = 36;

function toUserProperties(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = String(k).slice(0, GA4_PROPERTY_NAME_LIMIT);
    const val = String(v).slice(0, GA4_PROPERTY_VALUE_LIMIT);
    out[key] = { value: val };
  }
  return out;
}
