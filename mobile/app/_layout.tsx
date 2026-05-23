// 루트 레이아웃 — 폰트 로드, 알림 권한, AuthProvider 래핑
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/store/AuthContext';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { registerForPushNotificationsAsync } from '@/hooks/useNotifications';
import AppLoadingScreen from '@/components/ui/AppLoadingScreen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Inter 폰트 로드 완료 전까지 스플래시 유지
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // 앱 시작 시 로컬 알림 권한 요청
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  // 시스템 알림 탭 → 해당 이벤트 상세 모달로 딥링크
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const eventId = response.notification.request.content.data?.eventId;
      if (eventId) {
        // 대시보드로 이동하면서 openEventId 파라미터를 전달
        // index.tsx에서 이 파라미터를 감지해 상세 모달을 자동으로 열어줌
        router.navigate({
          pathname: '/(main)',
          params: { openEventId: String(eventId) },
        });
      }
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) return <AppLoadingScreen />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
