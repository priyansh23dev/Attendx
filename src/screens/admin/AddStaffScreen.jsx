import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Header } from '../../components/Header';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { supabaseService } from '../../services/supabaseService';

export const AddStaffScreen = ({ navigation, route }) => {
  const adminEmail = route?.params?.adminEmail || 'admin@attendx.com';

  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Staff@123');
  const [loading, setLoading] = useState(false);

  const handleAddStaff = async () => {
    if (!name.trim() || !employeeId.trim()) {
      Alert.alert('Validation Error', 'Please enter both Staff Name and Employee ID.');
      return;
    }

    setLoading(true);
    try {
      const newStaff = await supabaseService.createStaff({
        name: name.trim(),
        employeeId: employeeId.trim(),
        email: email.trim() || `${employeeId.trim().toLowerCase()}@attendx.com`,
        password: password.trim() || 'Staff@123',
        adminEmail: adminEmail,
      });

      Alert.alert(
        'Staff Account Created',
        `Staff '${newStaff.name}' (${newStaff.employee_id}) created & linked to Admin.\n\nLogin Email: ${newStaff.email}\nPassword: ${newStaff.password || password}\n\nProceed to Face Enrollment.`,
        [
          {
            text: 'Continue to Face Enrollment',
            onPress: () =>
              navigation.replace('FaceEnrollment', { staff: newStaff }),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Creation Failed', err.message || 'Failed to add staff member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Header
        title="Add Staff Member"
        subtitle="Create staff profile and enroll face"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Employee Information</Text>

          <Input
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. John Doe"
            autoCapitalize="words"
          />

          <Input
            label="Employee ID (Unique)"
            value={employeeId}
            onChangeText={setEmployeeId}
            placeholder="e.g. EMP001"
            autoCapitalize="characters"
          />

          <Input
            label="Staff Login Email (Optional)"
            value={email}
            onChangeText={setEmail}
            placeholder="e.g. john@attendx.com (Default: emp001@attendx.com)"
            keyboardType="email-address"
          />

          <Input
            label="Staff Login Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Default: Staff@123"
            secureTextEntry
          />

          <Button
            title="Continue to Face Enrollment →"
            onPress={handleAddStaff}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  formContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  submitBtn: {
    marginTop: 12,
    backgroundColor: '#0EA5E9',
  },
});
