import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { faceRecognitionService } from '../../services/faceRecognitionService';
import { locationService } from '../../services/locationService';
import { supabaseService } from '../../services/supabaseService';
import { FACE_RECOGNITION_CONFIG } from '../../config/faceRecognition';

export const StaffAttendanceScreen = ({ onLogout, userEmail }) => {
  const [currentStaff, setCurrentStaff] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to mark attendance.');
  const [todayDateString, setTodayDateString] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setTodayDateString(today);
    loadStaffAndAttendance(today);
  }, []);

  const loadStaffAndAttendance = async todayStr => {
    try {
      // Fetch exact logged-in staff profile directly from Supabase by email or employee ID
      let staffProfile = await supabaseService.getStaffByEmail(userEmail);

      // Fallback: if demo staff email, pick first staff member from Supabase
      if (!staffProfile) {
        const staffList = await supabaseService.getStaffList();
        if (staffList.length > 0) {
          staffProfile = staffList[0];
        }
      }

      if (staffProfile) {
        setCurrentStaff(staffProfile);
        const record = await supabaseService.checkTodayAttendance(staffProfile.id, todayStr);
        setTodayAttendance(record);
      }
    } catch (err) {
      console.warn('Load staff error from Supabase:', err);
    }
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission Required',
            message: 'AttendX needs camera access to perform facial recognition for marking attendance.',
            buttonPositive: 'Grant Permission',
            buttonNegative: 'Cancel',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Camera permission request error:', err);
        return false;
      }
    }
    return true;
  };

  const handleMarkAttendance = async () => {
    if (!currentStaff) {
      Alert.alert('Error', 'Staff profile not loaded.');
      return;
    }

    if (todayAttendance) {
      Alert.alert('Already Marked', 'Attendance already marked for today.');
      return;
    }

    if (!currentStaff.face_embedding || currentStaff.face_embedding.length === 0) {
      Alert.alert(
        'Face Not Enrolled',
        'Your face embedding has not been enrolled yet. Please contact Admin for face enrollment.'
      );
      return;
    }

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Denied',
        'Camera permission is required to mark attendance.'
      );
      return;
    }

    const options = {
      mediaType: 'photo',
      cameraType: 'front',
      quality: 0.8,
      saveToPhotos: false,
    };

    launchCamera(options, async response => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Camera Error', response.errorMessage || 'Failed to capture selfie.');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const selfie = response.assets[0];
        await processAttendancePipeline(selfie.uri);
      }
    });
  };

  const processAttendancePipeline = async selfieUri => {
    setProcessing(true);
    setStatusMessage('1/4: Processing selfie with MobileFaceNet model...');

    try {
      // 1. Detect face & generate embedding
      const faceResult = await faceRecognitionService.processImageForFace(selfieUri);

      if (!faceResult.success) {
        setStatusMessage(`❌ Verification Failed: ${faceResult.message}`);
        Alert.alert('Face Detection Failed', faceResult.message);
        return;
      }

      const capturedEmbedding = faceResult.embedding;
      const enrolledEmbedding = currentStaff.face_embedding;

      setStatusMessage('2/4: Comparing face embedding with enrolled template...');

      // 2. Perform REAL embedding comparison using Cosine Similarity
      const compareResult = await faceRecognitionService.compareEmbeddings(
        capturedEmbedding,
        enrolledEmbedding,
        FACE_RECOGNITION_CONFIG.SIMILARITY_THRESHOLD
      );

      if (!compareResult.isMatch) {
        setStatusMessage(
          `❌ Face doesn't match! (Similarity: ${(compareResult.similarityScore * 100).toFixed(1)}%, Threshold: ${(FACE_RECOGNITION_CONFIG.SIMILARITY_THRESHOLD * 100).toFixed(1)}%)`
        );
        Alert.alert(
          'Verification Failed',
          "Face doesn't match enrolled identity. Attendance NOT recorded."
        );
        return;
      }

      setStatusMessage('3/4: Face matched ✓ Acquiring device GPS location...');

      // 3. Obtain device GPS coordinates
      const location = await locationService.getCurrentLocation();

      setStatusMessage('4/4: Uploading selfie & recording attendance...');

      // 4. Upload selfie to Supabase Storage
      const selfieUrl = await supabaseService.uploadSelfieImage(
        selfieUri,
        currentStaff.id
      );

      // 5. Insert Attendance Record
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      const record = await supabaseService.recordAttendance({
        staffId: currentStaff.id,
        selfieUrl: selfieUrl,
        date: todayDateString,
        time: timeStr,
        latitude: location.latitude,
        longitude: location.longitude,
        locationAddress: location.address,
      });

      setTodayAttendance(record);
      setStatusMessage('🎉 Attendance successfully recorded!');

      Alert.alert(
        'Attendance Recorded',
        `Attendance successfully marked for ${currentStaff.name} at ${timeStr}.\n\n📍 Location:\n${location.address}`
      );
    } catch (err) {
      console.warn('Attendance pipeline error:', err);
      setStatusMessage(`❌ Error: ${err.message}`);
      Alert.alert('Attendance Failed', err.message || 'An error occurred during attendance verification.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Mark Attendance"
        subtitle={currentStaff ? `${currentStaff.name} (${currentStaff.employee_id})` : 'Staff Dashboard'}
        onLogout={onLogout}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.dateLabel}>TODAY'S DATE</Text>
          <Text style={styles.dateText}>{todayDateString}</Text>

          {todayAttendance ? (
            <View style={styles.markedContainer}>
              <Text style={styles.markedIcon}>✅</Text>
              <Text style={styles.markedTitle}>Attendance Marked Today</Text>
              <Text style={styles.markedTime}>Time: {todayAttendance.time}</Text>
              {todayAttendance.selfie_url && (
                <Image
                  source={{ uri: todayAttendance.selfie_url }}
                  style={styles.selfieThumb}
                />
              )}
              <Text style={styles.markedGps}>
                📍 {todayAttendance.location_address || `Lat: ${todayAttendance.latitude?.toFixed(4)}, Long: ${todayAttendance.longitude?.toFixed(4)}`}
              </Text>
            </View>
          ) : (
            <View style={styles.unmarkedContainer}>
              <Text style={styles.unmarkedIcon}>⏰</Text>
              <Text style={styles.unmarkedTitle}>Attendance Not Marked Yet</Text>
              <Text style={styles.unmarkedSub}>
                Tap below to take a selfie for on-device face recognition & GPS verification.
              </Text>
            </View>
          )}

          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>

          <Button
            title={todayAttendance ? 'Attendance Already Marked ✓' : 'Take Selfie & Mark Attendance'}
            onPress={handleMarkAttendance}
            disabled={!!todayAttendance || processing}
            loading={processing}
            style={todayAttendance ? styles.disabledBtn : styles.markBtn}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    elevation: 3,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
  },
  dateText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 20,
  },
  markedContainer: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
  },
  markedIcon: {
    fontSize: 40,
  },
  markedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#166534',
    marginTop: 6,
  },
  markedTime: {
    fontSize: 14,
    color: '#15803D',
    fontWeight: '600',
    marginTop: 2,
  },
  selfieThumb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginVertical: 12,
  },
  markedGps: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
  unmarkedContainer: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
  },
  unmarkedIcon: {
    fontSize: 40,
  },
  unmarkedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 6,
  },
  unmarkedSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  statusBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    textAlign: 'center',
  },
  markBtn: {
    backgroundColor: '#16A34A',
  },
  disabledBtn: {
    backgroundColor: '#94A3B8',
  },
});
