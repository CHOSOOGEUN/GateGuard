// 비밀번호 찾기 화면 — 사원번호 + 이메일 대조, 안내 메시지 표시
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Shadows } from '@/constants/colors';
import { findPassword } from '@/services/authService';

const BG = '#4880FF';

export default function FindPasswordScreen() {
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const emailRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    if (!employeeId.trim() || !email.trim()) {
      setError('사원번호와 이메일을 모두 입력해주세요.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await findPassword(employeeId.trim(), email.trim());
      setSuccess(res.message);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? '일치하는 사원 정보가 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 뒤로가기 */}
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backText}>← 로그인으로</Text>
            </TouchableOpacity>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>비밀번호 찾기</Text>
              <Text style={styles.cardDesc}>
                가입 시 등록한 사원번호와 이메일을 입력하면{'\n'}비밀번호 재설정 안내를 보내드립니다.
              </Text>

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
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>

              {!!error   && <Text style={styles.errorText}>{error}</Text>}
              {!!success && <Text style={styles.successText}>{success}</Text>}

              <TouchableOpacity
                style={[styles.btn, loading && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.btnText}>확인</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: BG },
  safeArea:      { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

  backBtn:  { marginBottom: 16 },
  backText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.white, opacity: 0.85 },

  card:      { backgroundColor: Colors.white, borderRadius: 22, padding: 28, ...Shadows.lg },
  cardTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: Colors.gray900, marginBottom: 8, textAlign: 'center', letterSpacing: 0.2 },
  cardDesc:  { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.gray500, textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.gray700, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: Colors.gray200, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.gray900, backgroundColor: Colors.gray50,
  },

  errorText:   { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.danger, marginBottom: 12, textAlign: 'center' },
  successText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.success, marginBottom: 12, textAlign: 'center', lineHeight: 20 },

  btn:     { backgroundColor: BG, borderRadius: 50, paddingVertical: 15, alignItems: 'center', marginTop: 4, ...Shadows.md },
  btnText: { color: Colors.white, fontSize: 16, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
});
