// 카메라 API — 전체 카메라 목록 조회 (역이름/위치 정보 포함)
import api from './api';
import type { CameraResponse } from '@/types';

/** GET /api/cameras/ */
export const getCameras = () =>
  api.get<CameraResponse[]>('/api/cameras/').then((r) => r.data);
