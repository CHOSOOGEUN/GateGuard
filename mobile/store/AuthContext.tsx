// 인증 컨텍스트 — JWT를 AsyncStorage에 보관, 로그인/로그아웃 상태를 전역으로 관리
// 토큰 상태가 바뀌면 expo-router가 자동으로 메인/로그인 화면으로 리다이렉트
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { login, logout, getStoredToken } from '@/services/authService';
import type { LoginPayload } from '@/services/authService';

/** JWT 페이로드에서 employee_id 추출 */
function parseEmployeeId(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.employee_id ?? null;
  } catch {
    return null;
  }
}

interface AuthState {
  token: string | null;
  employeeId: string | null;  // JWT에서 파싱한 사원번호
  isLoading: boolean;         // 앱 시작 시 토큰 복원 중
  isAuthenticated: boolean;
  signIn: (payload: LoginPayload) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 앱 시작 시 AsyncStorage에서 토큰 복원
  useEffect(() => {
    getStoredToken()
      .then((stored) => {
        setToken(stored);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // 토큰 상태에 따라 라우팅
  useEffect(() => {
    if (isLoading) return;
    if (token) {
      router.replace('/(main)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [token, isLoading]);

  const signIn = useCallback(async (payload: LoginPayload) => {
    const res = await login(payload);
    setToken(res.access_token);
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        employeeId: parseEmployeeId(token),
        isLoading,
        isAuthenticated: !!token,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
