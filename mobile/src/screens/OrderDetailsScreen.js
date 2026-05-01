import React, { useEffect, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import api, { getApiError } from '../api/api';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import { Button, Card, FieldLabel, Screen } from '../components/Screen';
import { useAuth } from '../context/AuthContext';

const formatDateTimeParts = (value) => {
  if (!value) return { date: 'Not set', time: 'Not set', dateTime: 'Not set' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: 'Not set', time: 'Not set', dateTime: 'Not set' };
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    dateTime: date.toLocaleString()
  };
};

export default function OrderDetailsScreen({ route, navigation }) {
  const { user } = useAuth();
  const { orderId } = route.params || {};
  const [order, setOrder] = useState(null);
  const [eta, setEta] = useState(new Date(Date.now() + 60 * 60 * 1000).toISOString());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setOrder(data);
    } catch (err) {
      setError(getApiError(err, 'Could not load order'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orderId]);

  const updateStatus = async (status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status, estimatedArrivalAt: eta });
      await load();
    } catch (err) {
      Alert.alert('Status update failed', getApiError(err));
    }
  };

  const acceptDelivery = async () => {
    try {
      await api.put(`/orders/${orderId}/delivery/accept`, { estimatedArrivalAt: eta });
      await load();
    } catch (err) {
      Alert.alert('Accept failed', getApiError(err));
    }
  };

  const cancelOrder = async () => {
    try {
      await api.post(`/orders/${orderId}/cancel`);
      await load();
    } catch (err) {
      Alert.alert('Cancel failed', getApiError(err));
    }
  };

  const refund = async () => {
    try {
      await api.post(`/orders/${orderId}/refund`);
      await load();
    } catch (err) {
      Alert.alert('Refund failed', getApiError(err));
    }
  };

  const goToHomepage = () => {
    navigation?.navigate?.('CustomerTabs', { screen: 'Home' });
  };

  if (loading) return <Loading />;

  const etaParts = formatDateTimeParts(order?.estimatedArrivalAt);

  return (
    <Screen title={`Order #${orderId?.slice(-6) || ''}`} refreshing={loading} onRefresh={load}>
      <ErrorMessage message={error} onRetry={load} />
      {!order ? <EmptyState title="Order not found" /> : (
        <>
          <Card>
            <Text style={titleStyle}>{order.orderStatus}</Text>
            <Text style={mutedStyle}>Payment: {order.paymentStatus} ({order.paymentMethod})</Text>
            <Text style={priceStyle}>Rs {Number(order.totalAmount || 0).toFixed(2)}</Text>
            <Text style={mutedStyle}>Customer: {order.customerId?.name || 'Customer'}</Text>
            <Text style={mutedStyle}>Farmer: {order.farmerId?.name || 'Farmer'}</Text>
            <Text style={mutedStyle}>Delivery: {order.deliveryPartnerId?.name || 'Not assigned'}</Text>
          </Card>
          {(order.products || []).map((item) => (
            <Card key={item._id || item.productId?._id}>
              <Text style={titleStyle}>{item.productId?.productName || 'Product'}</Text>
              <Text style={mutedStyle}>Qty {item.quantity} - Rs {Number(item.price || 0).toFixed(2)}</Text>
            </Card>
          ))}
          {user?.role === 'delivery' ? (
            <Card>
              <FieldLabel>ETA date and time</FieldLabel>
              <TextInput onChangeText={setEta} placeholder="YYYY-MM-DDTHH:mm:ss.sssZ" style={inputStyle} value={eta} />
              <Text style={mutedStyle}>Current ETA: {etaParts.dateTime}</Text>
              {order.orderStatus === 'In Transit' ? <Button onPress={acceptDelivery} title="Accept and mark Out for Delivery" /> : null}
              {order.orderStatus === 'Out for Delivery' ? (
                <View style={{ gap: 10 }}>
                  <Button onPress={() => updateStatus('Delivered')} title="Mark Delivered" />
                  <Button onPress={() => api.put(`/orders/${orderId}/delivery/tracking`, { trackingStatus: 'Delayed' }).then(load)} title="Mark Delayed" variant="secondary" />
                </View>
              ) : null}
            </Card>
          ) : null}
          {['admin', 'farmer'].includes(user?.role) && order.orderStatus !== 'Delivered' ? (
            <View style={{ gap: 10 }}>
              <Button onPress={() => updateStatus(order.paymentMethod === 'ONLINE' && order.orderStatus === 'Confirmed' ? 'In Transit' : 'In Transit')} title="Move to In Transit" variant="secondary" />
            </View>
          ) : null}
          {['customer', 'admin'].includes(user?.role) && !['Cancelled', 'Refunded', 'Delivered'].includes(order.orderStatus) ? (
            <View style={{ marginTop: 10 }}>
              <Button onPress={cancelOrder} title="Cancel order" variant="danger" />
            </View>
          ) : null}
          {user?.role === 'customer' ? (
            <View style={{ marginTop: 10 }}>
              <Button onPress={goToHomepage} title="Go to Homepage" variant="secondary" />
            </View>
          ) : null}
          {user?.role === 'admin' && order.orderStatus === 'Cancelled' && order.paymentMethod === 'ONLINE' ? (
            <View style={{ marginTop: 10 }}>
              <Button onPress={refund} title="Process refund" />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const titleStyle = { color: '#101828', fontSize: 17, fontWeight: '900' };
const mutedStyle = { color: '#667085', marginTop: 6 };
const priceStyle = { color: '#166534', fontSize: 20, fontWeight: '900', marginTop: 8 };
const inputStyle = { backgroundColor: '#fff', borderColor: '#d9e2dc', borderRadius: 8, borderWidth: 1, marginBottom: 12, padding: 12 };
