import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// auth 엔드포인트 제외하고 401이면 토큰 삭제 후 로그인으로 리다이렉트
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute = error.config?.url?.includes("/api/auth/");
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

export default api;
