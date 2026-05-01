import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../theme';

const fallbackImage = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80';

export default function ProductCard({ product, onPress, actionLabel, onAction }) {
  const price = Number(product?.price || 0).toFixed(2);
  const image = product?.images?.[0] || fallbackImage;
  const stockLabel = Number(product?.quantity || 0) > 0 ? `${product?.quantity ?? 0} left` : 'Out of stock';

  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={styles.card}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: image }} style={styles.image} />
        {product?.discountBadge ? <Text style={styles.badge}>{product.discountBadge}</Text> : null}
        <View style={styles.stockBadge}>
          <Text numberOfLines={1} style={styles.stockBadgeText}>{stockLabel}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.topContent}>
          <Text numberOfLines={1} style={styles.name}>{product?.productName || 'Farm product'}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="leaf-outline" size={15} color={colors.primary} />
            <Text numberOfLines={1} style={styles.meta}>{product?.category || 'Farm product'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.price}>Rs {price}</Text>
          </View>
        </View>
        <View style={styles.bottomContent}>
          {actionLabel ? (
            <TouchableOpacity activeOpacity={0.9} onPress={onAction} style={styles.action}>
              <Ionicons name="cart-outline" size={18} color="#fff" />
              <Text style={styles.actionText}>{actionLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 288,
    overflow: 'hidden',
    width: '100%',
    ...shadow
  },
  imageWrap: {
    position: 'relative'
  },
  image: {
    backgroundColor: colors.surfaceMuted,
    height: 130,
    width: '100%'
  },
  body: {
    padding: 12
  },
  topContent: {
    gap: 0
  },
  bottomContent: {
    marginTop: 8
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900'
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 5
  },
  meta: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 12
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6
  },
  price: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900'
  },
  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
    right: 10,
    top: 10
  },
  stockBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderRadius: 999,
    bottom: 10,
    left: 10,
    maxWidth: '72%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute'
  },
  stockBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800'
  },
  action: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 42,
    marginTop: 0,
    paddingVertical: 10
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800'
  }
});
