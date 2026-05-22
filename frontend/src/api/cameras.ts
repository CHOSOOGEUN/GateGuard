/**
 * @file api/cameras.ts
 * @description 카메라 목록 조회 API
 *
 * ## 기능
 * - getCameras()  GET /api/cameras/  전체 카메라 목록 (station_name, location 포함)
 *
 * ## 주의사항
 * - 이벤트 API 응답에는 camera_id만 있고 위치 정보가 없으므로,
 *   이벤트 표시 시 이 API로 가져온 카메라 맵과 조인하여 역이름/게이트 표시
 */

import api from "./axios";
import type { CameraResponse } from "@/types";

export const getCameras = () =>
  api.get<CameraResponse[]>("/api/cameras/").then((r) => r.data);
