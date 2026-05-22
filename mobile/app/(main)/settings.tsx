// 설정 화면 — 로그아웃 + 개발용 팝업 테스트
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows } from '@/constants/colors';
import { useAuth } from '@/store/AuthContext';
import EventAlertPopup from '@/components/ui/EventAlertPopup';
import type { EventResponse } from '@/types';

// 개발용: 인앱 팝업 동작 확인을 위한 더미 이벤트
const MOCK_EVENT: EventResponse = {
  id: 9999,
  camera_id: 1,
  timestamp: new Date().toISOString(),
  clip_url: null,
  track_id: 42,
  confidence: 0.87,
  status: 'pending',
  camera: { id: 1, location: '1번 게이트', station_name: '수원역', is_active: true },
};

export default function SettingsScreen() {
  const { signOut, employeeId } = useAuth();
  const [mockEvent, setMockEvent] = useState<EventResponse | null>(null);

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>설정</Text>
      </View>

      <View style={styles.content}>
        {/* 내 정보 */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>사원번호</Text>
          <Text style={styles.infoValue}>{employeeId ?? '-'}</Text>
        </View>

        {/* 개발 빌드에서만 표시 — 배포 빌드에서는 자동으로 사라짐 */}
        {__DEV__ && (
          <>
            <View style={styles.devSection}>
              <Text style={styles.devLabel}>개발자 테스트</Text>
              <TouchableOpacity style={styles.testBtn} onPress={() => setMockEvent({ ...MOCK_EVENT, timestamp: new Date().toISOString() })} activeOpacity={0.85}>
                <Text style={styles.testText}>🔔 인앱 팝업 테스트</Text>
              </TouchableOpacity>
            </View>

            <EventAlertPopup
              event={mockEvent}
              onDetail={() => Alert.alert('상세 보기', '대시보드에서 실제 이벤트로 확인하세요.')}
              onDismiss={() => setMockEvent(null)}
            />
          </>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        <Text style={styles.version}>GateGuard · 경기대학교 캡스톤디자인 2026</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  pageHeader: {
    backgroundColor: Colors.white, paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pageTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.gray900 },
  content: { flex: 1, padding: 16, gap: 16 },
  logoutBtn: {
    backgroundColor: Colors.dangerLight, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.danger + '40',
    ...Shadows.sm,
  },
  logoutText: { color: Colors.danger, fontSize: 15, fontFamily: 'Inter_700Bold' },
  infoCard: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 16,
    ...Shadows.sm,
  },
  infoLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.gray400, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  infoValue: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.gray900 },
  version: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.gray400 },
  devSection: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    padding: 12, gap: 8,
  },
  devLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', color: Colors.gray400, textTransform: 'uppercase', letterSpacing: 0.8 },
  testBtn: {
    backgroundColor: Colors.primaryLight ?? '#eff6ff', borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.primary + '40',
    ...Shadows.sm,
  },
  testText: { color: Colors.primary, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
