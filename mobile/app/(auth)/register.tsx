// 회원가입 화면 — 사원번호 / 이메일 / 비밀번호 입력 후 계정 생성
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Shadows } from '@/constants/colors';
import { useAuth } from '@/store/AuthContext';
import { register } from '@/services/authService';

const BG   = '#4880FF';
const BLOB = '#568AFF';

// 로그인 화면과 동일한 배경 물방울 컴포넌트
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
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const tl  = useRef(new Animated.Value(size * 0.55)).current;
  const tr  = useRef(new Animated.Value(size * 0.45)).current;
  const bl  = useRef(new Animated.Value(size * 0.40)).current;
  const br  = useRef(new Animated.Value(size * 0.60)).current;

  useEffect(() => {
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
        { position: 'absolute', width: size, height: size, backgroundColor: BLOB, opacity: 0.65 },
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

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const [employeeId, setEmployeeId]       = useState('');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);

  const emailRef    = useRef<TextInput>(null);
  const pwRef       = useRef<TextInput>(null);
  const confirmRef  = useRef<TextInput>(null);

  const handleRegister = async () => {
    if (!employeeId.trim() || !email.trim() || !password || !confirmPassword) {
      setError('모든 항목을 입력해주세요.');
      return;
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await register({ employee_id: employeeId.trim(), email: email.trim(), password });
      // 회원가입 성공 → AuthContext signIn 없이 토큰이 이미 저장됨, 앱 루트에서 자동 감지
      // signIn을 직접 호출하면 이중 로그인 방지
      await signIn({ employee_id: employeeId.trim(), password });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? '가입에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <FloatingBlob size={280} top={-90}    left={-70}   duration={4200} delay={0}    morphDuration={3800} />
      <FloatingBlob size={220} bottom={-80} right={-60}  duration={5000} delay={700}  morphDuration={4200} />
      <FloatingBlob size={160} top={'38%'}  left={'25%'} duration={3600} delay={1200} morphDuration={3200} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.cardTitle}>회원가입</Text>

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
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>이메일</Text>
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  placeholder="example@korail.com"
                  placeholderTextColor={Colors.gray400}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => pwRef.current?.focus()}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>비밀번호</Text>
                <TextInput
                  ref={pwRef}
                  style={styles.input}
                  placeholder="6자 이상"
                  placeholderTextColor={Colors.gray400}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>비밀번호 확인</Text>
                <TextInput
                  ref={confirmRef}
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.gray400}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
              </View>

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.btn, loading && { opacity: 0.6 }]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.btnText}>가입하기</Text>}
              </TouchableOpacity>

              <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>이미 계정이 있으신가요? </Text>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text style={styles.bottomLink}>로그인</Text>
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

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.gray700, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: Colors.gray200, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.gray900, backgroundColor: Colors.gray50,
  },

  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.danger, marginBottom: 12, textAlign: 'center' },

  btn:     { backgroundColor: BG, borderRadius: 50, paddingVertical: 15, alignItems: 'center', marginBottom: 20, ...Shadows.md },
  btnText: { color: Colors.white, fontSize: 16, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },

  bottomRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  bottomText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.gray500 },
  bottomLink: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: BG },
});
