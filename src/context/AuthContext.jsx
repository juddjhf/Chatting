import { createContext, useCallback, useContext, useMemo, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);
const SESSION_KEY = "group-chat-session";
const TOKEN_KEY = "group-chat-token";

function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    const token = sessionStorage.getItem(TOKEN_KEY);
    return token && session ? { ...session, token } : null;
  } catch {
    return null;
  }
}

function unwrap(data) {
  return data?.data ?? data;
}

function readTokenClaims(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload));
  } catch {
    return {};
  }
}

function normalizeSession(responseData) {
  const data = unwrap(responseData);
  const token =
    data?.token ||
    data?.sessionToken ||
    data?.session?.token ||
    data?.auth?.token;
  if (!token) throw new Error("The server did not return a group session token.");
  const group = data?.group || data?.groupDetails || data?.session?.group || {};
  const claims = readTokenClaims(token);
  const member =
    data?.member ||
    data?.user ||
    data?.session?.member || {
      _id: data?.memberId || data?.userId || claims.memberId || claims.userId || claims.sub,
      nickname: data?.nickname || claims.nickname || "Guest",
      role: data?.role || claims.role || "member",
    };
  const groupCode = data?.groupCode || group?.groupCode;
  if (!groupCode) throw new Error("The server did not return a group code.");
  return { token, groupCode, group: { ...group, groupCode }, member };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  const saveSession = useCallback((nextSession) => {
    sessionStorage.setItem(TOKEN_KEY, nextSession.token);
    const { token, ...safeSession } = nextSession;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeSession));
    setSession(nextSession);
    return nextSession;
  }, []);

  const createGroup = useCallback(
    async ({ groupName, password }) => {
      const { data } = await api.post("/api/groups/create", { groupName, password }, { noAuth: true });
      return saveSession(normalizeSession(data));
    },
    [saveSession],
  );

  const joinGroup = useCallback(
    async ({ nickname, groupCode, password }) => {
      const { data } = await api.post("/api/groups/join", {
        nickname: nickname.trim() || undefined,
        groupCode: groupCode.trim(),
        password,
      }, { noAuth: true });
      return saveSession(normalizeSession(data));
    },
    [saveSession],
  );

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, createGroup, joinGroup, clearSession }),
    [session, createGroup, joinGroup, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
