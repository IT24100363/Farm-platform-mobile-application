import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import api, { getApiError } from '../api/api';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import { Button, Card, Screen } from '../components/Screen';

export default function FarmerOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/orders/farmer');
      setOrders(data || []);
    } catch (err) {
      setError(getApiError(err, 'Could not load farmer orders'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const moveTransit = async (id) => {
    await api.put(`/orders/${id}/status`, { status: 'In Transit' });
    await load();
  };

  return (
    <Screen title="Farmer orders" refreshing={loading} onRefresh={load}>
      <ErrorMessage message={error} onRetry={load} />
      {!orders.length ? <EmptyState title="No orders assigned to your farm" /> : null}
      {orders.map((order) => (
        <Card key={order._id}>
          <Text onPress={() => navigation.navigate('OrderDetails', { orderId: order._id })} style={{ color: '#101828', fontSize: 17, fontWeight: '900' }}>Order #{order._id.slice(-6)}</Text>
          <Text style={{ color: '#667085', marginTop: 6 }}>Customer: {order.customerId?.name || 'Customer'}</Text>
          <Text style={{ color: '#667085', marginTop: 6 }}>{order.orderStatus} - Rs {Number(order.totalAmount || 0).toFixed(2)}</Text>
          {['Placed', 'Confirmed'].includes(order.orderStatus) ? (
            <View style={{ marginTop: 12 }}><Button onPress={() => moveTransit(order._id)} title="Move to In Transit" /></View>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
