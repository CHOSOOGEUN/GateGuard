import { useState } from "react";
import api from "@/api/axios";
import axios from "axios";

interface RegisterFormProps {
  onLogin: () => void;
}

export default function RegisterForm({ onLogin }: RegisterFormProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/register", { employee_id: employeeId, email, password });
      setSuccess("가입이 완료되었습니다. 로그인해 주세요.");
      setTimeout(onLogin, 1500);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setError("이미 사용 중인 사원번호 또는 이메일입니다.");
      } else {
        setError("가입 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
        가입하기
      </h1>
      <form onSubmit={handleSubmit} className="space-y-5">
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
          <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">이메일</label>
          <input
            type="email"
            placeholder="이메일 주소 입력"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B73F7]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">비밀번호</label>
          <input
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4B73F7]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">비밀번호 확인</label>
          <input
            type="password"
            placeholder="비밀번호 재입력"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4B73F7]"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-500">{success}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full bg-[#4B73F7] text-white font-semibold text-base hover:bg-[#3a62e6] transition disabled:opacity-60"
        >
          {loading ? "가입 중..." : "가입하기"}
        </button>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          이미 계정이 있으신가요?{" "}
          <button type="button" onClick={onLogin} className="text-[#4B73F7] font-semibold hover:underline">
            로그인
          </button>
        </p>
      </form>
    </>
  );
}
