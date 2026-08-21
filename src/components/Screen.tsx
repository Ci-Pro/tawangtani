import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FadeIn from './FadeIn';
import { useTheme } from '@/theme/ThemeProvider';

export const Screen: React.FC<{
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
}> = ({ children, scroll = true, padded = true }) => {
  const { palette } = useTheme();
  const contentStyle = [padded && styles.padded, styles.grow];
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      {scroll ? (
        <ScrollView
          style={styles.grow}
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={contentStyle}>{children}</View>
      )}
    </SafeAreaView>
  );
};

export const ResultCard: React.FC<{
  label: string;
  value: string;
  unit?: string;
  sub?: string[];
}> = ({ label, value, unit, sub }) => {
  const { palette } = useTheme();
  return (
    <FadeIn>
      <View style={[styles.result, { backgroundColor: palette.primaryDark }]}>
        <Text style={[styles.resultLabel, { color: '#c9ead4' }]}>{label}</Text>
        <View style={styles.resultRow}>
          <Text style={styles.resultValue}>{value}</Text>
          {unit ? <Text style={[styles.resultUnit, { color: '#c9ead4' }]}> {unit}</Text> : null}
        </View>
        {sub?.map((s, i) => (
          <Text key={i} style={[styles.resultSub, { color: '#a7d7b6' }]}>
            {s}
          </Text>
        ))}
      </View>
    </FadeIn>
  );
};

export const EmptyState: React.FC<{ icon: string; title: string; subtitle?: string }> = ({
  icon,
  title,
  subtitle,
}) => {
  const { palette } = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 44 }}>{icon}</Text>
      <Text style={[styles.emptyTitle, { color: palette.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.emptySub, { color: palette.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  grow: {
    flexGrow: 1,
  },
  padded: {
    padding: 18,
    paddingBottom: 32,
  },
  result: {
    borderRadius: 20,
    padding: 20,
    marginVertical: 12,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  resultValue: {
    fontSize: 44,
    fontWeight: '900',
    color: '#ffffff',
  },
  resultUnit: {
    fontSize: 18,
    fontWeight: '700',
  },
  resultSub: {
    fontSize: 13,
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 260,
  },
});
