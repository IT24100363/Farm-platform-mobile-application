import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { getApiError } from '../api/api';
import ErrorMessage from '../components/ErrorMessage';
import { Button, Card, Screen } from '../components/Screen';

export default function DeliveryDashboardScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [toDeliver, setToDeliver] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [all, pending] = await Promise.all([api.get('/orders/delivery'), api.get('/orders/delivery/to-deliver')]);
      setOrders(all.data || []);
      setToDeliver(pending.data || []);
    } catch (err) {
      setError(getApiError(err, 'Could not load delivery dashboard'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const activeOrders = orders.filter((order) => !['Delivered', 'Cancelled', 'Refunded'].includes(order.orderStatus));
    const delayedOrders = orders.filter((order) => order.isDeliveryDelayed || order.deliveryTrackingStatus === 'Delayed');
    const completedOrders = orders.filter((order) => order.orderStatus === 'Delivered');
    const awaitingAcceptance = toDeliver.filter((order) => order.orderStatus === 'In Transit');
    const nextDelivery = activeOrders
      .filter((order) => order.estimatedArrivalAt)
      .slice()
      .sort((a, b) => new Date(a.estimatedArrivalAt) - new Date(b.estimatedArrivalAt))[0];

    const statusCounts = orders.reduce((acc, order) => {
      const key = order.orderStatus || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const statusRows = ['In Transit', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'].map((status) => ({
      status,
      count: statusCounts[status] || 0
    }));

    return {
      activeOrders,
      delayedOrders,
      completedOrders,
      awaitingAcceptance,
      nextDelivery,
      statusRows,
      maxStatusCount: Math.max(1, ...statusRows.map((item) => item.count))
    };
  }, [orders, toDeliver]);

  return (
    <Screen
      actionLabel="Alerts"
      onAction={() => navigation.navigate('Notifications')}
      title="Delivery Dashboard"
      subtitle="Assigned delivery work, routes, and order progress"
      refreshing={loading}
      onRefresh={load}
    >
      <ErrorMessage message={error} onRetry={load} />

      <Card style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}>
            <Ionicons name="bicycle-outline" size={22} color="#0b3d28" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>Live route summary</Text>
            <Text style={styles.heroTitle}>{stats.activeOrders.length} active stops</Text>
          </View>
        </View>
        <Text style={styles.heroText}>
          Track what is waiting, what is delayed, and what has already been delivered from one place.
        </Text>
      </Card>

      <View style={styles.statsGrid}>
        <MetricCard icon="bag-check-outline" value={orders.length} label="Assigned" />
        <MetricCard icon="hourglass-outline" value={stats.awaitingAcceptance.length} label="Awaiting accept" />
        <MetricCard icon="warning-outline" value={stats.delayedOrders.length} label="Delayed" accent="warn" />
        <MetricCard icon="checkmark-done-outline" value={stats.completedOrders.length} label="Delivered" />
      </View>

      <Card>
        <SectionHeading title="Delivery status" subtitle="Current order load by lifecycle stage" />
        {stats.statusRows.every((row) => row.count === 0) ? (
          <Text style={styles.mutedText}>No delivery statuses yet.</Text>
        ) : (
          <View style={{ gap: 12 }}>
            {stats.statusRows
              .filter((row) => row.count > 0)
              .map((row) => (
                <View key={row.status}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowLabel}>{row.status}</Text>
                    <Text style={styles.rowValue}>{row.count}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(row.count / stats.maxStatusCount) * 100}%` }]} />
                  </View>
                </View>
              ))}
          </View>
        )}
      </Card>

      <Card>
        <SectionHeading title="Next stop" subtitle="Closest delivery based on ETA" />
        {stats.nextDelivery ? (
          <View style={styles.stopCard}>
            <Text style={styles.stopTitle}>Order #{String(stats.nextDelivery._id).slice(-6)}</Text>
            <Text style={styles.mutedText}>Customer: {stats.nextDelivery.customerId?.name || 'Customer'}</Text>
            <Text style={styles.mutedText}>Status: {stats.nextDelivery.orderStatus}</Text>
            <Text style={styles.stopEta}>
              ETA {stats.nextDelivery.estimatedArrivalAt ? new Date(stats.nextDelivery.estimatedArrivalAt).toLocaleString() : 'Not set'}
            </Text>
          </View>
        ) : (
          <Text style={styles.mutedText}>No active ETA assigned yet.</Text>
        )}
      </Card>

      <Card>
        <SectionHeading title="Quick actions" subtitle="Jump straight into the work queue" />
        <View style={{ gap: 10 }}>
          <Button onPress={() => navigation.navigate('Deliveries')} title="Open deliveries" />
          <Button onPress={() => navigation.navigate('Deliveries')} title="View route queue" variant="secondary" />
        </View>
      </Card>
    </Screen>
  );
}

function SectionHeading({ title, subtitle }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function MetricCard({ icon, value, label, accent }) {
  return (
    <Card style={styles.metricCard}>
      <View style={[styles.metricIcon, accent === 'warn' && styles.metricIconWarn]}>
        <Ionicons name={icon} size={18} color={accent === 'warn' ? '#9a5b00' : '#0b3d28'} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: 18
  },
  heroRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: '#dff7e8',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  heroLabel: {
    color: '#647083',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  heroTitle: {
    color: '#0b3d28',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2
  },
  heroText: {
    color: '#647083',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  metricCard: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 110,
    padding: 14
  },
  metricIcon: {
    alignItems: 'center',
    backgroundColor: '#dff7e8',
    borderRadius: 12,
    height: 34,
    justifyContent: 'center',
    width: 34
  },
  metricIconWarn: {
    backgroundColor: '#fff4d7'
  },
  metricValue: {
    color: '#0b3d28',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 10
  },
  metricLabel: {
    color: '#647083',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2
  },
  sectionTitle: {
    color: '#0b3d28',
    fontSize: 18,
    fontWeight: '900'
  },
  sectionSubtitle: {
    color: '#647083',
    fontSize: 13,
    marginTop: 4
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  rowLabel: {
    color: '#1f2937',
    fontSize: 13,
    fontWeight: '800'
  },
  rowValue: {
    color: '#0b3d28',
    fontSize: 13,
    fontWeight: '900'
  },
  barTrack: {
    backgroundColor: '#e5efe8',
    borderRadius: 999,
    height: 10,
    overflow: 'hidden'
  },
  barFill: {
    backgroundColor: '#208354',
    borderRadius: 999,
    height: '100%'
  },
  stopCard: {
    backgroundColor: '#edf4ef',
    borderRadius: 16,
    padding: 12
  },
  stopTitle: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4
  },
  stopEta: {
    color: '#0b3d28',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8
  },
  mutedText: {
    color: '#667085',
    fontSize: 13
  }
});
