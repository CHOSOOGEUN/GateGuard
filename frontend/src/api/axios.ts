/**
 * @file axios.ts
 * @description axios 공통 인스턴스
 *
 * ## 기능
 * - 모든 요청에 Bearer 토큰 자동 주입 (localStorage → sessionStorage 순으로 탐색)
 * - 401 응답 시 토큰 삭제 후 로그인(/)으로 리다이렉트
 *
 * ## 주의사항
 * - 모든 API 호출은 기본 axios 대신 이 인스턴스(api) 사용할 것
 * - 토큰 저장/삭제는 이 파일과 LoginPage.tsx에서만 처리할 것
 */

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// 요청할 때마다 토큰 자동으로 헤더에 추가
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 토큰 만료(401) 시 로그인 페이지로 이동
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

export default api;
