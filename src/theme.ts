import { Platform, StyleSheet } from 'react-native';

export const Colors = {
  primary: '#16A34A',
  primaryDark: '#15803D',
  primarySoft: '#DCFCE7',
  accent: '#F59E0B',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  info: '#2563EB',
  background: '#F3F4F6',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Fonts = {
  light: '400',
  regular: '500',
  semibold: '600',
  bold: '700',
} as const;

export const Shadows = StyleSheet.create({
  card: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: {
      elevation: 3,
    },
    default: {},
  }),
});
