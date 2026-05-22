/**
 * @file LoginPage.tsx
 * @description 관리자 로그인 페이지
 *
 * ## 기능
 * - POST /api/auth/login (email + password)
 * - "비밀번호 기억하기" 체크 시 localStorage, 미체크 시 sessionStorage에 토큰 저장
 * - 로그인 성공 시 /dashboard 이동
 *
 * ## 주의사항
 * - 회원가입·비밀번호 찾기 버튼은 UI만 존재, 기능 미구현
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import axios from "axios";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/api/auth/login", { email, password });
      const { access_token } = res.data;

      if (remember) {
        localStorage.setItem("token", access_token);
      } else {
        sessionStorage.setItem("token", access_token);
      }

      navigate("/dashboard");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else {
        setError("로그인 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#4B73F7] dark:bg-[#1a2240] relative overflow-hidden">
      {/* 배경 블롭 */}
      <div className="animate-blob animation-delay-2000 absolute top-[-10vh] left-[-5vw] w-[35vw] h-[35vw] min-w-[400px] rounded-[40%_60%_60%_40%/60%_40%_60%_40%] bg-white/20 dark:bg-[#2a3870]/60" />
      <div className="animate-blob animation-delay-4000 absolute bottom-[-20vh] right-[-10vw] w-[40vw] h-[40vw] min-w-[500px] rounded-[40%_60%_60%_40%/60%_40%_60%_40%] bg-white/20 dark:bg-[#2a3870]/60" />
      <div className="animate-blob absolute top-[50%] left-[20%] w-[25vw] h-[25vw] min-w-[300px] rounded-[40%_60%_60%_40%/60%_40%_60%_40%] bg-white/10 dark:bg-[#2a3870]/40" />

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xs sm:max-w-md mx-4 px-6 sm:px-10 py-8 sm:py-12 z-10">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
          로그인
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 이메일 */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              이메일
            </label>
            <input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B73F7]"
            />
          </div>

          {/* 비밀번호 */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                비밀번호
              </label>
              <button
                type="button"
                className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                비밀번호를 잊으셨나요?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4B73F7]"
            />
          </div>

          {/* 비밀번호 기억하기 */}
          <div className="flex items-center gap-2">
            <input
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 accent-[#4B73F7]"
            />
            <label htmlFor="remember" className="text-sm text-gray-600 dark:text-gray-400">
              비밀번호 기억하기
            </label>
          </div>

          {/* 에러 메시지 */}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-[#4B73F7] text-white font-semibold text-base hover:bg-[#3a62e6] transition disabled:opacity-60"
          >
            {loading ? "로그인 중..." : "Sign In"}
          </button>

          {/* 가입하기 */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            아직 가입을 안하셨나요?{" "}
            <button
              type="button"
              className="text-[#4B73F7] font-semibold hover:underline"
            >
              가입하기
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
