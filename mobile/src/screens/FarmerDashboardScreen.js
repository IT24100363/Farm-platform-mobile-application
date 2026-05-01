import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { getApiError } from '../api/api';
import ErrorMessage from '../components/ErrorMessage';
import { Button, Card, Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';

const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const formatMoney = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const getOrderStatus = (order) => order?.orderStatus || order?.status || 'Unknown';

export default function FarmerDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [productsRes, ordersRes, reviewsRes, promosRes] = await Promise.all([
        api.get('/products/farmer/my'),
        api.get('/orders/farmer'),
        api.get('/reviews/manage'),
        api.get('/promotions/manage')
      ]);

      setProducts(productsRes.data || []);
      setOrders(ordersRes.data || []);
      setReviews(reviewsRes.data || []);
      setPromotions(promosRes.data || []);
    } catch (err) {
      setError(getApiError(err, 'Could not load dashboard'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const lowStockProducts = products.filter((product) => Number(product.quantity || 0) > 0 && Number(product.quantity || 0) <= 5);
    const outOfStockProducts = products.filter((product) => Number(product.quantity || 0) === 0);
    const activePromotions = promotions.filter((promo) => promo.isActive && promo.isApproved);
    const pendingPromotions = promotions.filter((promo) => !promo.isApproved);
    const averageRating = reviews.length
      ? round(reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length)
      : 0;
    const totalSalesValue = round(
      orders.reduce((sum, order) => sum + Number(order.totalAmount || order.total || 0), 0)
    );
    const orderStatusCounts = orders.reduce((acc, order) => {
      const status = getOrderStatus(order);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      lowStockProducts,
      outOfStockProducts,
      activePromotions,
      pendingPromotions,
      averageRating,
      totalSalesValue,
      orderStatusCounts,
      recentProducts: [...products].sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0)).slice(0, 4),
      recentOrders: [...orders].slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 4),
      recentReviews: [...reviews].slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 3)
    };
  }, [orders, products, promotions, reviews]);

  const orderStatusRows = [
    'Placed',
    'Confirmed',
    'Out for Delivery',
    'Delivered',
    'Cancelled',
    'Refunded'
  ].map((status) => ({
    status,
    count: stats.orderStatusCounts[status] || 0
  }));

  const maxStatusCount = Math.max(1, ...orderStatusRows.map((item) => item.count));

  return (
    <Screen
      actionLabel="Alerts"
      onAction={() => navigation.navigate('Notifications')}
      title="Farmer Dashboard"
      subtitle={user?.isApproved ? 'Track sales, inventory, reviews, and promotions' : 'Awaiting admin approval'}
      refreshing={loading}
      onRefresh={load}
    >
      <ErrorMessage message={error} onRetry={load} />

      <Card style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIcon}>
            <Ionicons name="leaf" size={22} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>Store snapshot</Text>
            <Text style={styles.heroTitle}>{user?.name || 'Farmer account'}</Text>
          </View>
        </View>
        <Text style={styles.heroBody}>
          Keep an eye on stock health, customer feedback, active orders, and live promotions from one place.
        </Text>
        <View style={styles.heroPills}>
          <MiniPill icon="cube-outline" label={`${products.length} products`} />
          <MiniPill icon="star-outline" label={`${stats.averageRating.toFixed(1)} avg rating`} />
          <MiniPill icon="pricetag-outline" label={`${stats.activePromotions.length} active promos`} />
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <StatCard icon="bag-handle-outline" value={products.length} label="Products" />
        <StatCard icon="cash-outline" value={formatMoney(stats.totalSalesValue)} label="Sales value" />
        <StatCard icon="alert-circle-outline" value={stats.lowStockProducts.length} label="Low stock" accent="warn" />
        <StatCard icon="chatbubble-ellipses-outline" value={reviews.length} label="Reviews" />
      </View>

      <Card>
        <SectionHeading title="Order analytics" subtitle="Current order pipeline by status" />
        {orderStatusRows.every((row) => row.count === 0) ? (
          <Text style={styles.emptyText}>No order data yet.</Text>
        ) : (
          <View style={styles.analyticsList}>
            {orderStatusRows
              .filter((row) => row.count > 0)
              .map((row) => (
                <View key={row.status} style={styles.analyticsRow}>
                  <View style={styles.analyticsHeader}>
                    <Text style={styles.analyticsLabel}>{row.status}</Text>
                    <Text style={styles.analyticsValue}>{row.count}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${(row.count / maxStatusCount) * 100}%`
                        }
                      ]}
                    />
                  </View>
                </View>
              ))}
          </View>
        )}
      </Card>

      <Card>
        <SectionHeading title="Inventory health" subtitle="Items that need attention" />
        <View style={styles.inventoryMeta}>
          <InfoBadge label={`${stats.lowStockProducts.length} low stock`} />
          <InfoBadge label={`${stats.outOfStockProducts.length} out of stock`} tone="danger" />
          <InfoBadge label={`${stats.pendingPromotions.length} pending promos`} tone="warning" />
        </View>
        {stats.lowStockProducts.length ? (
          <View style={{ gap: 10 }}>
            {stats.lowStockProducts.map((product) => (
              <View key={product._id} style={styles.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{product.productName}</Text>
                  <Text style={styles.listSubtitle}>{product.category}</Text>
                </View>
                <Text style={styles.stockCount}>{Number(product.quantity || 0)} left</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No low-stock alerts right now.</Text>
        )}
      </Card>

      <Card>
        <SectionHeading title="Recent orders" subtitle="Latest customer activity" />
        {stats.recentOrders.length ? (
          <View style={{ gap: 10 }}>
            {stats.recentOrders.map((order) => (
              <View key={order._id} style={styles.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>Order #{String(order._id).slice(-6)}</Text>
                  <Text style={styles.listSubtitle}>{getOrderStatus(order)}</Text>
                </View>
                <Text style={styles.amountText}>{formatMoney(order.totalAmount || order.total)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No recent orders.</Text>
        )}
      </Card>

      <Card>
        <SectionHeading title="Recent reviews" subtitle="What customers are saying" />
        {stats.recentReviews.length ? (
          <View style={{ gap: 10 }}>
            {stats.recentReviews.map((review) => (
              <View key={review._id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewRating}>★ {Number(review.rating || 0).toFixed(1)}</Text>
                  <Text style={styles.reviewProduct}>{review.productId?.productName || 'Product'}</Text>
                </View>
                <Text style={styles.reviewText} numberOfLines={2}>
                  {review.comment}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No reviews yet.</Text>
        )}
      </Card>

      <Card>
        <SectionHeading title="Promotions" subtitle="Active and pending offers" />
        <View style={styles.promoRow}>
          <InfoBadge label={`${stats.activePromotions.length} active`} />
          <InfoBadge label={`${stats.pendingPromotions.length} pending`} tone="warning" />
        </View>
        <View style={{ gap: 10, marginTop: 10 }}>
          <Button onPress={() => navigation.navigate('Products')} title="Manage products" />
          <Button onPress={() => navigation.navigate('Promos')} title="Manage promotions" variant="secondary" />
          <Button onPress={() => navigation.navigate('Reviews')} title="Customer reviews" variant="secondary" />
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

function MiniPill({ icon, label }) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={14} color={colors.primaryDark} />
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function StatCard({ icon, value, label, accent }) {
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, accent === 'warn' && styles.warnIcon]}>
        <Ionicons name={icon} size={18} color={accent === 'warn' ? '#9a5b00' : colors.primaryDark} />
      </View>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function InfoBadge({ label, tone }) {
  return (
    <View style={[styles.infoBadge, tone === 'danger' && styles.infoBadgeDanger, tone === 'warning' && styles.infoBadgeWarning]}>
      <Text style={[styles.infoBadgeText, tone === 'danger' && styles.infoBadgeTextDanger, tone === 'warning' && styles.infoBadgeTextWarning]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: 18
  },
  heroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  heroEyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  heroTitle: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2
  },
  heroBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14
  },
  pill: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  pillText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4
  },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    marginBottom: 0,
    minHeight: 112,
    padding: 14
  },
  statIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    height: 34,
    justifyContent: 'center',
    width: 34
  },
  warnIcon: {
    backgroundColor: '#fff4d7'
  },
  statValue: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 10
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2
  },
  sectionTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '900'
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4
  },
  analyticsList: {
    gap: 12
  },
  analyticsRow: {
    gap: 6
  },
  analyticsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  analyticsLabel: {
    color: '#1f2937',
    fontSize: 13,
    fontWeight: '800'
  },
  analyticsValue: {
    color: colors.primaryDark,
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
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: '100%'
  },
  inventoryMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  infoBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  infoBadgeDanger: {
    backgroundColor: '#ffe7ed'
  },
  infoBadgeWarning: {
    backgroundColor: '#fff4d7'
  },
  infoBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800'
  },
  infoBadgeTextDanger: {
    color: '#b42318'
  },
  infoBadgeTextWarning: {
    color: '#9a5b00'
  },
  listItem: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 12,
    padding: 12
  },
  listTitle: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '900'
  },
  listSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3
  },
  stockCount: {
    color: '#9a5b00',
    fontSize: 13,
    fontWeight: '900'
  },
  amountText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '900'
  },
  reviewItem: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 12
  },
  reviewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between'
  },
  reviewRating: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '900'
  },
  reviewProduct: {
    color: colors.primaryDark,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right'
  },
  reviewText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8
  },
  promoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13
  }
});
