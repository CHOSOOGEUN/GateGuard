// 오탐신고 모달 — 사유 선택(라디오) + 기타 직접 입력, POST /api/events/{id}/false-alarm 호출
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Colors, Shadows } from '@/constants/colors';
import { getLocationText } from '@/utils/eventHelpers';
import { reportFalseAlarm } from '@/services/eventService';
import type { EventResponse } from '@/types';

const REASONS = [
  '정상태그이나 인식 지연',
  '단순 시스템 오류',
  '기계 결함',
  '기타',
] as const;

interface Props {
  visible: boolean;
  event: EventResponse;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function FalseAlarmModal({ visible, event, onClose, onSubmitted }: Props) {
  const [selectedReason, setSelectedReason] = useState('');
  const [memo, setMemo]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const reset = () => {
    setSelectedReason('');
    setMemo('');
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!selectedReason) { setError('오탐 사유를 선택해주세요.'); return; }
    if (selectedReason === '기타' && !memo.trim()) { setError('사유를 직접 입력해주세요.'); return; }
    setError('');
    setLoading(true);
    try {
      const reason = selectedReason === '기타' ? memo.trim() : selectedReason;
      await reportFalseAlarm(event.id, { reason, memo: selectedReason === '기타' ? memo.trim() : undefined });
      reset();
      onSubmitted();
      onClose();
    } catch {
      Alert.alert('오류', '오탐 신고 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <View style={styles.sheet}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>오탐신고</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* CCTV 영상 영역 */}
            <View style={styles.videoArea}>
              <Text style={styles.videoEmoji}>📹</Text>
              <Text style={styles.videoLabel}>
                CAM-{String(event.camera_id).padStart(2, '0')} | Event #{event.id}
              </Text>
            </View>

            <View style={styles.body}>
              {/* 이벤트 요약 */}
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLocation}>{getLocationText(event)}</Text>
                <Text style={styles.summaryId}>이벤트 #{event.id}</Text>
              </View>

              {/* 오탐 사유 선택 */}
              <Text style={styles.sectionLabel}>오탐 사유</Text>
              {REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={styles.radioRow}
                  onPress={() => setSelectedReason(reason)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radio, selectedReason === reason && styles.radioSelected]}>
                    {selectedReason === reason && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.radioLabel}>{reason}</Text>
                </TouchableOpacity>
              ))}

              {/* 기타: 직접 입력 */}
              {selectedReason === '기타' && (
                <TextInput
                  style={styles.memoInput}
                  value={memo}
                  onChangeText={setMemo}
                  placeholder="사유를 직접 입력해주세요."
                  placeholderTextColor={Colors.gray400}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              )}

              {!!error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          </ScrollView>

          {/* 버튼 */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.submitBtnText}>오탐신고 완료</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%', ...Shadows.lg,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.gray900 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.gray600 },
  videoArea: {
    height: 160, backgroundColor: Colors.gray900,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  videoEmoji: { fontSize: 40 },
  videoLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.gray400 },
  body: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  summaryBox: {
    backgroundColor: Colors.gray50, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20,
  },
  summaryLocation: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.gray900 },
  summaryId: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.gray400, marginTop: 2 },
  sectionLabel: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.gray900, marginBottom: 12 },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.gray300,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  radioLabel: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.gray700 },
  memoInput: {
    borderWidth: 1, borderColor: Colors.gray200, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.gray900, backgroundColor: Colors.gray50,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.danger, marginBottom: 8 },
  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: Colors.gray100,
  },
  submitBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 50,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  submitBtnText: { color: Colors.white, fontSize: 15, fontFamily: 'Inter_700Bold' },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 50,
    borderWidth: 1, borderColor: Colors.gray200, alignItems: 'center',
  },
  cancelBtnText: { color: Colors.gray500, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
