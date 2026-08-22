import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop, Circle } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

export interface ChartPoint {
  label: string;
  value: number;
}

interface Props {
  points: ChartPoint[];
  height?: number;
  positive: boolean;
}

const W = 320;

export const PriceChart: React.FC<Props> = ({ points, height = 170, positive }) => {
  const { palette } = useTheme();
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.12 || max * 0.05 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const H = height;
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const color = positive ? palette.success : palette.danger;
  const lastIdx = points.length - 1;

  const labelStart = points[0].label;
  const labelEnd = points[lastIdx].label;

  return (
    <View>
      <View style={styles.rangeRow}>
        <Text style={{ color: palette.textMuted, fontSize: 10 }}>Rp{Math.round(max).toLocaleString('id-ID')}</Text>
        <Text style={{ color: palette.textMuted, fontSize: 10 }}>Rp{Math.round(min).toLocaleString('id-ID')}</Text>
      </View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`g-${positive ? 'u' : 'd'}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.28" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill="transparent" />
        <Path d={area} fill={`url(#g-${positive ? 'u' : 'd'})`} />
        <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={x(lastIdx)} cy={y(values[lastIdx])} r={3.5} fill={color} />
      </Svg>
      <View style={styles.labelRow}>
        <Text style={{ color: palette.textMuted, fontSize: 10 }}>{labelStart}</Text>
        <Text style={{ color: palette.textMuted, fontSize: 10 }}>{labelEnd}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingHorizontal: 4,
  },
});
