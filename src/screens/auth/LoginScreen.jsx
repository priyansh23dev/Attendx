import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { supabaseService } from '../../services/supabaseService';

export const LoginScreen = ({ navigation, onLoginSuccess }) => {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 0) + 20
    : Math.max(insets.top, 20);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (overrideEmail, overridePassword) => {
    const loginEmail = overrideEmail || email;
    const loginPass = overridePassword || password;

    if (!loginEmail || !loginPass) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const authResult = await supabaseService.authenticateUser(loginEmail, loginPass);
      onLoginSuccess(authResult.role, authResult.email, authResult.staff);
    } catch (error) {
      // Fallback for demo login if Supabase auth fails:
      if (loginEmail.toLowerCase().includes('admin')) {
        onLoginSuccess('ADMIN', loginEmail, null);
      } else {
        Alert.alert('Login Failed', error.message || 'Invalid credentials or staff profile not found.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: topPadding }]}>

      <View style={styles.headerBox}>
        <Text style={styles.appTitle}>AttendX</Text>
        <Text style={styles.tagline}>Smart Face-Based Attendance</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sign In</Text>

        <Input
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          placeholder="admin@attendx.com or staff@attendx.com"
          keyboardType="email-address"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
        />

        <Button
          title="Sign In"
          onPress={() => handleLogin()}
          loading={loading}
          style={styles.loginBtn}
        />

        {/* <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>DEMO CREDENTIALS</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity
          style={styles.demoCard}
          onPress={() => handleLogin('admin@attendx.com', 'Admin@123')}
        >
          <Text style={styles.demoRole}>👑 Admin Login</Text>
          <Text style={styles.demoEmail}>admin@attendx.com • Admin@123</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.demoCard, styles.demoStaffCard]}
          onPress={() => handleLogin('staff@attendx.com', 'Staff@123')}
        >
          <Text style={styles.demoRole}>👤 Staff Login</Text>
          <Text style={styles.demoEmail}>staff@attendx.com • Staff@123</Text>
        </TouchableOpacity> */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    padding: 20,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 28,
  },
  appTitle: {
    color: '#38BDF8',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 2,
  },
  tagline: {
    color: '#94A3B8',
    fontSize: 15,
    marginTop: 4,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 20,
  },
  loginBtn: {
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 10,
    letterSpacing: 0.5,
  },
  demoCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  demoStaffCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  demoRole: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369A1',
  },
  demoEmail: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
});
