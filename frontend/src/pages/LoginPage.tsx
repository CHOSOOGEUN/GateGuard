import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import axios from "axios";

type Step = "login" | "register" | "findpw";

export default function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("login");

  // login
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  // register
  const [regEmployeeId, setRegEmployeeId] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");

  // find-pw
  const [fpEmployeeId, setFpEmployeeId] = useState("");
  const [fpEmail, setFpEmail] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function switchStep(next: Step) {
    setError("");
    setSuccess("");
    setStep(next);
  }

  const handleLogin = async (e: React.FormEvent) => {
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (regPassword !== regPasswordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/register", {
        employee_id: regEmployeeId,
        email: regEmail,
        password: regPassword,
      });
      setSuccess("가입이 완료되었습니다. 로그인해 주세요.");
      setRegEmployeeId("");
      setRegEmail("");
      setRegPassword("");
      setRegPasswordConfirm("");
      setTimeout(() => switchStep("login"), 1500);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError("이미 사용 중인 사원번호 또는 이메일입니다.");
      } else {
        setError("가입 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFindPw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/find-pw", {
        employee_id: fpEmployeeId,
        email: fpEmail,
      });
      setSuccess("입력하신 이메일로 임시 비밀번호를 발송했습니다.");
      setFpEmployeeId("");
      setFpEmail("");
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
    <div className="min-h-screen flex items-center justify-center bg-[#4B73F7] dark:bg-[#1a2240] relative overflow-hidden">
      {/* 배경 블롭 — 항상 고정 */}
      <div className="animate-blob animation-delay-2000 absolute top-[-10vh] left-[-5vw] w-[35vw] h-[35vw] min-w-[400px] rounded-[40%_60%_60%_40%/60%_40%_60%_40%] bg-white/20 dark:bg-[#2a3870]/60" />
      <div className="animate-blob animation-delay-4000 absolute bottom-[-20vh] right-[-10vw] w-[40vw] h-[40vw] min-w-[500px] rounded-[40%_60%_60%_40%/60%_40%_60%_40%] bg-white/20 dark:bg-[#2a3870]/60" />
      <div className="animate-blob absolute top-[50%] left-[20%] w-[25vw] h-[25vw] min-w-[300px] rounded-[40%_60%_60%_40%/60%_40%_60%_40%] bg-white/10 dark:bg-[#2a3870]/40" />

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xs sm:max-w-md mx-4 px-6 sm:px-10 py-8 sm:py-12 z-10">
        {/* ── 로그인 ── */}
        {step === "login" && (
          <>
            <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
              로그인
            </h1>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  사원번호
                </label>
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
                  <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    비밀번호
                  </label>
                  <button
                    type="button"
                    onClick={() => switchStep("findpw")}
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
                <button
                  type="button"
                  onClick={() => switchStep("register")}
                  className="text-[#4B73F7] font-semibold hover:underline"
                >
                  가입하기
                </button>
              </p>
            </form>
          </>
        )}

        {/* ── 가입하기 ── */}
        {step === "register" && (
          <>
            <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
              가입하기
            </h1>
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  사원번호
                </label>
                <input
                  type="text"
                  placeholder="사원번호 입력"
                  value={regEmployeeId}
                  onChange={(e) => setRegEmployeeId(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B73F7]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  이메일
                </label>
                <input
                  type="email"
                  placeholder="이메일 주소 입력"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B73F7]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  비밀번호
                </label>
                <input
                  type="password"
                  placeholder="비밀번호 입력"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4B73F7]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  placeholder="비밀번호 재입력"
                  value={regPasswordConfirm}
                  onChange={(e) => setRegPasswordConfirm(e.target.value)}
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
                <button
                  type="button"
                  onClick={() => switchStep("login")}
                  className="text-[#4B73F7] font-semibold hover:underline"
                >
                  로그인
                </button>
              </p>
            </form>
          </>
        )}

        {/* ── 비밀번호 찾기 ── */}
        {step === "findpw" && (
          <>
            <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
              비밀번호 찾기
            </h1>
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 mb-8">
              가입 시 등록한 사원번호와 이메일을 입력하시면
              <br />임시 비밀번호를 발송해 드립니다.
            </p>
            <form onSubmit={handleFindPw} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  사원번호
                </label>
                <input
                  type="text"
                  placeholder="사원번호 입력"
                  value={fpEmployeeId}
                  onChange={(e) => setFpEmployeeId(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B73F7]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  이메일
                </label>
                <input
                  type="email"
                  placeholder="가입 시 등록한 이메일"
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
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
                <button
                  type="button"
                  onClick={() => switchStep("login")}
                  className="text-[#4B73F7] font-semibold hover:underline"
                >
                  로그인으로 돌아가기
                </button>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
