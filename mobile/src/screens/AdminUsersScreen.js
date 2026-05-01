import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import api, { getApiError } from '../api/api';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import { Button, Card, Screen } from '../components/Screen';

const roleOptions = [
  { label: 'All', value: 'all' },
  { label: 'Customer', value: 'customer' },
  { label: 'Delivery Staff', value: 'delivery' },
  { label: 'Farmer', value: 'farmer' },
  { label: 'Admin', value: 'admin' }
];

export default function AdminUsersScreen() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { search, limit: 50 };
      if (roleFilter !== 'all') params.role = roleFilter;
      const { data } = await api.get('/users', { params });
      setUsers(data.items || []);
    } catch (err) {
      setError(getApiError(err, 'Could not load users'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, roleFilter]);

  const update = async (id, action) => {
    await api.put(`/users/${action}/${id}`);
    await load();
  };

  return (
    <Screen title="Users" refreshing={loading} onRefresh={load}>
      <TextInput onChangeText={setSearch} onSubmitEditing={load} placeholder="Search users" style={inputStyle} value={search} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {roleOptions.map((option) => {
          const active = roleFilter === option.value;
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              key={option.value}
              onPress={() => setRoleFilter(option.value)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ErrorMessage message={error} onRetry={load} />
      {!users.length ? <EmptyState title="No users found" /> : null}
      {users.map((user) => (
        <Card key={user._id}>
          <Text style={{ color: '#101828', fontSize: 17, fontWeight: '900' }}>{user.name}</Text>
          <Text style={{ color: '#667085', marginTop: 4 }}>{user.email}</Text>
          <Text style={{ color: '#475467', marginTop: 6 }}>{user.role} - {user.isActive ? 'Active' : 'Inactive'} - {user.isApproved ? 'Approved' : 'Not approved'}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {user.role === 'farmer' && !user.isApproved ? <Button onPress={() => update(user._id, 'approve')} title="Approve" /> : null}
            {user.role === 'farmer' && user.isApproved ? <Button onPress={() => update(user._id, 'reject')} title="Reject" variant="secondary" /> : null}
            {user.isActive ? <Button onPress={() => update(user._id, 'deactivate')} title="Deactivate" variant="danger" /> : <Button onPress={() => update(user._id, 'activate')} title="Activate" />}
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const inputStyle = { backgroundColor: '#fff', borderColor: '#d9e2dc', borderRadius: 8, borderWidth: 1, marginBottom: 14, padding: 12 };
const styles = {
  filterRow: {
    gap: 10,
    marginBottom: 14,
    paddingBottom: 2
  },
  filterChip: {
    backgroundColor: '#fff',
    borderColor: '#d9e2dc',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  filterChipActive: {
    backgroundColor: '#208354',
    borderColor: '#208354'
  },
  filterText: {
    color: '#101828',
    fontSize: 13,
    fontWeight: '800'
  },
  filterTextActive: {
    color: '#fff'
  }
};
