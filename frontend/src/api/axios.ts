/**
 * @file axios.ts
 * @description axios 인스턴스 및 인터셉터 설정
 *
 * ## 주요 기능
 * - baseURL: http://localhost:8000
 * - Request interceptor: localStorage 또는 sessionStorage에서 토큰을 꺼내
 *   모든 요청 헤더에 `Authorization: Bearer <token>` 자동 주입
 *   (로그인 시 "비밀번호 기억하기" 체크 여부에 따라 저장 위치가 다름)
 * - Response interceptor: 401 응답 시 토큰 삭제 후 로그인 페이지(/)로 리다이렉트
 *
 * ## 사용법
 * ```ts
 * import api from '@/api/axios'
 * const res = await api.get('/api/cameras')
 * ```
 *
 * ## 주의사항
 * - 모든 API 호출은 axios 기본 인스턴스 대신 이 파일의 api 인스턴스를 사용할 것
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
