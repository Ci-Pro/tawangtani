import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Card } from '@/components/Card';
import { EmptyState, Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { searchProducts, useProductStore } from '@/store/useProductStore';
import { syncCatalog } from '@/services/catalogSync';
import { RootStackParamList } from '@/navigation/types';

const CATEGORIES = [
  { key: '', label: 'Semua' },
  { key: 'pupuk', label: 'Pupuk' },
  { key: 'pestisida', label: 'Pestisida' },
] as const;

const ProductListScreen: React.FC<{ route?: { params?: { category?: 'pupuk' | 'pestisida' } } }> = ({
  route,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { palette } = useTheme();
  const products = useProductStore((s) => s.products);

  useEffect(() => {
    syncCatalog().catch(() => undefined);
  }, []);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>(route?.params?.category ?? '');

  const results = useMemo(() => searchProducts(products, query, category || undefined), [products, query, category]);

  return (
    <Screen>
      <View style={[styles.searchBox, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
        <Ionicons name="search" size={18} color={palette.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Cari merek / bahan aktif / formulasi..."
          placeholderTextColor={palette.textMuted}
          style={{ flex: 1, color: palette.text, fontSize: 14.5 }}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={palette.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.chips}>
        {CATEGORIES.map((c) => (
          <Chip key={c.key} label={c.label} active={category === c.key} onPress={() => setCategory(c.key)} />
        ))}
      </View>

      <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 10 }}>
        {results.length} produk ditemukan
      </Text>

      {results.length === 0 ? (
        <EmptyState icon="🔍" title="Tidak ada produk" subtitle="Coba kata kunci lain." />
      ) : (
        results.map((p) => (
          <Card key={p.id} onPress={() => navigation.navigate('ProductDetail', { productId: p.id })}>
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: p.category === 'pupuk' ? palette.primarySoft : `${palette.accent}22` }]}>
                <Ionicons
                  name={p.category === 'pupuk' ? 'nutrition' : 'flask'}
                  size={22}
                  color={p.category === 'pupuk' ? palette.primary : palette.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.text, fontWeight: '800', fontSize: 14.5 }}>
                  {p.brand} — {p.name}
                </Text>
                <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>
                  {p.activeIngredient}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <View style={[styles.tag, { backgroundColor: palette.primarySoft }]}>
                    <Text style={{ color: palette.primary, fontSize: 10, fontWeight: '800' }}>
                      {p.formulation}
                    </Text>
                  </View>
                  {!p.verified ? (
                    <View style={[styles.tag, { backgroundColor: `${palette.warning}22` }]}>
                      <Text style={{ color: palette.warning, fontSize: 10, fontWeight: '800' }}>
                        Perlu verifikasi label
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
            </View>
          </Card>
        ))
      )}

      <Text style={[styles.note, { color: palette.textMuted }]}>
        Data produk dapat diperbarui dari server tanpa mengunduh APK baru.
      </Text>
    </Screen>
  );
};

function Chip(props: { label: string; active: boolean; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <TouchableOpacity
      onPress={props.onPress}
      style={[
        styles.chip,
        {
          backgroundColor: props.active ? palette.primary : palette.surfaceAlt,
          borderColor: props.active ? palette.primary : palette.border,
        },
      ]}
    >
      <Text style={{ color: props.active ? '#fff' : palette.textMuted, fontSize: 12.5, fontWeight: '700' }}>
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  note: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ProductListScreen;
