export type ApiEnvelope<T> = {
  message: string;
  data: T;
};

const SESSION_KEY = "mmo-session";

export type SessionState = {
  accessToken: string;
  refreshToken: string;
  workspaceId: string;
  email: string;
  userId: string;
  role: "USER" | "ADMIN";
};

type AuthMeResponse = ApiEnvelope<{
  user: {
    id: string;
    email: string;
    role: "USER" | "ADMIN";
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  workspaceId: string | null;
}>;

export function getApiBaseUrl(): string {
  return "/api";
}

export function loadSession(): SessionState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

export function saveSession(session: SessionState) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function syncSessionProfile(): Promise<SessionState | null> {
  const session = loadSession();
  if (!session) {
    return null;
  }

  if (!session.accessToken || !session.refreshToken) {
    clearSession();
    return null;
  }

  try {
    const response = await apiRequest<AuthMeResponse["data"]>("/auth/me");
    const nextSession: SessionState = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      workspaceId: response.data.workspaceId ?? session.workspaceId,
      email: response.data.user.email,
      userId: response.data.user.id,
      role: response.data.user.role
    };
    saveSession(nextSession);
    return nextSession;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export async function logoutSession() {
  const session = loadSession();
  if (session?.refreshToken) {
    await fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-refresh-token": session.refreshToken
      }
    }).catch(() => null);
  }

  clearSession();
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-refresh-token": refreshToken
    }
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || "Phiên đăng nhập đã hết hạn.");
  }

  const accessToken = payload?.data?.accessToken;
  if (!accessToken) {
    throw new Error("Không thể làm mới phiên đăng nhập.");
  }

  return accessToken as string;
}

async function performRequest(
  path: string,
  options: RequestInit,
  accessToken?: string
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers
  });
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiEnvelope<T>> {
  const session = loadSession();
  const parsePayload = async (response: Response) => {
    try {
      return (await response.json()) as ApiEnvelope<T> & { message?: string };
    } catch {
      return null;
    }
  };

  const response = await performRequest(path, options, session?.accessToken);
  const payload = await parsePayload(response);

  if (response.ok && payload) {
    return payload;
  }

  if (response.status === 401 && session?.refreshToken) {
    try {
      const accessToken = await refreshAccessToken(session.refreshToken);
      saveSession({
        ...session,
        accessToken
      });

      const retryResponse = await performRequest(path, options, accessToken);
      const retryPayload = await parsePayload(retryResponse);

      if (retryResponse.ok && retryPayload) {
        return retryPayload;
      }

      if (retryResponse.status === 401) {
        clearSession();
      }

      throw new Error(retryPayload?.message || "Đã xảy ra lỗi khi gọi API.");
    } catch (error) {
      clearSession();
      throw error instanceof Error ? error : new Error("Phiên đăng nhập đã hết hạn.");
    }
  }

  if (response.status === 401) {
    clearSession();
  }

  throw new Error(payload?.message || "Đã xảy ra lỗi khi gọi API.");
}
