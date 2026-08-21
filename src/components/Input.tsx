import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  label: string;
  error?: string | null;
  hint?: string;
}

export const Input: React.FC<Props & React.ComponentProps<typeof TextInput>> = ({
  label,
  error,
  hint,
  ...props
}) => {
  const { palette } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <TextInput
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: palette.surfaceAlt,
            borderColor: error ? palette.danger : palette.border,
            color: palette.text,
          },
        ]}
        {...props}
      />
      {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
      {!error && hint ? (
        <Text style={[styles.hint, { color: palette.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
});
