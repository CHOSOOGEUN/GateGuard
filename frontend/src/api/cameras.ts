import api from "./axios";
import type { CameraResponse } from "@/types";

export const getCameras = () =>
  api.get<CameraResponse[]>("/api/cameras/").then((r) => r.data);

export const toggleCamera = (cameraId: number) =>
  api.patch<CameraResponse>(`/api/cameras/${cameraId}/toggle`).then((r) => r.data);

export const createCamera = (data: { location: string; station_name: string }) =>
  api.post<CameraResponse>("/api/cameras/", data).then((r) => r.data);
