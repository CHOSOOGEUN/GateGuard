import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import axios from "axios";

interface LoginFormProps {
  onRegister: () => void;
  onFindPw: () => void;
}

export default function LoginForm({ onRegister, onFindPw }: LoginFormProps) {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", { employee_id: employeeId, password });
      const { access_token } = res.data;
      if (remember) {
        localStorage.setItem("token", access_token);
      } else {
        sessionStorage.setItem("token", access_token);
      }
      navigate("/dashboard");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("사원번호 또는 비밀번호가 올바르지 않습니다.");
      } else {
        setError("로그인 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
        로그인
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">사원번호</label>
          <input
            type="text"
            placeholder="사원번호 입력"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B73F7]"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">비밀번호</label>
            <button
              type="button"
              onClick={onFindPw}
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
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full bg-[#4B73F7] text-white font-semibold text-base hover:bg-[#3a62e6] transition disabled:opacity-60"
        >
          {loading ? "로그인 중..." : "Sign In"}
        </button>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          아직 가입을 안하셨나요?{" "}
          <button type="button" onClick={onRegister} className="text-[#4B73F7] font-semibold hover:underline">
            가입하기
          </button>
        </p>
      </form>
    </>
  );
}
