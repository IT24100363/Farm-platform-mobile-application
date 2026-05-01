import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { getApiError } from '../api/api';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import { Button, Card, Screen } from '../components/Screen';
import { colors, radius, shadow } from '../theme';

const fallbackImage = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80';

const formatMoney = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

export default function ProductInsightsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: response } = await api.get('/products/insights');
      setData(response);
    } catch (err) {
      setError(getApiError(err, 'Could not load product insights'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const summary = data?.summary || {};

  const summaryCards = useMemo(() => ([
    { label: 'Top-rated base', value: Number(summary.averageRating || 0).toFixed(1), icon: 'star' },
    { label: 'Reviewed products', value: summary.ratedProducts || 0, icon: 'chatbubble-ellipses-outline' },
    { label: 'Units sold', value: summary.totalUnitsSold || 0, icon: 'cart-outline' },
    { label: 'Revenue', value: formatMoney(summary.totalRevenue || 0), icon: 'cash-outline' },
    { label: 'Products tracked', value: summary.totalProducts || 0, icon: 'layers-outline' }
  ]), [summary]);

  return (
    <Screen
      title="Product Insights"
      subtitle="Trusted picks, review signals, and product performance"
      refreshing={loading}
      onRefresh={load}
    >
      <ErrorMessage message={error} onRetry={load} />

      <Card style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}>
            <Ionicons name="analytics-outline" size={22} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>Smart buying guide</Text>
            <Text style={styles.heroTitle}>See what customers trust most</Text>
          </View>
        </View>
        <Text style={styles.heroText}>
          Use ratings, review counts, sales activity, and recent feedback to find the best products faster.
        </Text>
      </Card>

      <View style={styles.summaryGrid}>
        {summaryCards.map((item) => (
          <Card key={item.label} style={styles.summaryCard}>
            <Ionicons name={item.icon} size={18} color={colors.primaryDark} />
            <Text style={styles.summaryValue}>{item.value}</Text>
            <Text style={styles.summaryLabel}>{item.label}</Text>
          </Card>
        ))}
      </View>

      <AnalyticsBar label="Average customer rating" value={Number(summary.averageRating || 0)} max={5} />
      <AnalyticsBar label="Review coverage" value={Number(summary.ratedProducts || 0)} max={Number(summary.totalProducts || 1)} suffix={` / ${summary.totalProducts || 0}`} />
      <AnalyticsBar label="Sales activity" value={Number(summary.totalUnitsSold || 0)} max={Math.max(1, Number(summary.totalUnitsSold || 0))} suffix=" units" />

      <Section title="Top-rated products" subtitle="Highest average customer ratings">
        <ProductList items={data?.topRated || []} navigation={navigation} metricKey="averageRating" metricLabel="rating" />
      </Section>

      <Section title="Best-selling products" subtitle="Most purchased across completed orders">
        <ProductList items={data?.bestSelling || []} navigation={navigation} metricKey="unitsSold" metricLabel="sold" />
      </Section>

      <Section title="Most popular products" subtitle="A combined popularity score from sales, reviews, and ratings">
        <ProductList items={data?.mostPopular || []} navigation={navigation} metricKey="popularityScore" metricLabel="score" />
      </Section>

      <Card>
        <SectionHeading title="Customer feedback" subtitle="Recent review snippets from real buyers" />
        {data?.recentReviews?.length ? (
          <View style={{ gap: 10 }}>
            {data.recentReviews.map((review) => (
              <View key={review._id} style={styles.reviewRow}>
                <Image source={{ uri: review.productId?.images?.[0] || fallbackImage }} style={styles.reviewImage} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewTitle}>{review.productId?.productName || 'Product'}</Text>
                  <Text style={styles.reviewMeta}>
                    {review.customerId?.name || 'Customer'} • ★ {Number(review.rating || 0).toFixed(1)}
                  </Text>
                  <Text style={styles.reviewText} numberOfLines={2}>
                    {review.comment || 'No comment left.'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState title="No reviews yet" message="Reviews will appear here as customers start sharing feedback." />
        )}
      </Card>

      <Card style={styles.footerCard}>
        <Text style={styles.footerTitle}>Want to browse the full catalog?</Text>
        <Text style={styles.footerText}>Jump back to products and keep exploring the freshest items.</Text>
        <View style={{ marginTop: 12 }}>
          <Button onPress={() => navigation.navigate('Products')} title="Browse products" />
        </View>
      </Card>
    </Screen>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <SectionHeading title={title} subtitle={subtitle} />
      {children}
    </View>
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

function AnalyticsBar({ label, value, max, suffix = '' }) {
  const percent = Math.min(100, (Number(value || 0) / Math.max(1, Number(max || 1))) * 100);
  return (
    <Card style={styles.analyticsCard}>
      <View style={styles.analyticsHeader}>
        <Text style={styles.analyticsLabel}>{label}</Text>
        <Text style={styles.analyticsValue}>
          {Number(value || 0).toFixed(1)}
          {suffix}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
    </Card>
  );
}

function ProductList({ items, navigation, metricKey, metricLabel }) {
  if (!items?.length) {
    return <EmptyState title="No data yet" message="This section will populate as more shopping and review activity comes in." />;
  }

  return (
    <View style={{ gap: 12 }}>
      {items.map((product, index) => (
        <TouchableOpacity
          activeOpacity={0.88}
          key={product._id}
          onPress={() => navigation.navigate('ProductDetails', { productId: product._id })}
        >
          <Card style={styles.productCard}>
            <Image source={{ uri: product.images?.[0] || fallbackImage }} style={styles.productImage} />
            <View style={{ flex: 1 }}>
              <View style={styles.rankRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <Text style={styles.productCategory} numberOfLines={1}>
                  {product.category || 'Farm product'}
                </Text>
              </View>
              <Text style={styles.productTitle} numberOfLines={1}>
                {product.productName || 'Product'}
              </Text>
              <Text style={styles.productMeta} numberOfLines={1}>
                {metricLabel === 'rating'
                  ? `${Number(product.averageRating || 0).toFixed(1)} rating • ${product.ratingCount || 0} reviews`
                  : metricLabel === 'sold'
                  ? `${product.unitsSold || 0} units sold • ${formatMoney(product.revenue || 0)} revenue`
                  : `${product.unitsSold || 0} sold • ${product.ratingCount || 0} reviews • score ${Math.round(product.popularityScore || 0)}`}
              </Text>
              <View style={styles.metricRow}>
                <Text style={styles.metricValueText}>
                  {metricLabel === 'rating'
                    ? `${Number(product.averageRating || 0).toFixed(1)}`
                    : Math.round(Number(product[metricKey] || 0))}
                </Text>
                <Text style={styles.metricLabelText}>{metricLabel}</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </View>
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
    textTransform: 'uppercase'
  },
  heroTitle: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2
  },
  heroText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4
  },
  summaryCard: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 104,
    padding: 14
  },
  summaryValue: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 10
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2
  },
  analyticsCard: {
    marginBottom: 12
  },
  analyticsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  analyticsLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800'
  },
  analyticsValue: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900'
  },
  track: {
    backgroundColor: '#e5efe8',
    borderRadius: 999,
    height: 10,
    overflow: 'hidden'
  },
  fill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: '100%'
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
  productCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 104,
    padding: 12
  },
  productImage: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    height: 78,
    width: 78
  },
  rankRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4
  },
  rankBadge: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 22,
    justifyContent: 'center',
    width: 22
  },
  rankText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900'
  },
  productCategory: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 12,
    fontWeight: '700'
  },
  productTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900'
  },
  productMeta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4
  },
  metricRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 6,
    marginTop: 8
  },
  metricValueText: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '900'
  },
  metricLabelText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800'
  },
  reviewRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4
  },
  reviewImage: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    height: 58,
    width: 58
  },
  reviewTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900'
  },
  reviewMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3
  },
  reviewText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4
  },
  footerCard: {
    alignItems: 'flex-start'
  },
  footerTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '900'
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6
  }
});
