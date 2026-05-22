/**
 * useNotifications.ts
 *
 * Expo Go SDK 53+ 제약:
 *   - 원격 푸시(getExpoPushTokenAsync) → 제거됨, 사용 안 함
 *   - 로컬 알림(scheduleNotificationAsync) → Expo Go에서도 정상 동작 ✅
 *
 * 콘솔에 "remote notifications removed" 경고가 뜨는 건 정상 — 앱 동작에 무관합니다.
 * 원격 푸시가 필요해지면 그때 EAS 개발 빌드로 전환하면 됩니다.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/** 앱 시작 시 알림 권한 요청 + Android 채널 생성 */
export async function registerForPushNotificationsAsync(): Promise<void> {
  if (!Device.isDevice) {
    console.log('[알림] 시뮬레이터 — 알림 권한 요청 생략');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('gateguard', {
      name: 'GateGuard 무임승차 알림',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ef4444',
      sound: 'default',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('[알림] 권한 거부됨');
    }
  }
}

/**
 * 앱 백그라운드 상태일 때 즉시 로컬 알림 발송
 * Expo Go에서도 동작합니다 (로컬 알림은 SDK 53+에서 지원)
 */
export async function scheduleNewEventNotification(params: {
  eventId: number;
  cameraId: number;
  location: string;
}): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 무임승차 감지',
        body: `${params.location}에서 무임승차가 감지되었습니다.`,
        data: { eventId: params.eventId },
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'gateguard' } : {}),
      },
      trigger: null, // 즉시 발송
    });
  } catch (e) {
    console.log('[알림] 로컬 알림 발송 실패:', e);
  }
}
