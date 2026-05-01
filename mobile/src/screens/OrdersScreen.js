import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { getApiError } from '../api/api';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import { Card, Screen } from '../components/Screen';
import { colors } from '../theme';

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/orders/me');
      setOrders(data || []);
    } catch (err) {
      setError(getApiError(err, 'Could not load orders'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Screen title="My orders" refreshing={loading} onRefresh={load}>
      <ErrorMessage message={error} onRetry={load} />
      {!orders.length ? <EmptyState icon="receipt-outline" title="No orders yet" /> : null}
      {orders.map((order) => (
        <TouchableOpacity activeOpacity={0.85} key={order._id} onPress={() => navigation.navigate('OrderDetails', { orderId: order._id })}>
          <Card>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 14, height: 46, justifyContent: 'center', width: 46 }}>
                <Ionicons name="receipt-outline" size={23} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Order #{order._id.slice(-6)}</Text>
                <Text style={{ color: colors.textMuted, marginTop: 4 }}>{order.orderStatus} - {order.paymentStatus}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
            </View>
            <Text style={{ color: colors.primary, fontSize: 19, fontWeight: '900', marginTop: 12 }}>Rs {Number(order.totalAmount || 0).toFixed(2)}</Text>
          </Card>
        </TouchableOpacity>
      ))}
    </Screen>
  );
}
