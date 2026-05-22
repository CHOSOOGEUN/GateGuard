// 섹션 헤더 — 제목 + 선택적 배지(미확인 건수 등) 한 줄 표시
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  title: string;
  badge?: string;
}

export default function SectionHeader({ title, badge }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {badge && <Text style={styles.badge}>{badge}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.gray900 },
  badge: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.danger },
});
