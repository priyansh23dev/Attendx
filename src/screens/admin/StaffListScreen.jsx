import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { supabaseService } from '../../services/supabaseService';

export const StaffListScreen = ({ navigation, onLogout }) => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await supabaseService.getStaffList();
      setStaffList(data);
    } catch (err) {
      console.warn('Fetch staff error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchStaff();
    });
    return unsubscribe;
  }, [navigation]);

  const renderStaffItem = ({ item }) => {
    const isEnrolled = item.face_embedding && item.face_embedding.length > 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('StaffProfile', { staff: item })}
      >
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.staffName}>{item.name}</Text>
          <Text style={styles.employeeId}>ID: {item.employee_id}</Text>
        </View>

        <View style={[styles.badge, isEnrolled ? styles.badgeSuccess : styles.badgeWarning]}>
          <Text style={[styles.badgeText, isEnrolled ? styles.badgeTextSuccess : styles.badgeTextWarning]}>
            {isEnrolled ? 'Enrolled ✓' : 'Not Enrolled'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Staff Directory"
        subtitle="Manage employees & face enrollments"
        onLogout={onLogout}
      />

      <View style={styles.actionRow}>
        <Text style={styles.totalText}>
          Total Staff: <Text style={styles.countText}>{staffList.length}</Text>
        </Text>
        <Button
          title="+ Add Staff"
          onPress={() => navigation.navigate('AddStaff')}
          style={styles.addBtn}
        />
      </View>

      <FlatList
        data={staffList}
        keyExtractor={item => item.id}
        renderItem={renderStaffItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchStaff} colors={['#2563EB']} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Staff Registered</Text>
              <Text style={styles.emptySub}>
                Tap "+ Add Staff" to create a new staff profile and perform face enrollment.
              </Text>
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  totalText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  countText: {
    color: '#0F172A',
    fontWeight: '800',
  },
  addBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  infoContainer: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  employeeId: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
  },
  emptySub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },
});
