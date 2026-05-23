// 로그인 화면 — 사원번호 + 비밀번호 입력, 배경 물방울 애니메이션
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Shadows } from '@/constants/colors';
import { useAuth } from '@/store/AuthContext';

const BG   = '#4880FF';
const BLOB = '#568AFF';

// 배경 물방울 컴포넌트 — 위치/크기/속도를 props로 받아 독립적으로 애니메이션
function FloatingBlob({
  size, top, left, bottom, right, duration, delay, morphDuration,
}: {
  size: number;
  top?: number | string;
  left?: number | string;
  bottom?: number | string;
  right?: number | string;
  duration: number;
  delay: number;
  morphDuration: number;
}) {
  const pos  = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const tl   = useRef(new Animated.Value(size * 0.55)).current;
  const tr   = useRef(new Animated.Value(size * 0.45)).current;
  const bl   = useRef(new Animated.Value(size * 0.40)).current;
  const br   = useRef(new Animated.Value(size * 0.60)).current;

  useEffect(() => {
    // 위치 애니메이션
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(pos.x, { toValue: 16,  duration, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(pos.y, { toValue: -12, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(pos.x, { toValue: -10, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(pos.y, { toValue: 14,  duration, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(pos.x, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(pos.y, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ]),
      ]),
    ).start();

    // 모양 변형 애니메이션 (각 코너 독립적으로)
    const morphLoop = (val: Animated.Value, from: number, to: number, dur: number, d: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(d),
          Animated.timing(val, { toValue: to,   duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(val, { toValue: from, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ]),
      );

    morphLoop(tl, size * 0.55, size * 0.30, morphDuration,        0).start();
    morphLoop(tr, size * 0.45, size * 0.65, morphDuration, morphDuration * 0.3).start();
    morphLoop(bl, size * 0.40, size * 0.60, morphDuration, morphDuration * 0.6).start();
    morphLoop(br, size * 0.60, size * 0.35, morphDuration, morphDuration * 0.9).start();
  }, []);

  const posStyle: Record<string, number | string> = {};
  if (top    !== undefined) posStyle.top    = top;
  if (left   !== undefined) posStyle.left   = left;
  if (bottom !== undefined) posStyle.bottom = bottom;
  if (right  !== undefined) posStyle.right  = right;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size, height: size,
          backgroundColor: BLOB,
          opacity: 0.65,
        },
        posStyle,
        {
          borderTopLeftRadius:     tl,
          borderTopRightRadius:    tr,
          borderBottomLeftRadius:  bl,
          borderBottomRightRadius: br,
          transform: [{ translateX: pos.x }, { translateY: pos.y }],
        },
      ]}
    />
  );
}

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword]     = useState('');
  const [remember, setRemember]     = useState(true);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  const handleLogin = async () => {
    if (!employeeId.trim() || !password.trim()) {
      setError('사원번호와 비밀번호를 입력해주세요.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn({ employee_id: employeeId.trim(), password });
    } catch {
      setError('사원번호 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 물방울 — 위치가 겹치지 않게 분산, 겹치는 부분은 opacity 합산으로 진해짐 */}
      <FloatingBlob size={280} top={-90}   left={-70}  duration={4200} delay={0}    morphDuration={3800} />
      <FloatingBlob size={220} bottom={-80} right={-60} duration={5000} delay={700}  morphDuration={4200} />
      <FloatingBlob size={160} top={'38%'} left={'25%'} duration={3600} delay={1200} morphDuration={3200} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.cardTitle}>로그인</Text>

              {/* 사원번호 */}
              <View style={styles.field}>
                <Text style={styles.label}>사원번호</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2456123"
                  placeholderTextColor={Colors.gray400}
                  value={employeeId}
                  onChangeText={setEmployeeId}
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  returnKeyType="next"
                />
              </View>

              {/* 비밀번호 */}
              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>비밀번호</Text>
                  <TouchableOpacity onPress={() => router.push('/(auth)/find-pw')}>
                    <Text style={styles.forgot}>비밀번호를 잊으셨나요?</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.gray400}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>

              {/* 기억하기 */}
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRemember(!remember)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, remember && styles.checkboxOn]}>
                  {remember && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberText}>비밀번호 기억하기</Text>
              </TouchableOpacity>

              {/* 에러 메시지 */}
              {!!error && <Text style={styles.errorText}>{error}</Text>}

              {/* 로그인 버튼 */}
              <TouchableOpacity
                style={[styles.loginBtn, loading && { opacity: 0.6 }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.loginBtnText}>Sign In</Text>}
              </TouchableOpacity>

              {/* 가입하기 */}
              <View style={styles.signupRow}>
                <Text style={styles.signupText}>아직 가입을 안하셨나요? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                  <Text style={styles.signupLink}>가입하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: BG, overflow: 'hidden' },
  safeArea:      { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

  card:      { backgroundColor: Colors.white, borderRadius: 22, padding: 28, ...Shadows.lg },
  cardTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: Colors.gray900, marginBottom: 24, textAlign: 'center', letterSpacing: 0.2 },

  field:    { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label:    { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.gray700, marginBottom: 6 },
  forgot:   { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.gray400 },
  input: {
    borderWidth: 1, borderColor: Colors.gray200, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.gray900, backgroundColor: Colors.gray50,
  },

  rememberRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 2 },
  checkbox:     { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: Colors.gray300, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  checkboxOn:   { backgroundColor: BG, borderColor: BG },
  checkmark:    { color: Colors.white, fontSize: 11, fontFamily: 'Inter_700Bold' },
  rememberText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.gray600 },

  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.danger, marginBottom: 12, textAlign: 'center' },

  loginBtn:     { backgroundColor: BG, borderRadius: 50, paddingVertical: 15, alignItems: 'center', marginBottom: 20, ...Shadows.md },
  loginBtnText: { color: Colors.white, fontSize: 16, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },

  signupRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signupText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.gray500 },
  signupLink: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#3B6EE8', textDecorationLine: 'underline' },
});
