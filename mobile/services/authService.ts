// 인증 서비스 — 로그인/회원가입(토큰 저장) / 로그아웃(토큰 삭제) / 비밀번호 찾기 / 토큰 복원
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { TOKEN_KEY } from '@/constants/config';

export interface LoginPayload {
  employee_id: string;  // 백엔드 AdminLogin 스키마: employee_id + password
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/api/auth/login', payload);
  await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
  return data;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export interface RegisterPayload {
  employee_id: string;  // 백엔드 AdminRegister 스키마: employee_id + email + password
  email: string;
  password: string;
}

/** 회원가입 — 성공 시 JWT를 AsyncStorage에 저장하고 반환 */
export async function register(payload: RegisterPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/api/auth/register', payload);
  await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
  return data;
}

/** 비밀번호 찾기 — 사원번호 + 이메일 대조, 현재 백엔드는 데모 메시지 반환 */
export async function findPassword(employee_id: string, email: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>(
    `/api/auth/find-pw?employee_id=${encodeURIComponent(employee_id)}&email=${encodeURIComponent(email)}`,
  );
  return data;
}
