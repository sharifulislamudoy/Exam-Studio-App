import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import type { UserView } from "./contracts";
import { api, boot, hasSession, saveTokens, signOutServer } from "./api";
import { clearAnswers } from "./storage";
import * as SecureStore from "expo-secure-store";
type LoginResponse = {
  user: UserView;
  accessToken: string;
  refreshToken: string;
};
type Session = {
  user: UserView | null;
  ready: boolean;
  error: string;
  authenticate: (mode: "login" | "signup", body: object) => Promise<void>;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
};
const Ctx = createContext<Session | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserView | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const qc = useQueryClient();
  async function reload() {
    if (!hasSession()) {
      setUser(null);
      return;
    }
    try {
      setUser(await api<UserView>("/me"));
      setError("");
    } catch (e) {
      if (!hasSession()) setUser(null);
      setError(e instanceof Error ? e.message : "Connection failed");
    }
  }
  useEffect(() => {
    void (async () => {
      try {
        await boot();
        await reload();
      } catch (e) {
        setError(String(e));
      } finally {
        setReady(true);
      }
    })();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void reload();
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => void reload(), 20000);
    return () => clearInterval(interval);
  }, [user?.id]);
  async function authenticate(mode: "login" | "signup", body: object) {
    const result = await api<LoginResponse>(
      `/auth/${mode}`,
      "POST",
      { ...body, platform: "mobile" },
      false,
    );
    if (result.user.role !== "STUDENT")
      throw new Error("শিক্ষার্থীর অ্যাকাউন্ট দিয়ে লগইন করো।");
    await saveTokens(result);
    qc.clear();
    setUser(result.user);
    setError("");
  }
  async function logout() {
    const push = await SecureStore.getItemAsync("pushToken");
    try {
      if (push) await api("/devices/remove", "POST", { token: push });
    } catch {}
    try {
      await signOutServer();
    } catch {}
    await SecureStore.deleteItemAsync("pushToken");
    await clearAnswers();
    qc.clear();
    setUser(null);
  }
  return (
    <Ctx.Provider value={{ user, ready, error, authenticate, reload, logout }}>
      {children}
    </Ctx.Provider>
  );
}
export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error("Session provider missing");
  return s;
}
