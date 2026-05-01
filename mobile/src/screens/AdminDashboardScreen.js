import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { getApiError } from '../api/api';
import ErrorMessage from '../components/ErrorMessage';
import { Button, Card, Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';

export default function AdminDashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, analyticsRes, productsRes] = await Promise.all([
        api.get('/users/stats'),
        api.get('/users/analytics'),
        api.get('/products/admin/all', { params: { limit: 500 } })
      ]);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
      setCatalog(productsRes.data?.items || []);
    } catch (err) {
      setError(getApiError(err, 'Could not load admin dashboard'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const productNameMap = useMemo(() => {
    return catalog.reduce((acc, product) => {
      acc[String(product._id)] = product.productName;
      return acc;
    }, {});
  }, [catalog]);

  const statusSeries = (analytics?.ordersByStatus || [])
    .slice()
    .sort((a, b) => b.count - a.count);
  const roleSeries = (analytics?.roles || [])
    .slice()
    .sort((a, b) => b.count - a.count);
  const topProducts = (analytics?.topProducts || []).slice().sort((a, b) => b.qty - a.qty);
  const promoSeries = (analytics?.promoUsage || []).slice().sort((a, b) => b.usage - a.usage);
  const totalOrders = Number(stats?.totalOrders || 0);
  const paidRevenue = Number(stats?.revenue || 0);
  const conversionRate = totalOrders ? ((roleSeries.find((item) => item._id === 'customer')?.count || 0) / totalOrders) * 100 : 0;

  return (
    <Screen actionLabel="Alerts" onAction={() => navigation.navigate('Notifications')} title="Admin" subtitle="Platform management" refreshing={loading} onRefresh={load}>
      <ErrorMessage message={error} onRetry={load} />
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Live platform overview</Text>
            <Text style={styles.heroSubtitle}>Track users, orders, revenue, and campaign activity in one place.</Text>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="analytics-outline" size={24} color={colors.primaryDark} />
          </View>
        </View>
        <View style={styles.heroStatsRow}>
          <MiniMetric label="Revenue" value={`Rs ${paidRevenue.toFixed(0)}`} />
          <MiniMetric label="Orders" value={String(totalOrders || 0)} />
          <MiniMetric label="Conversion" value={`${conversionRate.toFixed(0)}%`} />
        </View>
      </View>

      <View style={styles.summaryGrid}>
        {[
          { label: 'Users', value: stats?.totalUsers, icon: 'people-outline' },
          { label: 'Farmers', value: stats?.totalFarmers, icon: 'leaf-outline' },
          { label: 'Orders', value: stats?.totalOrders, icon: 'receipt-outline' },
          { label: 'Products', value: stats?.totalProducts, icon: 'basket-outline' },
          { label: 'Revenue', value: `Rs ${Number(stats?.revenue || 0).toFixed(0)}`, icon: 'cash-outline' }
        ].map((item) => (
          <Card key={item.label} style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons name={item.icon} size={18} color={colors.primaryDark} />
            </View>
            <Text style={styles.summaryValue}>{item.value ?? '-'}</Text>
            <Text style={styles.summaryLabel}>{item.label}</Text>
          </Card>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Orders by status</Text>
        <Text style={styles.sectionMeta}>{statusSeries.length} statuses</Text>
      </View>
      <Card style={styles.chartCard}>
        {statusSeries.length ? statusSeries.map((item, index) => (
          <BarRow
            key={item._id}
            color={BAR_COLORS[index % BAR_COLORS.length]}
            label={item._id}
            value={item.count}
            max={Math.max(...statusSeries.map((entry) => entry.count))}
          />
        )) : <EmptyNote text="No status data yet." />}
      </Card>

      <View style={styles.dualGrid}>
        <Card style={[styles.chartCard, styles.halfCard]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>User mix</Text>
            <Text style={styles.sectionMeta}>Roles</Text>
          </View>
          {roleSeries.length ? roleSeries.map((item, index) => (
            <BarRow
              key={item._id}
              color={BAR_COLORS[index % BAR_COLORS.length]}
              label={item._id}
              value={item.count}
              max={Math.max(...roleSeries.map((entry) => entry.count))}
            />
          )) : <EmptyNote text="No role data yet." />}
        </Card>

        <Card style={[styles.chartCard, styles.halfCard]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Promotions</Text>
            <Text style={styles.sectionMeta}>Usage</Text>
          </View>
          {promoSeries.length ? promoSeries.map((item, index) => (
            <BarRow
              key={item._id}
              color={BAR_COLORS[index % BAR_COLORS.length]}
              label={item._id}
              value={item.usage}
              max={Math.max(...promoSeries.map((entry) => entry.usage))}
            />
          )) : <EmptyNote text="No promotion usage yet." />}
        </Card>
      </View>

      <Card style={styles.listCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top products</Text>
          <Text style={styles.sectionMeta}>By quantity sold</Text>
        </View>
        {topProducts.length ? topProducts.map((item, index) => (
          <View key={item._id} style={styles.listRow}>
            <View style={styles.rankBubble}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.listLabel}>{productNameMap[String(item._id)] || String(item._id).slice(-10)}</Text>
              <Text style={styles.listMeta}>Qty {item.qty} - Revenue Rs {Number(item.revenue || 0).toFixed(0)}</Text>
            </View>
          </View>
        )) : <EmptyNote text="No product analytics yet." />}
      </Card>

      <View style={styles.quickActions}>
        <Button onPress={() => navigation.navigate('Promotions')} title="Manage promotions" variant="secondary" />
        <Button onPress={() => navigation.navigate('Reviews')} title="Manage reviews" variant="secondary" />
      </View>
    </Screen>
  );
}

function MiniMetric({ label, value }) {
  return (
    <View style={styles.miniMetric}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function BarRow({ label, value, max, color }) {
  const width = max ? `${Math.max(10, (value / max) * 100)}%` : '10%';
  return (
    <View style={styles.barRow}>
      <View style={styles.barHeader}>
        <Text numberOfLines={1} style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{value}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function EmptyNote({ text }) {
  return <Text style={styles.emptyNote}>{text}</Text>;
}

const BAR_COLORS = ['#208354', '#f6b84b', '#0f766e', '#7c3aed', '#ef4444'];

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...{
      shadowColor: '#183326',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 3
    }
  },
  heroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    width: 52
  },
  heroTitle: {
    color: colors.primaryDark,
    fontSize: 21,
    fontWeight: '900'
  },
  heroSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14
  },
  miniMetric: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    flex: 1,
    padding: 12
  },
  miniValue: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: '900'
  },
  miniLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  summaryCard: {
    alignItems: 'flex-start',
    minHeight: 118,
    width: '48%'
  },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  summaryValue: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 10
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2
  },
  sectionHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 16
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900'
  },
  sectionMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700'
  },
  chartCard: {
    paddingBottom: 14
  },
  halfCard: {
    width: '48%'
  },
  dualGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  barRow: {
    marginTop: 10
  },
  barHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  barLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    paddingRight: 8
  },
  barValue: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900'
  },
  barTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    height: 10,
    overflow: 'hidden'
  },
  barFill: {
    borderRadius: 999,
    height: '100%'
  },
  listCard: {
    paddingBottom: 14
  },
  listRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 10
  },
  rankBubble: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  rankText: {
    color: colors.primaryDark,
    fontWeight: '900'
  },
  listLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900'
  },
  listMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2
  },
  emptyNote: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 10
  },
  quickActions: {
    gap: 10,
    marginTop: 18
  }
});
