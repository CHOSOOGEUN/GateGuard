// 앱 진입점 — 토큰 복원 중이면 스피너, 완료 후 인증 여부에 따라 메인/로그인으로 분기
import { Redirect } from 'expo-router';
import { useAuth } from '@/store/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/colors';

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(main)' : '/(auth)/login'} />;
}
