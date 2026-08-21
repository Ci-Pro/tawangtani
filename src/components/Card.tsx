import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export const Card: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  style?: object;
}> = ({ children, onPress, style }) => {
  const { palette } = useTheme();
  const base = [
    styles.card,
    { backgroundColor: palette.surface, borderColor: palette.border },
    style,
  ];
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={base}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={base}>{children}</View>;
};

export const SectionHeader: React.FC<{ title: string; action?: string; onAction?: () => void }> = ({
  title,
  action,
  onAction,
}) => {
  const { palette } = useTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ color: palette.primary, fontWeight: '700', fontSize: 13 }}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export const Chip: React.FC<{
  label: string;
  active?: boolean;
  onPress?: () => void;
}> = ({ label, active, onPress }) => {
  const { palette } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor: active ? palette.primary : palette.surfaceAlt,
          borderColor: active ? palette.primary : palette.border,
        },
      ]}
    >
      <Text
        style={{
          color: active ? '#ffffff' : palette.textMuted,
          fontWeight: '600',
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export const Badge: React.FC<{ text: string; tone?: 'ok' | 'warn' | 'info' }> = ({
  text,
  tone = 'info',
}) => {
  const { palette } = useTheme();
  const color =
    tone === 'ok' ? palette.success : tone === 'warn' ? palette.warning : palette.primary;
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: color }]}>
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
