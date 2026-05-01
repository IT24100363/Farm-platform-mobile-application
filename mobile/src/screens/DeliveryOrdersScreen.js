import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import api, { getApiError } from '../api/api';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import { Button, Card, Screen } from '../components/Screen';

export default function DeliveryOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/orders/delivery');
      setOrders(data || []);
    } catch (err) {
      setError(getApiError(err, 'Could not load deliveries'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const accept = async (id) => {
    await api.put(`/orders/${id}/delivery/accept`, { estimatedArrivalAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() });
    await load();
  };

  return (
    <Screen title="Deliveries" refreshing={loading} onRefresh={load}>
      <ErrorMessage message={error} onRetry={load} />
      {!orders.length ? <EmptyState title="No deliveries assigned" /> : null}
      {orders.map((order) => (
        <Card key={order._id}>
          <Text onPress={() => navigation.navigate('OrderDetails', { orderId: order._id })} style={{ color: '#101828', fontSize: 17, fontWeight: '900' }}>Order #{order._id.slice(-6)}</Text>
          <Text style={{ color: '#667085', marginTop: 6 }}>Customer: {order.customerId?.name || 'Customer'}</Text>
          <Text style={{ color: '#667085', marginTop: 6 }}>Status: {order.orderStatus} - {order.deliveryTrackingStatus || 'No tracking'}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}><Button onPress={() => navigation.navigate('OrderDetails', { orderId: order._id })} title="Open" variant="secondary" /></View>
            {order.orderStatus === 'In Transit' ? <View style={{ flex: 1 }}><Button onPress={() => accept(order._id)} title="Accept" /></View> : null}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
