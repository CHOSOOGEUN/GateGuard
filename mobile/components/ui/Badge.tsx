// 배지 컴포넌트 — label / color(글자) / bg(배경) / size(sm|md) props로 스타일 결정
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  color: string;
  bg: string;
  size?: 'sm' | 'md';
}

export default function Badge({ label, color, bg, size = 'sm' }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }, size === 'md' && styles.md]}>
      <Text style={[styles.text, { color }, size === 'md' && styles.textMd]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, alignSelf: 'flex-start' },
  md:     { paddingHorizontal: 10, paddingVertical: 4 },
  text:   { fontSize: 11, fontFamily: 'Inter_700Bold' },
  textMd: { fontSize: 13 },
});
