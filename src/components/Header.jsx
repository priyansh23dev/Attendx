import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const Header = ({ title, subtitle, onBack, onLogout }) => {
  const insets = useSafeAreaInsets();
  
  // Calculate top padding to safely clear status bar & selfie camera notch/cutout
  const topInset = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 0)
    : insets.top;

  const paddingTop = topInset > 0 ? topInset + 10 : 16;

  return (
    <View style={[styles.container, { paddingTop }]}>
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
        <Text style={styles.appTitle}>AttendX</Text>
        {onLogout ? (
          <TouchableOpacity
            onPress={onLogout}
            style={styles.logoutButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>
      {title && <Text style={styles.pageTitle}>{title}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  backText: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '700',
  },
  appTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  logoutButton: {
    backgroundColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  pageTitle: {
    color: '#F1F5F9',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 2,
  },
});

