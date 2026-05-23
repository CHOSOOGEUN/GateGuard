import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { getCameras, toggleCamera, createCamera } from "@/api/cameras";
import type { CameraResponse } from "@/types";

export default function CamerasTab() {
  const [cameras, setCameras] = useState<CameraResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formStation, setFormStation] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    loadCameras();
  }, []);

  async function loadCameras() {
    setLoading(true);
    try {
      const data = await getCameras();
      setCameras(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: number) {
    setTogglingId(id);
    try {
      const updated = await toggleCamera(id);
      setCameras((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const created = await createCamera({ station_name: formStation, location: formLocation });
      setCameras((prev) => [...prev, created]);
      setFormStation("");
      setFormLocation("");
      setShowForm(false);
    } catch {
      setFormError("카메라 등록 중 오류가 발생했습니다.");
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            카메라 목록
            {!loading && (
              <span className="ml-2 text-sm font-normal text-gray-400">{cameras.length}대</span>
            )}
          </h2>
          <button
            onClick={() => { setShowForm((v) => !v); setFormError(""); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4B73F7] text-white text-sm font-medium hover:bg-[#3a62e6] transition"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "취소" : "카메라 등록"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="px-5 py-4 bg-gray-50 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">역 이름</label>
                <input
                  type="text"
                  placeholder="예: 강남역"
                  value={formStation}
                  onChange={(e) => setFormStation(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4B73F7]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">게이트 위치</label>
                <input
                  type="text"
                  placeholder="예: 1번 게이트"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4B73F7]"
                />
              </div>
            </div>
            {formError && <p className="text-xs text-red-500">{formError}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={formLoading}
                className="px-4 py-2 rounded-lg bg-[#4B73F7] text-white text-sm font-medium hover:bg-[#3a62e6] disabled:opacity-60 transition"
              >
                {formLoading ? "등록 중..." : "등록"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
        ) : cameras.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-400">
            등록된 카메라가 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50 dark:divide-gray-700">
            {cameras.map((cam) => (
              <li key={cam.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${cam.is_active ? "bg-green-400" : "bg-gray-300"}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{cam.station_name}</p>
                    <p className="text-xs text-gray-400">{cam.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${cam.is_active ? "text-green-500" : "text-gray-400"}`}>
                    {cam.is_active ? "활성" : "비활성"}
                  </span>
                  <button
                    onClick={() => handleToggle(cam.id)}
                    disabled={togglingId === cam.id}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                      cam.is_active ? "bg-[#4B73F7]" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                        cam.is_active ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
