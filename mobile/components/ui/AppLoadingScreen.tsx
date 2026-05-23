// 앱 로딩 화면 — 폰트 로드 전 표시, 로고 페이드인 + 점 펄스 애니메이션
import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function AppLoadingScreen() {
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.8)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const dotOpacity   = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    // 로고 페이드인 + 스케일업
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1, duration: 500, useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1, tension: 60, friction: 8, useNativeDriver: true,
      }),
    ]).start(() => {
      // 텍스트 페이드인
      Animated.timing(textOpacity, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }).start();
    });

    // 로딩 점 애니메이션 (순차적 펄스)
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );

    dotOpacity.forEach((dot, i) => pulse(dot, i * 200).start());
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* 로고 */}
      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
        <Image
          source={require('@/assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* 제목 + 부제 */}
      <Animated.View style={[styles.textBlock, { opacity: textOpacity }]}>
        <Text style={styles.title}>GateGuard</Text>
        <Text style={styles.subtitle}>무임승차 감지 시스템</Text>
      </Animated.View>

      {/* 로딩 점 */}
      <Animated.View style={[styles.dotsRow, { opacity: textOpacity }]}>
        {dotOpacity.map((op, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: op }]} />
        ))}
      </Animated.View>

      {/* 하단 크레딧 */}
      <Animated.Text style={[styles.credit, { opacity: textOpacity }]}>
        경기대학교 AI컴퓨터공학부 캡스톤디자인 2026
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a56db',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 28,
  },
  textBlock: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 60,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  credit: {
    position: 'absolute',
    bottom: 40,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.3,
  },
});
