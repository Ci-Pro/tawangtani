import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
}

export const Button: React.FC<Props> = ({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}) => {
  const { palette } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        variant === 'primary' && { backgroundColor: palette.primary },
        variant === 'danger' && { backgroundColor: palette.danger },
        variant === 'ghost' && {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: palette.primary,
        },
        (disabled || loading) && { opacity: 0.55 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? palette.primary : '#ffffff'} />
      ) : (
        <Text
          style={[
            styles.text,
            { color: variant === 'ghost' ? palette.primary : '#ffffff' },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
