import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { getApiError } from '../api/api';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import { Button, Card, Screen } from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import BrandLogo from '../components/BrandLogo';
import { colors, radius, shadow } from '../theme';

const heroImage = 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=85';
const { width: screenWidth } = Dimensions.get('window');
const carouselCardWidth = Math.min(screenWidth - 58, 330);

const quickActions = [
  { label: 'Shop', icon: 'basket-outline', route: 'Products' },
  { label: 'Offers', icon: 'pricetag-outline', route: 'Promotions' },
  { label: 'Orders', icon: 'receipt-outline', route: 'Orders' },
  { label: 'Alerts', icon: 'notifications-outline', route: 'Notifications' }
];

const categories = [
  { label: 'Vegetables', icon: 'leaf-outline' },
  { label: 'Fruits', icon: 'nutrition-outline' },
  { label: 'Dairy', icon: 'egg-outline' },
  { label: 'Staples', icon: 'bag-outline' }
];

export default function HomeScreen({ navigation }) {
  const { user, isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const carouselRef = useRef(null);
  const carouselIndexRef = useRef(0);
  const [products, setProducts] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [productRes, promotionRes] = await Promise.all([
        api.get('/products', { params: { limit: 8, sort: 'newest' } }),
        api.get('/promotions')
      ]);
      setProducts(productRes.data.items || []);
      setPromotions(promotionRes.data || []);
      if (isAuthenticated) {
        try {
          const notificationsRes = await api.get('/notifications');
          const unreadCount = (notificationsRes.data || []).filter((item) => !item.isRead).length;
          setUnreadNotifications(unreadCount);
        } catch {
          setUnreadNotifications(0);
        }
      } else {
        setUnreadNotifications(0);
      }
    } catch (err) {
      setError(getApiError(err, 'Could not load home content'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (products.length <= 1) return undefined;
    const timer = setInterval(() => {
      carouselIndexRef.current = (carouselIndexRef.current + 1) % products.length;
      carouselRef.current?.scrollTo({
        x: carouselIndexRef.current * (carouselCardWidth + 14),
        animated: true
      });
    }, 3500);
    return () => clearInterval(timer);
  }, [products.length]);

  const stats = useMemo(() => {
    const categoriesCount = new Set(products.map((item) => item.category).filter(Boolean)).size;
    const availableStock = products.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const offers = products.filter((item) => item.discountBadge || item.discount).length;
    return [
      { label: 'Fresh items', value: products.length || '-' },
      { label: 'Categories', value: categoriesCount || '-' },
      { label: 'Stock ready', value: availableStock || '-' },
      { label: 'Offers', value: offers || 'New' }
    ];
  }, [products]);

  const topSellers = useMemo(() => {
    const farmerMap = new Map();
    products.forEach((product) => {
      const farmer = product.farmerId;
      const id = farmer?._id || farmer || 'farmer';
      const name = farmer?.name || 'Local farmer';
      const current = farmerMap.get(id) || {
        id,
        name,
        count: 0,
        ratingTotal: 0,
        ratingCount: 0
      };
      current.count += 1;
      current.ratingTotal += Number(product.averageRating || 0);
      current.ratingCount += product.averageRating ? 1 : 0;
      farmerMap.set(id, current);
    });
    return Array.from(farmerMap.values())
      .map((seller) => ({
        ...seller,
        rating: seller.ratingCount ? (seller.ratingTotal / seller.ratingCount).toFixed(1) : 'New'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [products]);

  return (
    <Screen
      actionIcon="notifications-outline"
      actionLabel={isAuthenticated ? 'Alerts' : undefined}
      actionBadgeCount={unreadNotifications}
      onAction={isAuthenticated ? () => navigation.navigate('Notifications') : undefined}
      onRefresh={load}
      refreshing={loading}
      subtitle={isAuthenticated ? `Welcome back, ${user?.name || 'customer'}` : 'Browse fresh products before you sign in'}
      title="Home"
    >
      <View style={styles.brandHeader}>
        <BrandLogo compact />
        <View style={styles.pill}>
          <Ionicons name="sparkles" size={15} color={colors.warning} />
          <Text style={styles.pillText}>Today fresh</Text>
        </View>
      </View>

      <ImageBackground source={{ uri: heroImage }} imageStyle={styles.heroImage} style={styles.hero}>
        <View style={styles.heroOverlay}>
          <Text style={styles.eyebrow}>Direct from trusted farmers</Text>
          <Text style={styles.heroTitle}>Fresh harvest delivered to your door</Text>
          <Text style={styles.heroText}>Buy seasonal produce, use discounts, and track every order from one mobile app.</Text>
          <View style={styles.heroActions}>
            <View style={{ flex: 1 }}>
              <Button icon="basket-outline" onPress={() => navigation.navigate('Products')} title="Start shopping" />
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Promotions')} style={styles.roundButton}>
              <Ionicons name="pricetag-outline" size={22} color={colors.primaryDark} />
            </TouchableOpacity>
          </View>
          {!isAuthenticated ? (
            <View style={styles.guestAuthActions}>
              <View style={{ flex: 1 }}>
                <Button icon="log-in-outline" onPress={() => navigation.navigate('Login')} title="Login" variant="secondary" />
              </View>
              <View style={{ flex: 1 }}>
                <Button icon="person-add-outline" onPress={() => navigation.navigate('Register')} title="Register" />
              </View>
            </View>
          ) : null}
        </View>
      </ImageBackground>

      <View style={styles.quickGrid}>
        {quickActions.map((item) => (
          <TouchableOpacity activeOpacity={0.85} key={item.label} onPress={() => navigation.navigate(item.route)} style={styles.quickAction}>
            <View style={styles.quickIcon}>
              <Ionicons name={item.icon} size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card style={styles.panel}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Marketplace snapshot</Text>
            <Text style={styles.sectionSubtitle}>A quick look at what is ready today</Text>
          </View>
          <Ionicons name="analytics-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.statsGrid}>
          {stats.map((item) => (
            <View key={item.label} style={styles.statBox}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Shop by category</Text>
          <Text style={styles.sectionSubtitle}>Find what you need faster</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        {categories.map((category) => (
          <TouchableOpacity
            activeOpacity={0.85}
            key={category.label}
            onPress={() => navigation.navigate('Products')}
            style={styles.categoryChip}
          >
            <Ionicons name={category.icon} size={20} color={colors.primary} />
            <Text style={styles.categoryText}>{category.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Card style={styles.deliveryCard}>
        <View style={styles.deliveryIcon}>
          <Ionicons name="bicycle-outline" size={24} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.deliveryTitle}>Track every delivery</Text>
          <Text style={styles.deliveryText}>Order status, delivery updates, and notifications stay synced in real time.</Text>
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Fresh picks</Text>
          <Text style={styles.sectionSubtitle}>Recently listed farm products</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Products')}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

      <ErrorMessage message={error} onRetry={load} />
      {products.length ? (
        <ScrollView
          horizontal
          ref={carouselRef}
          showsHorizontalScrollIndicator={false}
          snapToInterval={carouselCardWidth + 14}
          decelerationRate="fast"
          contentContainerStyle={styles.carousel}
        >
          {products.map((product) => (
            <TouchableOpacity
              activeOpacity={0.9}
              key={product._id}
              onPress={() => navigation.navigate('ProductDetails', { productId: product._id })}
              style={styles.carouselCard}
            >
              <Image source={{ uri: product.images?.[0] || heroImage }} style={styles.carouselImage} />
              <View style={styles.carouselBody}>
                <View style={styles.freshBadge}>
                  <Ionicons name="time-outline" size={13} color={colors.primaryDark} />
                  <Text style={styles.freshBadgeText}>Recently added</Text>
                </View>
                <Text numberOfLines={1} style={styles.carouselTitle}>{product.productName || 'Farm product'}</Text>
                <Text numberOfLines={1} style={styles.carouselMeta}>{product.category || 'Farm harvest'}</Text>
                <View style={styles.carouselFooter}>
                  <Text style={styles.carouselPrice}>Rs {Number(product.price || 0).toFixed(2)}</Text>
                  <TouchableOpacity onPress={() => addItem(product)} style={styles.addMini}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : <EmptyState icon="basket-outline" title="No products yet" message="Fresh products will appear here after farmers add inventory." />}

      <Card style={styles.insightsCard}>
        <View style={styles.insightsRow}>
          <View style={styles.insightsIcon}>
            <Ionicons name="analytics-outline" size={22} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightsTitle}>Trusted product insights</Text>
            <Text style={styles.insightsText}>See top-rated, best-selling, and most popular products before you buy.</Text>
          </View>
        </View>
        <View style={{ marginTop: 12 }}>
          <Button icon="bar-chart-outline" onPress={() => navigation.navigate('ProductInsights')} title="View product insights" variant="secondary" />
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Promotions</Text>
          <Text style={styles.sectionSubtitle}>Deals and discounts you can use today</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Promotions')}>
          <Text style={styles.viewAll}>All offers</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoRow}>
        {(promotions.length ? promotions.slice(0, 4) : [
          { _id: 'default-1', title: 'Seasonal savings', description: 'Fresh discounts from verified farms', discountType: 'percentage', discountValue: 10 },
          { _id: 'default-2', title: 'Direct farm deals', description: 'Better value on daily essentials', discountType: 'fixed', discountValue: 50 }
        ]).map((promo) => (
          <TouchableOpacity activeOpacity={0.88} key={promo._id} onPress={() => navigation.navigate('Promotions')} style={styles.promoCard}>
            <View style={styles.promoIcon}>
              <Ionicons name="pricetag" size={22} color="#fff" />
            </View>
            <Text numberOfLines={1} style={styles.promoTitle}>{promo.title}</Text>
            <Text numberOfLines={2} style={styles.promoText}>{promo.description || 'Limited-time farm offer'}</Text>
            <Text style={styles.promoValue}>
              {promo.discountType === 'percentage' ? `${promo.discountValue}% OFF` : `Rs ${promo.discountValue} OFF`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Card style={styles.storyCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.storyEyebrow}>Customer story</Text>
          <Text style={styles.storyTitle}>“I can order fresh vegetables and track delivery without calling anyone.”</Text>
          <Text style={styles.storyText}>Cathy Customer uses Farm Direct for weekly household shopping and real-time order updates.</Text>
        </View>
        <View style={styles.storyAvatar}>
          <Ionicons name="person" size={28} color="#fff" />
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Top sellers</Text>
          <Text style={styles.sectionSubtitle}>Farmers with active fresh listings</Text>
        </View>
      </View>
      {(topSellers.length ? topSellers : [
        { id: 'seller-1', name: 'Frank Farmer', count: 6, rating: '4.8' },
        { id: 'seller-2', name: 'Fiona Farmer', count: 5, rating: '4.7' }
      ]).map((seller, index) => (
        <Card key={seller.id} style={styles.sellerCard}>
          <View style={styles.sellerRank}>
            <Text style={styles.sellerRankText}>{index + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sellerName}>{seller.name}</Text>
            <Text style={styles.sellerMeta}>{seller.count} fresh listings • Rating {seller.rating}</Text>
          </View>
          <Ionicons name="star" size={20} color={colors.accent} />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  pill: {
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  pillText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '900'
  },
  hero: {
    borderRadius: 28,
    marginBottom: 16,
    minHeight: 310,
    overflow: 'hidden',
    ...shadow
  },
  heroImage: {
    borderRadius: 28
  },
  heroOverlay: {
    backgroundColor: 'rgba(4, 28, 17, 0.66)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 22
  },
  eyebrow: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    color: '#e8fff1',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    textTransform: 'uppercase'
  },
  heroTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38
  },
  heroText: {
    color: '#d8f5e2',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10
  },
  heroActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 18
  },
  roundButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    width: 52
  },
  guestAuthActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    padding: 12,
    ...shadow
  },
  quickIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  quickLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 8
  },
  panel: {
    padding: 18
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900'
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12
  },
  statBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 12,
    width: '48%'
  },
  statValue: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900'
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3
  },
  categoryRow: {
    gap: 10,
    paddingBottom: 16
  },
  categoryChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  categoryText: {
    color: colors.text,
    fontWeight: '900'
  },
  deliveryCard: {
    alignItems: 'center',
    backgroundColor: '#123c2a',
    borderColor: '#123c2a',
    flexDirection: 'row',
    gap: 14
  },
  deliveryIcon: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    width: 52
  },
  deliveryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900'
  },
  deliveryText: {
    color: '#cfe9d9',
    lineHeight: 20,
    marginTop: 4
  },
  insightsCard: {
    backgroundColor: '#edf4ef',
    borderColor: '#d6e8dc'
  },
  insightsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  insightsIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  insightsTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900'
  },
  insightsText: {
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: 4
  },
  viewAll: {
    color: colors.primary,
    fontWeight: '900'
  },
  carousel: {
    gap: 14,
    paddingBottom: 18
  },
  carouselCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    width: carouselCardWidth,
    ...shadow
  },
  carouselImage: {
    backgroundColor: colors.surfaceMuted,
    height: 175,
    width: '100%'
  },
  carouselBody: {
    padding: 14
  },
  freshBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    marginBottom: 9,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  freshBadgeText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '900'
  },
  carouselTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900'
  },
  carouselMeta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4
  },
  carouselFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12
  },
  carouselPrice: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900'
  },
  addMini: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  promoRow: {
    gap: 12,
    paddingBottom: 16
  },
  promoCard: {
    backgroundColor: '#fff7df',
    borderColor: '#f8d98b',
    borderRadius: 22,
    borderWidth: 1,
    padding: 15,
    width: 235
  },
  promoIcon: {
    alignItems: 'center',
    backgroundColor: colors.warning,
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    marginBottom: 12,
    width: 42
  },
  promoTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900'
  },
  promoText: {
    color: '#7c5d18',
    lineHeight: 19,
    marginTop: 5
  },
  promoValue: {
    color: colors.warning,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 12
  },
  storyCard: {
    alignItems: 'center',
    backgroundColor: '#eaf7ef',
    borderColor: '#cfe8d8',
    flexDirection: 'row',
    gap: 16
  },
  storyEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  storyTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 25,
    marginTop: 6
  },
  storyText: {
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: 8
  },
  storyAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 22,
    height: 58,
    justifyContent: 'center',
    width: 58
  },
  sellerCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10
  },
  sellerRank: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  sellerRankText: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: '900'
  },
  sellerName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900'
  },
  sellerMeta: {
    color: colors.textMuted,
    marginTop: 3
  }
});
