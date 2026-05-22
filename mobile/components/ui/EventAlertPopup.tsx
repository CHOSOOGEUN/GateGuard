// 인앱 알림 팝업 — 앱 포그라운드일 때 NEW_EVENT 수신 시 화면 중앙에 표시
// 5초 후 자동 닫힘 (하단 타이머 바로 시각화), 배경 탭으로도 닫기 가능
import React, { useEffect, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  StyleSheet, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '@/constants/colors';
import { getLocationText, getRiskBadge } from '@/utils/eventHelpers';
import { formatTime } from '@/utils/format';
import type { EventResponse } from '@/types';

interface Props {
  event: EventResponse | null;
  onDetail: (event: EventResponse) => void;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 5000;

export default function EventAlertPopup({ event, onDetail, onDismiss }: Props) {
  const insets        = useSafeAreaInsets();
  const timerProgress = useRef(new Animated.Value(1)).current;
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef       = useRef<Animated.CompositeAnimation | null>(null);

  const dismiss = () => {
    animRef.current?.stop();
    if (timerRef.current) clearTimeout(timerRef.current);
    onDismiss();
  };

  useEffect(() => {
    if (!event) return;

    // 타이머 바 리셋 후 카운트다운
    timerProgress.setValue(1);
    animRef.current = Animated.timing(timerProgress, {
      toValue: 0,
      duration: AUTO_DISMISS_MS,
      useNativeDriver: false,
    });
    animRef.current.start();

    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => {
      animRef.current?.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [event?.id]);

  if (!event) return null;

  const location = getLocationText(event);
  const badge    = getRiskBadge(event);
  const camLabel = `CAM-${String(event.camera_id).padStart(2, '0')}`;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      {/* 반투명 배경 — 탭하면 닫힘 */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={dismiss} />

      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]} pointerEvents="box-none">
        <View style={styles.card}>
          {/* ── 헤더 ── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconWrap}>
                <Text style={styles.icon}>🚨</Text>
              </View>
              <View>
                <Text style={styles.title}>무임승차 감지</Text>
                <Text style={styles.sub}>{formatTime(event.timestamp)}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={dismiss} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── 구분선 ── */}
          <View style={styles.divider} />

          {/* ── 핵심 정보 ── */}
          <View style={styles.infoBlock}>
            <InfoRow emoji="📍" label="위치" value={location} />
            <InfoRow emoji="📷" label="카메라" value={camLabel} />
            {event.confidence != null && (
              <InfoRow
                emoji="🤖"
                label="AI 신뢰도"
                value={`${Math.round(event.confidence * 100)}%`}
                valueColor={event.confidence >= 0.7 ? Colors.danger : Colors.warning}
              />
            )}
          </View>

          {/* ── 위험도 배지 ── */}
          <View style={[styles.riskBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.riskBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>

          {/* ── 버튼 ── */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.dismissBtn} onPress={dismiss} activeOpacity={0.8}>
              <Text style={styles.dismissText}>닫기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.detailBtn}
              onPress={() => { dismiss(); onDetail(event); }}
              activeOpacity={0.85}
            >
              <Text style={styles.detailText}>상세 보기</Text>
            </TouchableOpacity>
          </View>

          {/* ── 타이머 바 ── */}
          <View style={styles.timerTrack}>
            <Animated.View
              style={[
                styles.timerBar,
                {
                  width: timerProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function InfoRow({
  emoji, label, value, valueColor,
}: { emoji: string; label: string; value: string; valueColor?: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.emoji}>{emoji}</Text>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={[infoStyles.value, valueColor ? { color: valueColor } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  emoji: { fontSize: 15, width: 22 },
  label: { width: 64, fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.gray500 },
  value: { flex: 1, fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.gray900 },
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.lg,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  title: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.gray900 },
  sub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.gray400, marginTop: 1 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.gray100,
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.gray500 },

  divider: { height: 1, backgroundColor: Colors.gray100, marginHorizontal: 18 },

  // 정보
  infoBlock: { paddingHorizontal: 18, paddingVertical: 14 },

  // 위험도
  riskBadge: {
    alignSelf: 'flex-start',
    marginHorizontal: 18,
    marginBottom: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskBadgeText: { fontSize: 11, fontFamily: 'Inter_700Bold' },

  // 버튼
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  dismissBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.gray200,
    alignItems: 'center',
  },
  dismissText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.gray600 },
  detailBtn: {
    flex: 2, paddingVertical: 11, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  detailText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.white },

  // 타이머 바
  timerTrack: { height: 3, backgroundColor: Colors.gray100 },
  timerBar: { height: 3, backgroundColor: Colors.danger },
});
