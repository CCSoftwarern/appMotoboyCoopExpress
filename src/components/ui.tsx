import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Colors, Fonts, Radius, Spacing } from '@/theme';

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  textColor,
  style,
  ...rest
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  textColor?: string;
  style?: ViewStyle;
} & PressableProps) {
  const bg =
    variant === 'primary'
      ? Colors.primary
      : variant === 'danger'
        ? Colors.danger
        : variant === 'secondary'
          ? Colors.primaryDark
          : variant === 'ghost'
            ? 'transparent'
            : 'transparent';
  const border = variant === 'outline' ? 1.5 : 0;
  const borderColor = variant === 'outline' ? Colors.primary : 'transparent';
  const color =
    textColor ??
    (variant === 'ghost'
      ? Colors.primary
      : variant === 'outline'
        ? Colors.primary
        : Colors.white);

  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...rest}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderWidth: border,
          borderColor,
          opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={color} size="small" />
      ) : (
        <Text style={[styles.buttonLabel, { color }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Input({
  label,
  style,
  ...rest
}: TextInputProps & { label?: string }) {
  return (
    <View style={styles.inputWrapper}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={Colors.textMuted}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1A` }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeLabel, { color }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.labelValueRow}>
      <Text style={styles.labelValueLabel}>{label}</Text>
      <Text style={styles.labelValueValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: Fonts.bold,
  },
  inputWrapper: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: Fonts.semibold,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  input: {
    height: 50,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: Colors.text,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: Fonts.bold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: Fonts.semibold,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: Fonts.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  labelValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: Spacing.md,
  },
  labelValueLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  labelValueValue: {
    fontSize: 14,
    fontWeight: Fonts.semibold,
    color: Colors.text,
    textAlign: 'right',
    flexShrink: 1,
  },
});
