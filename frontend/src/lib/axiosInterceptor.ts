import axios from "axios";
import toast from "react-hot-toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SetAuthFn = (updater: (prev: any) => any) => void;

let _accessToken: string | null = null;
let _setAuth: SetAuthFn | null = null;
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

/** Called from PersistLogin whenever auth.accessToken changes. */
export function initAuth(accessToken: string | null, setAuth: SetAuthFn) {
  _accessToken = accessToken;
  _setAuth = setAuth;
}

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Attach stored access token to requests that don't already have an Authorization header.
axios.interceptors.request.use((config) => {
  if (!config.headers?.["Authorization"] && _accessToken) {
    config.headers["Authorization"] = `Bearer ${_accessToken}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalRequest: any = error.config;

    if (status === 401) {
      // The refresh endpoint itself returned 401 — session is dead.
      if (originalRequest?.url?.includes("/auth/refresh-token")) {
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        sessionStorage.setItem("session_expired", "1");
        window.location.replace("/login");
        return Promise.reject(error);
      }

      // Already retried once — avoid infinite loop.
      if (originalRequest?._retry) {
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        sessionStorage.setItem("session_expired", "1");
        window.location.replace("/login");
        return Promise.reject(error);
      }

      // A refresh is already in progress — queue this request.
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers["Authorization"] = `Bearer ${token}`;
          return axios(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = localStorage.getItem("refreshToken");
        const { data } = await axios.post("/auth/refresh-token", null, {
          baseURL: API_BASE_URL,
          headers: { Authorization: `Bearer ${storedRefreshToken}` },
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken, user } = data;

        localStorage.setItem("refreshToken", newRefreshToken);
        _accessToken = newAccessToken;

        if (_setAuth) {
          _setAuth((prev) => ({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            user: {
              ...prev?.user,
              ...user,
              fullName: user?.fullName || prev?.user?.fullName,
            },
          }));
        }

        processQueue(null, newAccessToken);
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        sessionStorage.setItem("session_expired", "1");
        window.location.replace("/login");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 403) {
      // No session in memory at all (pre-auth timing) — redirect silently.
      if (!_accessToken) {
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.replace("/login");
        return Promise.reject(error);
      }

      // Already retried after a refresh — this is a real permission denial.
      if (originalRequest?._retry403) {
        toast.error("Accès refusé");
        return Promise.reject(error);
      }

      // A refresh is already running (triggered by a concurrent 401 or 403) — queue.
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers["Authorization"] = `Bearer ${token}`;
          originalRequest._retry403 = true;
          return axios(originalRequest);
        });
      }

      const storedRefreshToken = localStorage.getItem("refreshToken");
      if (!storedRefreshToken) {
        localStorage.removeItem("user");
        window.location.replace("/login");
        return Promise.reject(error);
      }

      // Attempt a silent refresh — the access token may have been revoked server-side.
      originalRequest._retry403 = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post("/auth/refresh-token", null, {
          baseURL: API_BASE_URL,
          headers: { Authorization: `Bearer ${storedRefreshToken}` },
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken, user } = data;
        localStorage.setItem("refreshToken", newRefreshToken);
        _accessToken = newAccessToken;

        if (_setAuth) {
          _setAuth((prev) => ({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            user: {
              ...prev?.user,
              ...user,
              fullName: user?.fullName || prev?.user?.fullName,
            },
          }));
        }

        processQueue(null, newAccessToken);
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return axios(originalRequest);
      } catch {
        processQueue(new Error("Refresh failed on 403"), null);
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.replace("/login");
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    } else if (!error.response) {
      toast.error("Erreur réseau, vérifiez votre connexion");
    }

    return Promise.reject(error);
  }
);
