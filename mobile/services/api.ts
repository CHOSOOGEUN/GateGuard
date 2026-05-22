// Axios 인스턴스 — JWT 자동 첨부(요청), 401 시 토큰 삭제(응답) 인터셉터 설정
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, TOKEN_KEY } from '@/constants/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// 요청 인터셉터 — 저장된 JWT를 Authorization 헤더에 자동 첨부
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터 — 401이면 토큰 삭제 (자동 로그아웃은 AuthContext에서 처리)
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(err);
  },
);

export default api;
