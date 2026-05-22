// 알림 목록 한 줄 — 카메라 썸네일 / 위치 / 시각 / 위험도 배지 표시
// pending 이벤트는 썸네일 좌상단에 빨간 점으로 미확인 강조
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import Badge from '@/components/ui/Badge';
import { formatTime } from '@/utils/format';
import { getRiskBadge, getLocationText } from '@/utils/eventHelpers';
import type { EventResponse } from '@/types';

interface Props {
  event: EventResponse;
  onDetail: () => void;
}

export default function AlertRow({ event, onDetail }: Props) {
  const badge = getRiskBadge(event);
  const isPending = event.status === 'pending';

  return (
    <TouchableOpacity style={styles.row} onPress={onDetail} activeOpacity={0.7}>
      <View style={styles.thumbWrap}>
        <View style={styles.thumb}>
          <Text style={{ fontSize: 18 }}>📷</Text>
          <Text style={styles.camLabel}>CAM-{String(event.camera_id).padStart(2, '0')}</Text>
        </View>
        {isPending && <View style={styles.pendingDot} />}
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.topRow}>
          <Text style={styles.location} numberOfLines={1}>{getLocationText(event)}</Text>
          <Text style={styles.time}>{formatTime(event.timestamp)}</Text>
        </View>
        <Text style={styles.desc} numberOfLines={1}>
          {event.event_type ?? event.description ?? '무임승차 감지'}
        </Text>
        <View style={styles.tagRow}>
          <Badge label={badge.label} color={badge.color} bg={badge.bg} />
          {event.appearance_tags?.slice(0, 2).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {event.confidence !== null && event.confidence !== undefined && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>AI {Math.round(event.confidence * 100)}%</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row:        { flexDirection: 'row', padding: 12, gap: 10 },
  thumbWrap:  { position: 'relative' },
  thumb: {
    width: 56, height: 56, borderRadius: 10,
    backgroundColor: Colors.gray800, alignItems: 'center', justifyContent: 'center',
  },
  camLabel:   { fontSize: 9, fontFamily: 'Inter_700Bold', color: Colors.white, marginTop: 2 },
  pendingDot: {
    position: 'absolute', top: 4, left: 4,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.danger, borderWidth: 2, borderColor: Colors.white,
  },
  topRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  location: { flex: 1, fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.gray900, marginRight: 8 },
  time:     { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.gray400 },
  desc:     { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.gray600, marginBottom: 6 },
  tagRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  tag:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: Colors.gray100 },
  tagText:  { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.gray600 },
});
