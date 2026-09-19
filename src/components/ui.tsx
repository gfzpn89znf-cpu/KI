import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View, type ViewStyle } from 'react-native';

import { radius, space, useTheme } from '@/theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View
      style={[
        { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        color: theme.textDim,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: space.sm,
        marginTop: space.lg,
      }}
    >
      {children}
    </Text>
  );
}

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
  last,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
      ]}
    >
      <View style={{ flex: 1, paddingRight: space.md }}>
        <Text style={{ color: theme.text, fontSize: 16 }}>{label}</Text>
        {hint ? <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 2 }}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.accent, false: theme.border }}
        thumbColor={theme.dark ? '#fff' : undefined}
      />
    </View>
  );
}

export function PressRow({
  label,
  hint,
  value,
  onPress,
  danger,
  last,
}: {
  label: string;
  hint?: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { opacity: 0.6 },
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
      ]}
    >
      <View style={{ flex: 1, paddingRight: space.md }}>
        <Text style={{ color: danger ? theme.danger : theme.text, fontSize: 16 }}>{label}</Text>
        {hint ? <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 2 }}>{hint}</Text> : null}
      </View>
      {value ? <Text style={{ color: theme.textDim, fontSize: 15 }}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={theme.textDim} style={{ marginLeft: space.xs }} />
    </Pressable>
  );
}

export function PrimaryButton({
  title,
  onPress,
  busy,
  disabled,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.accent, opacity: off ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={theme.accentText} />
      ) : (
        <Text style={{ color: theme.accentText, fontWeight: '700', fontSize: 16 }}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Empty({ icon, title, hint }: { icon: keyof typeof Ionicons.glyphMap; title: string; hint: string }) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={44} color={theme.textDim} />
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600', marginTop: space.md }}>{title}</Text>
      <Text style={{ color: theme.textDim, fontSize: 14, textAlign: 'center', marginTop: space.xs, lineHeight: 20 }}>
        {hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
  },
  button: {
    borderRadius: radius.md,
    paddingVertical: space.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    paddingVertical: space.xl * 2,
  },
});
