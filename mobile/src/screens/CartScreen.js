import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import api, { getApiError } from '../api/api';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import ProductCard from '../components/ProductCard';
import { Button, Card, Screen } from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { spacing } from '../theme';

export default function CartScreen({ navigation }) {
  const { isAuthenticated } = useAuth();
  const { items, total, updateQuantity, removeItem, addItem } = useCart();
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionError, setSuggestionError] = useState('');
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const loadSuggestions = async () => {
    setLoadingSuggestions(true);
    setSuggestionError('');
    try {
      const { data } = await api.get('/products', { params: { limit: 4, sort: 'newest' } });
      setSuggestions(data.items || []);
    } catch (err) {
      setSuggestionError(getApiError(err, 'Could not load suggestions'));
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (!items.length) {
      loadSuggestions();
    }
  }, [items.length]);

  return (
    <Screen
      title="Cart"
      subtitle={isAuthenticated ? 'Cart items must belong to one farmer per checkout' : 'Guests can build a cart, but login is required for checkout'}
    >
      {!items.length ? (
        <>
          <EmptyState icon="cart-outline" title="Your cart is empty" message="Add products from the marketplace." />
          <Card>
            <Button icon="basket-outline" onPress={() => navigation.navigate('Products')} title="Shop More" />
          </Card>
          <View style={{ marginBottom: spacing.sm }}>
            <Text style={{ color: '#101828', fontSize: 19, fontWeight: '900' }}>Suggested for you</Text>
            <Text style={{ color: '#667085', marginTop: 4 }}>A few fresh picks to help you keep shopping.</Text>
          </View>
          <ErrorMessage message={suggestionError} onRetry={loadSuggestions} />
          {suggestions.length ? (
            <View style={styles.grid}>
              {suggestions.map((product) => (
                <View key={product._id} style={styles.gridItem}>
                  <ProductCard
                    actionLabel="Add"
                    onAction={() => addItem(product)}
                    onPress={() => navigation.navigate('ProductDetails', { productId: product._id })}
                    product={product}
                  />
                </View>
              ))}
            </View>
          ) : null}
          {!loadingSuggestions && !suggestions.length && !suggestionError ? (
            <EmptyState icon="leaf-outline" title="No suggestions right now" message="Fresh recommendations will appear here soon." />
          ) : null}
        </>
      ) : null}
      {items.map((item) => (
        <Card key={item.productId}>
          <Text style={{ color: '#101828', fontSize: 17, fontWeight: '900' }}>{item.product.productName}</Text>
          <Text style={{ color: '#667085', marginTop: 4 }}>Rs {Number(item.product.price || 0).toFixed(2)} each</Text>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Button onPress={() => updateQuantity(item.productId, item.quantity - 1)} title="-" variant="secondary" />
            <Text style={{ color: '#101828', fontWeight: '900' }}>{item.quantity}</Text>
            <Button onPress={() => updateQuantity(item.productId, item.quantity + 1)} title="+" variant="secondary" />
            <View style={{ flex: 1 }} />
            <Button onPress={() => removeItem(item.productId)} title="Remove" variant="danger" />
          </View>
        </Card>
      ))}
      {items.length ? (
        <Card>
          <Text style={{ color: '#101828', fontSize: 20, fontWeight: '900' }}>Total: Rs {total.toFixed(2)}</Text>
          <View style={{ marginTop: 14 }}>
            <Button
              icon={isAuthenticated ? 'card-outline' : 'lock-closed-outline'}
              onPress={() => navigation.navigate('Checkout')}
              title={isAuthenticated ? 'Checkout' : 'Login to checkout'}
            />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = {
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.sm
  },
  gridItem: {
    width: '48%'
  }
};
