import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { StaffListScreen } from '../screens/admin/StaffListScreen';
import { AddStaffScreen } from '../screens/admin/AddStaffScreen';
import { FaceEnrollmentScreen } from '../screens/admin/FaceEnrollmentScreen';
import { StaffProfileScreen } from '../screens/admin/StaffProfileScreen';
import { StaffAttendanceScreen } from '../screens/staff/StaffAttendanceScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const [userRole, setUserRole] = useState(null); // 'ADMIN' | 'STAFF' | null
  const [userEmail, setUserEmail] = useState('');

  const handleLoginSuccess = (role, email) => {
    setUserEmail(email);
    setUserRole(role);
  };

  const handleLogout = () => {
    setUserRole(null);
    setUserEmail('');
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!userRole ? (
          <Stack.Screen name="Login">
            {props => (
              <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />
            )}
          </Stack.Screen>
        ) : userRole === 'ADMIN' ? (
          <>
            <Stack.Screen name="StaffList">
              {props => (
                <StaffListScreen {...props} onLogout={handleLogout} />
              )}
            </Stack.Screen>
            <Stack.Screen name="AddStaff" component={AddStaffScreen} />
            <Stack.Screen
              name="FaceEnrollment"
              component={FaceEnrollmentScreen}
            />
            <Stack.Screen
              name="StaffProfile"
              component={StaffProfileScreen}
            />
          </>
        ) : (
          <Stack.Screen name="StaffAttendance">
            {props => (
              <StaffAttendanceScreen
                {...props}
                onLogout={handleLogout}
                userEmail={userEmail}
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
