// 통계 카드 — 수치 / 라벨 / 부제목 / 강조 색상을 props로 받아 2열 그리드에 배치
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Shadows } from '@/constants/colors';

interface Props {
  value: number;
  label: string;
  sub: string;
  color: string;
  bg: string;
}

export default function StatCard({ value, label, sub, color, bg }: Props) {
  return (
    <View style={styles.card}>
      {/* 왼쪽: 컬러 원 + 숫자 */}
      <View style={[styles.circle, { backgroundColor: bg }]}>
        <Text style={[styles.value, { color }]}>{value}</Text>
      </View>
      {/* 오른쪽: 텍스트 */}
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '47.5%', borderRadius: 14, padding: 14,
    backgroundColor: Colors.white,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...Shadows.sm,
  },
  circle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  value: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  textCol: { flex: 1 },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.gray800, marginBottom: 2 },
  sub:   { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.gray400 },
});
