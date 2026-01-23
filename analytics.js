// --- GA Proxy config ---
const PROXY_BASE_URL = "https://asia-south1-extensions-analytics-prod.cloudfunctions.net/forcepaster-ga-proxy";
const TOKEN_STORAGE_KEY = "forcepaster_install_token";
const CLIENT_ID_STORAGE_KEY = "forcepaster_ga_client_id";
const SESSION_STORAGE_KEY = "forcepaster_ga_session";

const SESSION_EXPIRATION_MIN = 30;
const DEFAULT_ENGAGEMENT_TIME_MS = 100;

function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${hex}.${Math.floor(Date.now() / 1000)}`;
}

async function getOrCreateClientId() {
  const result = await chrome.storage.local.get(CLIENT_ID_STORAGE_KEY);
  let clientId = result[CLIENT_ID_STORAGE_KEY];
  if (!clientId) {
    clientId = randomId();
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

export async function sendProxyEvent(eventName, params = {}, { debug = false } = {}) {
  const client_id = await getOrCreateClientId();
  const session_id = await getOrCreateSessionId();
  const token = await getOrRegisterToken(false);

  const payload = {
    client_id,
    events: [
      {
        name: eventName,
        params: {
          session_id,
          engagement_time_msec: DEFAULT_ENGAGEMENT_TIME_MS,
          ext_version: chrome.runtime.getManifest().version,
          ...params
        }
      }
    ]
  };

  const url = debug
    ? `${PROXY_BASE_URL}/v1/collect?debug=1`
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
