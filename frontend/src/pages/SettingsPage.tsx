import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import ProfileTab from "@/components/settings/ProfileTab";
import CamerasTab from "@/components/settings/CamerasTab";

type Tab = "profile" | "cameras";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 p-4 sm:p-6 max-w-3xl">
          <div className="flex gap-1 mb-6 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm w-fit">
            {(["profile", "cameras"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                  tab === t
                    ? "bg-[#4B73F7] text-white shadow"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t === "profile" ? "내 프로필" : "카메라 관리"}
              </button>
            ))}
          </div>

          {tab === "profile" && <ProfileTab />}
          {tab === "cameras" && <CamerasTab />}
        </main>
      </div>
    </div>
  );
}
