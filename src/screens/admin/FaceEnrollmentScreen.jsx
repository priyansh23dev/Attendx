import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { faceRecognitionService } from '../../services/faceRecognitionService';
import { supabaseService } from '../../services/supabaseService';

export const FaceEnrollmentScreen = ({ route, navigation }) => {
  const { staff } = route.params;
  const [photoUri, setPhotoUri] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    'Position staff member face in front of the camera.'
  );
  const [embeddingInfo, setEmbeddingInfo] = useState(null);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission Required',
            message: 'AttendX needs camera access to enroll face embeddings for staff members.',
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

  const handleCapturePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Denied',
        'Camera permission is required for face enrollment.'
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
        Alert.alert('Camera Error', response.errorMessage || 'Failed to capture photo.');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const captured = response.assets[0];
        setPhotoUri(captured.uri);
        await processAndEnrollFace(captured.uri);
      }
    });
  };

  const processAndEnrollFace = async imagePath => {
    setProcessing(true);
    setStatusMessage('Detecting face & running MobileFaceNet recognition model...');
    try {
      const result = await faceRecognitionService.processImageForFace(imagePath);

      if (!result.success) {
        setStatusMessage(`❌ Enrollment Failed: ${result.message}`);
        Alert.alert('Enrollment Failed', result.message);
        return;
      }

      // Success: single face detected & 192-dim MobileFaceNet embedding generated!
      const embedding = result.embedding;
      setEmbeddingInfo(`192-Dimensional L2-Normalized Embedding (MobileFaceNet)`);
      setStatusMessage('Face detected ✓ Embedding generated ✓ Saving to database...');

      // Upload enrollment image to Supabase Storage
      const publicUrl = await supabaseService.uploadEnrollmentImage(
        imagePath,
        staff.id
      );

      // Save embedding array & image URL in Supabase staff record
      await supabaseService.updateStaffEnrollment(
        staff.id,
        embedding,
        publicUrl
      );

      setStatusMessage('🎉 Face enrolled successfully!');
      Alert.alert(
        'Success',
        `Face enrolled successfully for ${staff.name} (EMP ID: ${staff.employee_id}).`,
        [
          {
            text: 'Return to Staff Directory',
            onPress: () => navigation.navigate('StaffList'),
          },
        ]
      );
    } catch (err) {
      console.warn('Face enrollment error:', err);
      setStatusMessage(`❌ Error: ${err.message}`);
      Alert.alert('Error', err.message || 'Face enrollment processing error.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Face Enrollment"
        subtitle={`Staff: ${staff.name} (${staff.employee_id})`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.guidanceTitle}>Enrollment Instructions</Text>
          <Text style={styles.guidanceText}>
            • Use front camera with good lighting.{'\n'}
            • Keep face centered inside the frame.{'\n'}
            • Ensure exactly ONE face is visible.
          </Text>

          <View style={styles.previewBox}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderIcon}>👤</Text>
                <Text style={styles.placeholderText}>No Photo Captured</Text>
              </View>
            )}
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{statusMessage}</Text>
            {embeddingInfo && (
              <Text style={styles.embeddingText}>{embeddingInfo}</Text>
            )}
          </View>

          <Button
            title={photoUri ? 'Retake & Re-Enroll Face' : 'Open Front Camera'}
            onPress={handleCapturePhoto}
            loading={processing}
            style={styles.captureBtn}
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
    padding: 20,
    elevation: 3,
  },
  guidanceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  guidanceText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  previewBox: {
    width: '100%',
    height: 260,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderBox: {
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
  },
  placeholderText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
  },
  statusBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
    textAlign: 'center',
  },
  embeddingText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  captureBtn: {
    backgroundColor: '#0EA5E9',
  },
});
