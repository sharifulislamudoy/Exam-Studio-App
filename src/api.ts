import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
export const API = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:4000";
let accessToken = "",
  refreshToken = "",
  deviceId = "";
let refreshJob: Promise<boolean> | null = null;
export async function boot() {
  accessToken = (await SecureStore.getItemAsync("access")) || "";
  refreshToken = (await SecureStore.getItemAsync("refresh")) || "";
  deviceId = (await SecureStore.getItemAsync("device")) || Crypto.randomUUID();
  await SecureStore.setItemAsync("device", deviceId);
}
export async function saveTokens(t: {
  accessToken: string;
  refreshToken: string;
}) {
  accessToken = t.accessToken;
  refreshToken = t.refreshToken;
  await SecureStore.setItemAsync("access", accessToken);
  await SecureStore.setItemAsync("refresh", refreshToken);
}
export const hasSession = () => !!refreshToken;
export async function clearTokens() {
  accessToken = "";
  refreshToken = "";
  await SecureStore.deleteItemAsync("access");
  await SecureStore.deleteItemAsync("refresh");
}
async function timedFetch(url: string, options: RequestInit) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15000);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } catch {
    throw new Error(
      "API-তে সংযোগ হয়নি। ফোন ও কম্পিউটারের Wi-Fi এবং EXPO_PUBLIC_API_URL পরীক্ষা করো।",
    );
  } finally {
    clearTimeout(timeout);
  }
}
const headers = () => ({
  "Content-Type": "application/json",
  "X-Device-Id": deviceId,
  ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}),
});
export async function api<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
  retry = true,
): Promise<T> {
  const send = () =>
    timedFetch(API + path, {
      method,
      headers: headers(),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  let response = await send();
  if (response.status === 401 && retry && refreshToken) {
    if (!refreshJob)
      refreshJob = (async () => {
        try {
          const r = await timedFetch(API + "/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ platform: "mobile", refreshToken }),
          });
          if (!r.ok) {
            if (r.status === 401) await clearTokens();
            return false;
          }
          await saveTokens(await r.json());
          return true;
        } catch {
          return false;
        }
      })().finally(() => {
        refreshJob = null;
      });
    if (await refreshJob) response = await send();
  }
  const data = await response
    .json()
    .catch(() => ({ message: "Server response could not be read" }));
  if (!response.ok)
    throw new Error(
      Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message || "Request failed",
    );
  return data;
}
export async function signOutServer() {
  try {
    await api("/auth/logout", "POST", { refreshToken }, false);
  } finally {
    await clearTokens();
  }
}
