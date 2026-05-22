// 이벤트 상세 모달 — 바텀 시트 형태로 CCTV 정보, 상태, 처리완료/오탐신고 버튼 표시
// 열릴 때마다 GET /api/events/{id}로 최신 데이터를 다시 조회해 동기화
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal,
  TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Colors, Shadows } from '@/constants/colors';
import { formatFullTimestamp, formatTime } from '@/utils/format';
import {
  getRiskBadge, getLocationText, getStatusColor,
  getStatusLabel, getStatusEnglish,
} from '@/utils/eventHelpers';
import { updateEventStatus, getEventById } from '@/services/eventService';
import FalseAlarmModal from './FalseAlarmModal';
import type { EventResponse } from '@/types';

interface Props {
  visible: boolean;
  event: EventResponse;
  events?: EventResponse[]; // unused, kept for API compatibility
  onClose: () => void;
  onStatusChanged?: () => void;
}

export default function EventDetailModal({
  visible, event: initialEvent, events = [], onClose, onStatusChanged,
}: Props) {
  const [selected, setSelected]           = useState<EventResponse>(initialEvent);
  const [fetching, setFetching]           = useState(false);
  const [confirming, setConfirming]       = useState(false);
  const [falseAlarmVisible, setFalseAlarmVisible] = useState(false);

  // 모달이 열릴 때마다 GET /api/events/{id}로 최신 데이터 조회
  React.useEffect(() => {
    if (!visible) return;
    setSelected(initialEvent); // 일단 리스트 데이터로 즉시 표시
    setFetching(true);
    getEventById(initialEvent.id)
      .then((fresh) => setSelected(fresh))
      .catch(() => { /* API 실패 시 initialEvent 유지 */ })
      .finally(() => setFetching(false));
  }, [visible, initialEvent]);

  const isActive   = selected.status === 'pending';
  const badge      = getRiskBadge(selected);
  const location   = getLocationText(selected);
  const statusColor = getStatusColor(selected.status);
  const statusLabel = getStatusLabel(selected.status);
  const statusEng   = getStatusEnglish(selected.status);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await updateEventStatus(selected.id, 'confirmed');
      onStatusChanged?.();
      Alert.alert('처리 완료', '이벤트가 처리완료 상태로 변경되었습니다.', [
        { text: '확인', onPress: onClose },
      ]);
    } catch {
      Alert.alert('오류', '처리 중 오류가 발생했습니다.');
    } finally {
      setConfirming(false);
    }
  };

  const handleDispatch = () => {
    Alert.alert('역무원 파견', '역무원 파견 기능은 준비 중입니다.');
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

          <View style={styles.sheet}>
            {/* ── 헤더 ── */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <View style={styles.headerTitleRow}>
                  <Text style={styles.headerTitle}>알림 상세 정보</Text>
                  {fetching && <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 8 }} />}
                </View>
                <Text style={styles.headerSub} numberOfLines={1}>
                  Event #{selected.id} | {formatTime(selected.timestamp)} | {location}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* ── 배지 바 ── */}
            <View style={styles.badgeBar}>
              <View style={styles.camBadge}>
                <Text style={styles.camBadgeText}>
                  CAM-{String(selected.camera_id).padStart(2, '0')}
                </Text>
              </View>
              <View style={[styles.riskBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.riskBadgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                  {statusEng}
                </Text>
              </View>
            </View>

            {/* ── 본문 ── */}
            <View style={styles.body}>
              {/* 상세 */}
              <ScrollView style={styles.detailPanel} showsVerticalScrollIndicator={false}>
                {/* CCTV 영상 영역 */}
                <View style={styles.videoArea}>
                  <Text style={styles.videoEmoji}>📹</Text>
                  <Text style={styles.videoLabel}>
                    {selected.clip_url ? 'CCTV 클립' : '영상 클립 없음'}
                  </Text>
                  <Text style={styles.videoSub}>{location}</Text>
                </View>

                {/* 정보 테이블 */}
                <View style={styles.infoTable}>
                  <InfoRow label="기록시각" value={formatFullTimestamp(selected.timestamp)} />
                  <InfoRow label="위치" value={location} />
                  <InfoRow
                    label="상태"
                    value={statusLabel}
                    valueStyle={{ color: statusColor, fontWeight: '700' }}
                  />
                  {selected.event_type || selected.description ? (
                    <InfoRow label="감지유형" value={selected.event_type ?? selected.description ?? ''} />
                  ) : null}
                  {selected.confidence !== null && selected.confidence !== undefined && (
                    <InfoRow
                      label="AI 신뢰도"
                      value={`${Math.round(selected.confidence * 100)}%`}
                      valueStyle={{ color: selected.confidence >= 0.7 ? Colors.danger : Colors.warning }}
                    />
                  )}
                  {selected.appearance_tags && selected.appearance_tags.length > 0 && (
                    <InfoRow label="인상착의" value={selected.appearance_tags.join(', ')} />
                  )}
                  {selected.assigned_to && (
                    <InfoRow label="담당자" value={selected.assigned_to} />
                  )}
                </View>
              </ScrollView>
            </View>

            {/* ── 액션 버튼 (pending일 때만) ── */}
            {isActive && (
              <View style={styles.footer}>
                <TouchableOpacity style={styles.dispatchBtn} onPress={handleDispatch} activeOpacity={0.8}>
                  <Text style={styles.dispatchBtnText}>역무원 파견</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, confirming && { opacity: 0.6 }]}
                  onPress={handleConfirm}
                  disabled={confirming}
                  activeOpacity={0.8}
                >
                  {confirming
                    ? <ActivityIndicator size="small" color={Colors.success} />
                    : <Text style={styles.confirmBtnText}>처리완료</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.falseBtn}
                  onPress={() => setFalseAlarmVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.falseBtnText}>오탐신고</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 오탐신고 모달 */}
      <FalseAlarmModal
        visible={falseAlarmVisible}
        event={selected}
        onClose={() => setFalseAlarmVisible(false)}
        onSubmitted={() => {
          setFalseAlarmVisible(false);
          onStatusChanged?.();
          onClose();
        }}
      />
    </>
  );
}

