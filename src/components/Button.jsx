import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        isSecondary && styles.secondaryButton,
        isDanger && styles.dangerButton,
        disabled && styles.disabledButton,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? '#0F172A' : '#FFFFFF'} />
      ) : (
        <Text
          style={[
            styles.text,
            isSecondary && styles.secondaryText,
            disabled && styles.disabledText,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  secondaryButton: {
    backgroundColor: '#E2E8F0',
  },
  dangerButton: {
    backgroundColor: '#DC2626',
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
    elevation: 0,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryText: {
    color: '#0F172A',
  },
  disabledText: {
    color: '#F1F5F9',
  },
});
