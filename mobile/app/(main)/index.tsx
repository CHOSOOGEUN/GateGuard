// 대시보드 메인 화면 — 통계 카드 / 최신 알림
// WebSocket으로 실시간 NEW_EVENT를 수신하고, 포그라운드/백그라운드에 따라 인앱 팝업 또는 시스템 알림 발송
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, Image, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors, Shadows } from '@/constants/colors';
import { useDashboard } from '@/hooks/useDashboard';
import { useWebSocket } from '@/hooks/useWebSocket';
import StatCard from '@/components/ui/StatCard';
import SectionHeader from '@/components/ui/SectionHeader';
import AlertRow from '@/components/events/AlertRow';
import EventDetailModal from '@/components/events/EventDetailModal';
import EventAlertPopup from '@/components/ui/EventAlertPopup';
import { getLocationText } from '@/utils/eventHelpers';
import { scheduleNewEventNotification } from '@/hooks/useNotifications';
import { getEventById } from '@/services/eventService';
import type { EventResponse } from '@/types';

export default function DashboardScreen() {
  const {
    events, stats,
    loadingEvents, loadingStats,
    refresh, handleNewEvent,
  } = useDashboard();

  const [detailEvent, setDetailEvent]         = useState<EventResponse | null>(null);
  const [detailVisible, setDetailVisible]     = useState(false);
  const [toastEvent, setToastEvent]           = useState<EventResponse | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // 딥링크 파라미터 감지 — 시스템 알림 탭 시 _layout.tsx에서 전달됨
  const { openEventId } = useLocalSearchParams<{ openEventId?: string }>();
  useEffect(() => {
    if (!openEventId) return;
    getEventById(Number(openEventId))
      .then((event) => {
        setDetailEvent(event);
        setDetailVisible(true);
        // 처리 후 파라미터 초기화 (뒤로가기 시 모달이 다시 열리는 것 방지)
        router.setParams({ openEventId: undefined });
      })
      .catch(() => {});
  }, [openEventId]);

  // AppState 변화 추적
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  // WebSocket 연결 — NEW_EVENT 수신 시 낙관적 업데이트 + 알림
  const { connected } = useWebSocket(
    useCallback((msg) => {
      if (msg.type !== 'NEW_EVENT') return;
      const event = msg.data as EventResponse;
      handleNewEvent(event);

      if (appStateRef.current === 'active') {
        // 앱 포그라운드 → 인앱 토스트
        setToastEvent(event);
      } else {
        // 앱 백그라운드 → 시스템 로컬 알림
        scheduleNewEventNotification({
          eventId: event.id,
          cameraId: event.camera_id,
          location: getLocationText(event),
        });
      }
    }, [handleNewEvent]),
  );

  const openDetail = (event: EventResponse) => {
    setDetailEvent(event);
    setDetailVisible(true);
  };

  const isRefreshing = loadingEvents || loadingStats;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── 헤더 ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('@/assets/logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>Gate Guard</Text>
          </View>
          <View style={[styles.wsDot, { backgroundColor: connected ? Colors.success : Colors.gray300 }]} />
        </View>

        {/* ── 통계 카드 ── */}
        <View style={styles.statsGrid}>
          <StatCard
            value={stats?.today_total ?? 0}
            label="오늘 발생"
            sub="오늘 총 감지"
            color={Colors.warning}
            bg="#fff7ed"
          />
          <StatCard
            value={stats?.pending ?? 0}
            label="확인 대기"
            sub="즉시 확인 필요"
            color={Colors.danger}
            bg="#fff1f2"
          />
          <StatCard
            value={stats?.confirmed ?? 0}
            label="처리 완료"
            sub="오늘 처리"
            color={Colors.primary}
            bg="#eff6ff"
          />
          <StatCard
            value={stats?.false_alarm ?? 0}
            label="오탐 신고"
            sub="검토 완료"
            color={Colors.info}
            bg="#ecfeff"
          />
        </View>

        {/* ── 최신 알림 ── */}
        <SectionHeader title="최신알림" />
        <View style={styles.card}>
          {events.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>최근 이벤트가 없습니다.</Text>
            </View>
          ) : (
            events.map((event, idx) => (
              <View key={event.id}>
                <AlertRow
                  event={event}
                  onDetail={() => openDetail(event)}
                />
                {idx < events.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* ── 이벤트 상세 모달 ── */}
      {detailEvent && (
        <EventDetailModal
          visible={detailVisible}
          event={detailEvent}
          events={events}
          onClose={() => setDetailVisible(false)}
          onStatusChanged={refresh}
        />
      )}

      {/* ── 인앱 알림 팝업 ── */}
      <EventAlertPopup
        event={toastEvent}
        onDetail={(event) => openDetail(event)}
        onDismiss={() => setToastEvent(null)}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white,
    marginHorizontal: -16, paddingHorizontal: 20,
    paddingVertical: 14, marginBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: { width: 32, height: 32, borderRadius: 8 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.gray900 },
  wsDot: { width: 10, height: 10, borderRadius: 5 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },

  card: {
    backgroundColor: Colors.white, borderRadius: 14,
    padding: 4, marginBottom: 16, ...Shadows.sm,
  },
  divider: { height: 1, backgroundColor: Colors.gray100, marginHorizontal: 12 },
  empty: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.gray400 },

});