// ── 작은 유틸 컴포넌트 ───────────────────────────────────

function InfoRow({
  label, value, valueStyle,
}: { label: string; value: string; valueStyle?: object }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ── 스타일 ───────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%', ...Shadows.lg,
  },

  // 헤더
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: Colors.gray900 },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.gray500, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },
  closeBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.gray600 },

  // 배지 바
  badgeBar: {
    flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.gray50,
  },
  camBadge: {
    backgroundColor: Colors.gray800, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  camBadgeText: { color: Colors.white, fontSize: 11, fontFamily: 'Inter_700Bold' },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  riskBadgeText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontFamily: 'Inter_700Bold' },

  // 본문
  body: { maxHeight: 440 },

  // 상세 패널
  detailPanel: {},
  videoArea: {
    height: 140, backgroundColor: Colors.gray900,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  videoEmoji: { fontSize: 32 },
  videoLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.gray400 },
  videoSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.gray600 },

  // 정보 테이블
  infoTable: {
    borderTopWidth: 1, borderTopColor: Colors.gray100,
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.gray50,
  },
  infoLabel: { width: 72, fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.gray500 },
  infoValue: { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.gray900 },

  // 액션 푸터
  footer: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: Colors.gray100,
  },
  dispatchBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5,
    borderColor: Colors.warning, backgroundColor: Colors.warningLight,
    alignItems: 'center',
  },
  dispatchBtnText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.warning },
  confirmBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5,
    borderColor: Colors.success, backgroundColor: Colors.successLight,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.success },
  falseBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5,
    borderColor: Colors.danger, backgroundColor: Colors.dangerLight,
    alignItems: 'center',
  },
  falseBtnText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.danger },
});
