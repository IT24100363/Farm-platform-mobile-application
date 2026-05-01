import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { getApiError } from '../api/api';
import ErrorMessage from '../components/ErrorMessage';
import { Button, Card, FieldLabel, Screen } from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import { colors, radius } from '../theme';

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshProfile, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.put('/users/me', form);
      setUser(data);
      await refreshProfile();
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (err) {
      setError(getApiError(err, 'Could not save profile'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen actionLabel="Alerts" onAction={() => navigation.navigate('Notifications')} title="Profile" subtitle={`${user?.role || ''} account`}>
      <ErrorMessage message={error} />
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.role === 'farmer' ? <Text style={{ color: user?.isApproved ? colors.primary : colors.danger, marginTop: 6, fontWeight: '800' }}>{user?.isApproved ? 'Approved farmer' : 'Awaiting farmer approval'}</Text> : null}
        </View>
      </Card>
      <FieldLabel>Name</FieldLabel>
      <TextInput onChangeText={(value) => setField('name', value)} style={inputStyle} value={form.name} />
      <FieldLabel>Email</FieldLabel>
      <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={(value) => setField('email', value)} style={inputStyle} value={form.email} />
      <FieldLabel>Phone</FieldLabel>
      <TextInput keyboardType="phone-pad" onChangeText={(value) => setField('phone', value)} style={inputStyle} value={form.phone} />
      <FieldLabel>Address</FieldLabel>
      <TextInput multiline onChangeText={(value) => setField('address', value)} style={[inputStyle, { minHeight: 80 }]} value={form.address} />
      <View style={{ gap: 10, marginTop: 14 }}>
        <Button disabled={loading} icon="save-outline" onPress={save} title={loading ? 'Saving...' : 'Save profile'} />
        <Button icon="log-out-outline" onPress={logout} title="Logout" variant="secondary" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 22,
    height: 58,
    justifyContent: 'center',
    width: 58
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900'
  },
  email: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 3
  }
});

const inputStyle = {
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderRadius: radius.md,
  borderWidth: 1,
  fontSize: 16,
  padding: 14
};
