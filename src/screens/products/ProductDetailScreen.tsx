import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, SectionHeader } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useProductStore } from '@/store/useProductStore';
import { fmtDateTime } from '@/utils/format';

const ProductDetailScreen: React.FC<{ productId: string }> = ({ productId }) => {
  const { palette } = useTheme();
  const product = useProductStore((s) => s.products.find((p) => p.id === productId));
  const audits = useProductStore((s) =>
    s.audits.filter((a) => a.productId === productId || a.productId === '*')
  );

  if (!product) {
    return (
      <Screen>
        <Text style={{ color: palette.textMuted }}>Produk tidak ditemukan.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Text style={{ color: palette.textMuted, fontSize: 13, fontWeight: '700' }}>
          {product.brand.toUpperCase()}
        </Text>
        <Text style={{ color: palette.text, fontSize: 21, fontWeight: '900', marginTop: 2 }}>
          {product.name}
        </Text>
        <View style={styles.meta}>
          <MetaRow label="Formulasi" value={product.formulation} />
          <MetaRow label="Bahan Aktif" value={product.activeIngredient} />
          <MetaRow label="Kategori" value={product.category === 'pupuk' ? 'Pupuk' : 'Pestisida'} />
        </View>
      </Card>

      <SectionHeader title="Data Dosis" />
      {product.doses.map((d) => (
        <Card key={d.id}>
          <Text style={{ color: palette.text, fontWeight: '800', fontSize: 15 }}>
            {d.crop} — {d.target}
          </Text>
          <Text style={{ color: palette.primary, fontWeight: '900', fontSize: 22, marginTop: 6 }}>
            {d.dose} {d.unit}
            {d.waterVolumeLPerHa ? (
              <Text style={{ color: palette.textMuted, fontSize: 13, fontWeight: '600' }}>
                {' '}
                • air {d.waterVolumeLPerHa} L/ha
              </Text>
            ) : null}
          </Text>
          <Text style={{ color: palette.textMuted, fontSize: 11.5, marginTop: 8 }}>
            Sumber: {d.source}
          </Text>
        </Card>
      ))}

      {product.warnings ? (
        <Card style={{ borderLeftWidth: 4, borderLeftColor: palette.warning }}>
          <Text style={{ color: palette.warning, fontWeight: '800', marginBottom: 6 }}>
            ⚠️ Peringatan & Keselamatan
          </Text>
          {product.warnings.apd ? (
            <WarnLine text={`APD wajib: ${product.warnings.apd}`} />
          ) : null}
          {product.warnings.reEntryHours ? (
            <WarnLine text={`Interval masuk kembali: ${product.warnings.reEntryHours} jam`} />
          ) : null}
          {product.warnings.preHarvestDays ? (
            <WarnLine text={`Interval pra-panen: ${product.warnings.preHarvestDays} hari`} />
          ) : null}
          {product.warnings.notes?.map((n, i) => (
            <WarnLine key={i} text={n} />
          ))}
        </Card>
      ) : null}

      <Card>
        <SectionHeader title="Sumber & Verifikasi" />
        <Text style={{ color: palette.textMuted, fontSize: 12.5, lineHeight: 19 }}>
          Sumber data: {product.source}
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: 12.5, marginTop: 4 }}>
          Status:{' '}
          {product.verified
            ? `Terverifikasi${product.verifiedAt ? ` (${product.verifiedAt})` : ''}`
            : 'Belum terverifikasi — wajib cek label kemasan'}
        </Text>
        {product.updatedAt ? (
          <Text style={{ color: palette.textMuted, fontSize: 12.5, marginTop: 4 }}>
            Data terakhir diperbarui: {product.updatedAt}
          </Text>
        ) : null}
      </Card>

      {audits.length > 0 ? (
        <Card>
          <SectionHeader title="Audit Trail" />
          {audits.slice(0, 5).map((a) => (
            <View key={a.id} style={styles.auditRow}>
              <Ionicons name="receipt-outline" size={14} color={palette.textMuted} />
              <Text style={{ color: palette.textMuted, fontSize: 11.5, flex: 1, marginLeft: 6 }}>
                {a.action === 'replace-all' ? a.detail : a.detail} — {a.productName}
              </Text>
              <Text style={{ color: palette.textMuted, fontSize: 10.5 }}>
                {fmtDateTime(a.at)}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Text style={[styles.disclaimer, { color: palette.textMuted }]}>
        Kalkulator dan katalog adalah alat bantu. Selalu ikuti label resmi produk, arahan penyuluh,
        dan regulasi yang berlaku.
      </Text>
    </Screen>
  );
};

const MetaRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const { palette } = useTheme();
  return (
    <View style={styles.metaRow}>
      <Text style={{ color: palette.textMuted, width: 100, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: palette.text, flex: 1, fontSize: 13, fontWeight: '600' }}>{value}</Text>
    </View>
  );
};

const WarnLine: React.FC<{ text: string }> = ({ text }) => {
  const { palette } = useTheme();
  return (
    <Text style={{ color: palette.text, fontSize: 13, lineHeight: 20, marginTop: 3 }}>• {text}</Text>
  );
};

const styles = StyleSheet.create({
  meta: {
    marginTop: 12,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 6,
  },
});

export default ProductDetailScreen;
