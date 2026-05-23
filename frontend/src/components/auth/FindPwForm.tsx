import { useState } from "react";
import api from "@/api/axios";
import axios from "axios";

interface FindPwFormProps {
  onLogin: () => void;
}

export default function FindPwForm({ onLogin }: FindPwFormProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/find-pw", null, {
        params: { employee_id: employeeId, email },
      });
      setSuccess("입력하신 이메일로 임시 비밀번호를 발송했습니다.");
      setEmployeeId("");
      setEmail("");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError("일치하는 계정을 찾을 수 없습니다.");
      } else {
        setError("비밀번호 찾기 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
        비밀번호 찾기
      </h1>
      <p className="text-center text-sm text-gray-400 dark:text-gray-500 mb-8">
        가입 시 등록한 사원번호와 이메일을 입력하시면
        <br />임시 비밀번호를 발송해 드립니다.
      </p>
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
            placeholder="가입 시 등록한 이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B73F7]"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-500">{success}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full bg-[#4B73F7] text-white font-semibold text-base hover:bg-[#3a62e6] transition disabled:opacity-60"
        >
          {loading ? "전송 중..." : "임시 비밀번호 발송"}
        </button>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          <button type="button" onClick={onLogin} className="text-[#4B73F7] font-semibold hover:underline">
            로그인으로 돌아가기
          </button>
        </p>
      </form>
    </>
  );
}
