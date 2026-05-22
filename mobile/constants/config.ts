/**
 * 환경 설정
 *
 * ▶ 실기기(USB/WiFi) 테스트 시 반드시 아래 방법 중 하나 사용:
 *   1) .env 파일에  EXPO_PUBLIC_API_URL=http://192.168.x.x:8000  작성 (권장)
 *   2) 아래 fallback IP를 컴퓨터의 로컬 IP로 직접 변경
 *
 * ▶ Android 에뮬레이터: localhost 대신 10.0.2.2 사용
 * ▶ iOS 시뮬레이터: localhost 그대로 사용 가능
 *
 * 컴퓨터 로컬 IP 확인: Windows → ipconfig, Mac → ifconfig | grep inet
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export const WS_URL = API_BASE_URL.replace(/^http/, 'ws') + '/ws/events';

export const TOKEN_KEY = 'gateguard_access_token';
