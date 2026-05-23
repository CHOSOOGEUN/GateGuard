import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAppContext } from "@/hooks/useAppContext";

function decodeToken(): { employee_id: string } | null {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { employee_id: payload.employee_id ?? "—" };
  } catch {
    return null;
  }
}

export default function ProfileTab() {
  const navigate = useNavigate();
  const { setLoggedIn } = useAppContext();
  const profile = decodeToken();

  function handleLogout() {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    setLoggedIn(false);
    navigate("/");
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-6">
      <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">내 프로필</h2>
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500">사원번호</span>
        <span className="font-medium text-gray-800 dark:text-gray-200">
          {profile?.employee_id ?? "—"}
        </span>
      </div>
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition font-medium"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </div>
    </div>
  );
}
