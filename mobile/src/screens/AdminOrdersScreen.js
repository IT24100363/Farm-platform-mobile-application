import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import api, { getApiError } from '../api/api';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import { Button, Card, Screen } from '../components/Screen';

export default function AdminOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/orders/admin');
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
    <Screen title="Admin orders" refreshing={loading} onRefresh={load}>
      <ErrorMessage message={error} onRetry={load} />
      {!orders.length ? <EmptyState title="No orders found" /> : null}
      {orders.map((order) => (
        <Card key={order._id}>
          <Text onPress={() => navigation.navigate('OrderDetails', { orderId: order._id })} style={{ color: '#101828', fontSize: 17, fontWeight: '900' }}>Order #{order._id.slice(-6)}</Text>
          <Text style={{ color: '#667085', marginTop: 6 }}>{order.customerId?.name || 'Customer'} - {order.orderStatus}</Text>
          <Text style={{ color: '#166534', fontWeight: '900', marginTop: 8 }}>Rs {Number(order.totalAmount || 0).toFixed(2)}</Text>
          <View style={{ marginTop: 12 }}><Button onPress={() => navigation.navigate('OrderDetails', { orderId: order._id })} title="Open" variant="secondary" /></View>
        </Card>
      ))}
    </Screen>
  );
}
