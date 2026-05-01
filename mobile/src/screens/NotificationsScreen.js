import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { getApiError } from '../api/api';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import { Button, Card, Screen } from '../components/Screen';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data || []);
    } catch (err) {
      setError(getApiError(err, 'Could not load notifications'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    await load();
  };

  return (
    <Screen title="Notifications" refreshing={loading} onRefresh={load}>
      {navigation?.canGoBack?.() ? (
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={18} color="#166534" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      ) : null}
      <ErrorMessage message={error} onRetry={load} />
      {!notifications.length ? <EmptyState title="No notifications" /> : null}
      {notifications.map((notification) => (
        <Card key={notification._id}>
          <Text style={{ color: '#101828', fontWeight: '900' }}>{notification.type || 'general'}</Text>
          <Text style={{ color: '#475467', marginTop: 6 }}>{notification.message}</Text>
          <Text style={{ color: notification.isRead ? '#667085' : '#166534', marginTop: 8 }}>{notification.isRead ? 'Read' : 'Unread'}</Text>
          {!notification.isRead ? <Button onPress={() => markRead(notification._id)} title="Mark read" variant="secondary" /> : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ecfdf3',
    borderColor: '#bde5c8',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  backButtonText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '800'
  }
});
