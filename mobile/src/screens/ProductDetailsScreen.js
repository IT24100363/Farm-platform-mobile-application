import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import api, { getApiError } from '../api/api';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import ProductCard from '../components/ProductCard';
import { Button, Card, Screen } from '../components/Screen';
import { useCart } from '../context/CartContext';
import { spacing } from '../theme';

const fallbackImage = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80';

export default function ProductDetailsScreen({ route, navigation }) {
  const { addItem } = useCart();
  const { productId } = route.params || {};
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const productRes = await api.get(`/products/${productId}`);
      const category = productRes.data?.category;
      const [reviewRes, suggestionRes] = await Promise.all([
        api.get(`/reviews/product/${productId}`),
        api.get('/products', { params: category ? { limit: 4, category } : { limit: 4 } })
      ]);
      setProduct(productRes.data);
      setReviews(reviewRes.data || []);
      setSuggestions(
        (suggestionRes.data?.items || [])
          .filter((item) => item._id !== productId)
          .slice(0, 4)
      );
    } catch (err) {
      setError(getApiError(err, 'Could not load product details'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [productId]);

  if (loading) return <Loading />;

  return (
    <Screen title="Product details" refreshing={loading} onRefresh={load}>
      <ErrorMessage message={error} onRetry={load} />
      {!product ? <EmptyState title="Product not found" /> : (
        <>
          <View style={styles.imageWrap}>
            <Image source={{ uri: product.images?.[0] || fallbackImage }} style={styles.image} />
            <View style={styles.stockBadge}>
              <Text numberOfLines={1} style={styles.stockBadgeText}>
                {Number(product.quantity || 0) > 0 ? `${Number(product.quantity || 0)} left` : 'Out of stock'}
              </Text>
            </View>
          </View>
          <Card>
            <Text style={styles.name}>{product.productName}</Text>
            <Text style={styles.meta}>{product.category} by {product.farmerId?.name || 'Farmer'}</Text>
            <Text style={styles.price}>Rs {Number(product.price || 0).toFixed(2)}</Text>
            <Text style={styles.description}>{product.description || 'No description provided.'}</Text>
            <Text style={styles.rating}>Rating {product.averageRating || 0}/5 ({product.ratingCount || reviews.length} reviews)</Text>
            <View style={{ marginTop: 14 }}>
              <Button onPress={() => addItem(product)} title="Add to cart" />
            </View>
          </Card>
          <Text style={styles.sectionTitle}>Customer reviews</Text>
          {reviews.length ? reviews.map((review) => (
            <Card key={review._id}>
              <Text style={styles.reviewTitle}>{review.customerId?.name || 'Customer'} - {review.rating}/5</Text>
              <Text style={styles.description}>{review.comment || 'No comment'}</Text>
              {review.farmerReply ? <Text style={styles.reply}>Reply: {review.farmerReply}</Text> : null}
            </Card>
          )) : <EmptyState title="No reviews yet" />}
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Suggested products</Text>
          {suggestions.length ? (
            <View style={styles.suggestionGrid}>
              {suggestions.map((item) => (
                <View key={item._id} style={styles.suggestionItem}>
                  <ProductCard
                    actionLabel="Add"
                    onAction={() => addItem(item)}
                    onPress={() => navigation.push('ProductDetails', { productId: item._id })}
                    product={item}
                  />
                </View>
              ))}
            </View>
          ) : (
            <EmptyState title="No suggestions yet" message="Related products will appear here soon." />
          )}
          <Button onPress={() => navigation.navigate('Reviews', { productId })} title="Write or manage reviews" variant="secondary" />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    marginBottom: 14,
    position: 'relative'
  },
  image: {
    borderRadius: 8,
    height: 230,
    width: '100%'
  },
  stockBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderRadius: 999,
    bottom: 12,
    left: 12,
    maxWidth: '72%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: 'absolute'
  },
  stockBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800'
  },
  name: {
    color: '#101828',
    fontSize: 24,
    fontWeight: '900'
  },
  meta: {
    color: '#667085',
    marginTop: 4
  },
  price: {
    color: '#166534',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 12
  },
  description: {
    color: '#475467',
    lineHeight: 21,
    marginTop: 10
  },
  rating: {
    color: '#334155',
    fontWeight: '700',
    marginTop: 10
  },
  sectionTitle: {
    color: '#101828',
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 8
  },
  suggestionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: 10
  },
  suggestionItem: {
    width: '48%'
  },
  reviewTitle: {
    color: '#101828',
    fontWeight: '800'
  },
  reply: {
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    color: '#166534',
    marginTop: 10,
    padding: 10
  }
});
