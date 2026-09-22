import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { supabaseService } from '../../services/supabaseService';

export const StaffProfileScreen = ({ route, navigation }) => {
  const { staff } = route.params;
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const isEnrolled = staff.face_embedding && staff.face_embedding.length > 0;

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const records = await supabaseService.getAttendanceHistoryForStaff(staff.id);
      setHistory(records);
    } catch (err) {
      console.warn('Fetch history error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const renderAttendanceItem = ({ item }) => (
    <View style={styles.historyCard}>
      {item.selfie_url ? (
        <Image source={{ uri: item.selfie_url }} style={styles.selfieImage} />
      ) : (
        <View style={styles.selfiePlaceholder}>
          <Text style={styles.selfieIcon}>📸</Text>
        </View>
      )}

      <View style={styles.historyDetails}>
        <Text style={styles.historyDate}>{item.date}</Text>
        <Text style={styles.historyTime}>Time: {item.time}</Text>
        <Text style={styles.locationText}>
          📍 {item.location_address || `Lat: ${item.latitude?.toFixed(4)}, Long: ${item.longitude?.toFixed(4)}`}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header
        title={staff.name}
        subtitle={`Employee ID: ${staff.employee_id}`}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={history}
        keyExtractor={item => item.id}
        renderItem={renderAttendanceItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchHistory} colors={['#2563EB']} />
        }
        ListHeaderComponent={
          <View style={styles.profileHeaderCard}>
            <View style={styles.profileRow}>
              {staff.face_image_url ? (
                <Image source={{ uri: staff.face_image_url }} style={styles.enrollmentAvatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{staff.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}

              <View style={styles.profileMeta}>
                <Text style={styles.nameText}>{staff.name}</Text>
                <Text style={styles.idText}>ID: {staff.employee_id}</Text>
                <Text style={styles.emailText}>✉️ {staff.email || `${staff.employee_id.toLowerCase()}@attendx.com`}</Text>

                <View style={[styles.badge, isEnrolled ? styles.badgeSuccess : styles.badgeWarning]}>
                  <Text style={[styles.badgeText, isEnrolled ? styles.badgeTextSuccess : styles.badgeTextWarning]}>
                    {isEnrolled ? 'Face Enrolled ✓' : 'Face Not Enrolled'}
                  </Text>
                </View>
              </View>
            </View>

            <Button
              title={isEnrolled ? 'Re-Enroll Face' : 'Enroll Face Now'}
              onPress={() => navigation.navigate('FaceEnrollment', { staff })}
              variant={isEnrolled ? 'secondary' : 'primary'}
              style={styles.enrollBtn}
            />

            <Text style={styles.historySectionTitle}>Attendance History</Text>
          </View>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No attendance records found for this staff member.</Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  listContent: {
    padding: 16,
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  enrollmentAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  profileMeta: {
    flex: 1,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  idText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  emailText: {
    fontSize: 13,
    color: '#0369A1',
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  badgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextSuccess: {
    color: '#15803D',
  },
  badgeTextWarning: {
    color: '#B45309',
  },
  enrollBtn: {
    marginBottom: 16,
  },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 14,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },
  selfieImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 14,
  },
  selfiePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  selfieIcon: {
    fontSize: 20,
  },
  historyDetails: {
    flex: 1,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyTime: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  locationText: {
    fontSize: 12,
    color: '#0284C7',
    marginTop: 3,
    fontWeight: '500',
  },
  emptyBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
});
