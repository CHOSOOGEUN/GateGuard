// 앱 전역 색상 팔레트 및 그림자 프리셋
export const Colors = {
  primary: '#1a56db',
  primaryDark: '#1342b0',
  primaryLight: '#3b82f6',

  danger: '#ef4444',
  dangerLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  success: '#10b981',
  successLight: '#d1fae5',
  info: '#06b6d4',
  infoLight: '#cffafe',

  // 배지 색상
  highRisk: '#ef4444',
  highRiskBg: '#fee2e2',
  normal: '#6b7280',
  normalBg: '#f3f4f6',

  // 상태 색상
  unconfirmed: '#f59e0b',
  confirmed: '#10b981',
  falseAlarm: '#6b7280',

  // 그레이 스케일
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  background: '#f3f4f6',
  cardBg: '#ffffff',
  border: '#e5e7eb',
  text: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
};
