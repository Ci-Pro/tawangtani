import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { EmptyState, Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useHistoryStore } from '@/store/useHistoryStore';
import { fmtDateTime } from '@/utils/format';
import { HistoryType } from '@/types';

const TYPE_META: Record<HistoryType, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  fertilizer: { icon: 'nutrition', label: 'Pupuk' },
  pesticide: { icon: 'flask', label: 'Pestisida' },
  conversion: { icon: 'swap-horizontal', label: 'Konversi' },
  grid: { icon: 'grid', label: 'Grid' },
};

const HistoryScreen: React.FC = () => {
  const { palette } = useTheme();
  const items = useHistoryStore((s) => s.items);

  return (
    <Screen>
      <Text style={[styles.title, { color: palette.text }]}>Riwayat</Text>
      <Text style={{ color: palette.textMuted, fontSize: 13, marginBottom: 14 }}>
        {items.length} catatan kalkulasi & aktivitas
      </Text>

      {items.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Belum ada riwayat"
          subtitle="Hasil kalkulasi yang Anda simpan akan muncul di sini."
        />
      ) : (
        [...items].slice(-100).reverse().map((item) => {
          const meta = TYPE_META[item.type];
          return (
            <Card key={item.id}>
              <View style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: palette.primarySoft }]}>
                  <Ionicons name={meta.icon} size={20} color={palette.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={{ color: palette.text, fontWeight: '800', fontSize: 14.5, flex: 1 }}>
                      {item.title}
                    </Text>
                    <View style={[styles.tag, { backgroundColor: palette.primarySoft }]}>
                      <Text style={{ color: palette.primary, fontSize: 10, fontWeight: '800' }}>
                        {meta.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: palette.textMuted, fontSize: 12.5, marginTop: 3 }}>
                    {item.inputsText}
                  </Text>
                  <Text style={{ color: palette.text, fontWeight: '700', fontSize: 13.5, marginTop: 4 }}>
                    {item.resultText}
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 4 }}>
                    {fmtDateTime(item.createdAt)}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
});

export default HistoryScreen;
