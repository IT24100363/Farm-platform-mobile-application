import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { getApiError } from '../api/api';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import ProductCard from '../components/ProductCard';
import { Screen } from '../components/Screen';
import { useCart } from '../context/CartContext';
import { colors, radius, spacing } from '../theme';

const DEFAULT_CATEGORIES = [
  'Fresh Vegetables',
  'Seasonal Fruits',
  'Dairy & Eggs',
  'Organic Staples',
  'Spices',
  'Processed Foods'
];

export default function ProductListScreen({ navigation }) {
  const { addItem } = useCart();
  const hasLoadedInitialData = useRef(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async ({ preserveError = false } = {}) => {
    setLoading(true);
    if (!preserveError) setError('');
    try {
      const params = { limit: 30 };
      if (search.trim()) params.search = search.trim();
      if (selectedCategory) params.category = selectedCategory;

      const [productsRes, categoriesRes] = await Promise.allSettled([
        api.get('/products', { params }),
        api.get('/products/categories')
      ]);

      if (productsRes.status !== 'fulfilled') {
        throw productsRes.reason;
      }

      setProducts(productsRes.value.data.items || []);

      if (categoriesRes.status === 'fulfilled') {
        const nextCategories = Array.isArray(categoriesRes.value.data) && categoriesRes.value.data.length
          ? categoriesRes.value.data
          : DEFAULT_CATEGORIES;
        setCategories(nextCategories);
      }
    } catch (err) {
      setError(getApiError(err, 'Could not load products'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    hasLoadedInitialData.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedInitialData.current) return undefined;

    const timer = setTimeout(() => {
      load({ preserveError: true });
    }, 250);

    return () => clearTimeout(timer);
  }, [search, selectedCategory]);

  return (
    <Screen title="Products" subtitle="Search and buy directly from farmers" refreshing={loading} onRefresh={load}>
      <View style={styles.search}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          onChangeText={setSearch}
          onSubmitEditing={load}
          placeholder="Search products, category, description"
          placeholderTextColor="#91a09a"
          style={styles.searchInput}
          value={search}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelectedCategory('')}
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
        >
          <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((category) => {
          const active = selectedCategory === category;
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
            >
              <Text numberOfLines={1} style={[styles.categoryText, active && styles.categoryTextActive]}>
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ErrorMessage message={error} onRetry={load} />
      {products.length ? (
        <View style={styles.grid}>
          {products.map((product) => (
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
      ) : <EmptyState icon="search-outline" title="No matching products" />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 14
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14
  },
  categoryRow: {
    gap: 10,
    paddingBottom: 14,
    paddingRight: 4
  },
  categoryChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  categoryText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800'
  },
  categoryTextActive: {
    color: '#fff'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.sm
  },
  gridItem: {
    width: '48%'
  }
});
