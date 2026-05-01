import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import api, { getApiError } from '../api/api';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import { Button, Card, FieldLabel, Screen } from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

const PRODUCT_CATEGORIES = [
  'Fresh Vegetables',
  'Seasonal Fruits',
  'Dairy & Eggs',
  'Organic Staples',
  'Spices',
  'Processed Foods'
];

const emptyPromo = {
  title: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  applicableTo: 'category',
  productId: '',
  category: 'Fresh Vegetables',
  farmerId: '',
  promoCode: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
};

const applicableOptions = [
  { label: 'Category', value: 'category' },
  { label: 'Product', value: 'product' },
  { label: 'Farmer', value: 'farmer' }
];

const discountOptions = [
  { label: 'Percentage', value: 'percentage' },
  { label: 'Fixed', value: 'fixed' }
];

export default function PromotionsScreen() {
  const { user } = useAuth();
  const [publicPromotions, setPublicPromotions] = useState([]);
  const [managedPromotions, setManagedPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [form, setForm] = useState(emptyPromo);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canManage = ['admin', 'farmer'].includes(user?.role);
  const canApprove = user?.role === 'admin';

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const resetForm = () => {
    setForm(emptyPromo);
    setEditingId(null);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const requests = [api.get('/promotions')];
      if (canManage) {
        requests.push(api.get('/promotions/manage'));
        if (user?.role === 'admin') {
          requests.push(
            api.get('/products/admin/all', { params: { limit: 300 } }),
            api.get('/users', { params: { role: 'farmer', limit: 300, active: 'true' } })
          );
        } else {
          requests.push(api.get('/products/farmer/my'));
        }
      }

      const results = await Promise.all(requests);
      setPublicPromotions(results[0].data || []);

      if (canManage) {
        setManagedPromotions(results[1].data || []);
        if (user?.role === 'admin') {
          setProducts(results[2].data?.items || []);
          setFarmers(results[3].data?.items || []);
        } else {
          setProducts(results[2].data || []);
          setFarmers([{ _id: user._id, name: user.name, email: user.email }]);
        }
      }
    } catch (err) {
      setError(getApiError(err, 'Could not load promotions'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.role]);

  const submit = async () => {
    try {
      const payload = {
        ...form,
        discountValue: Number(form.discountValue),
        title: form.title.trim(),
        description: form.description.trim(),
        promoCode: form.promoCode.trim(),
        productId: form.productId.trim(),
        category: form.category.trim(),
        farmerId: form.farmerId.trim()
      };

      ['productId', 'category', 'farmerId', 'promoCode'].forEach((key) => {
        if (!payload[key]) delete payload[key];
      });

      if (editingId) {
        await api.put(`/promotions/${editingId}`, payload);
      } else {
        await api.post('/promotions', payload);
      }
      resetForm();
      await load();
    } catch (err) {
      Alert.alert('Promotion failed', getApiError(err));
    }
  };

  const editPromotion = (promo) => {
    setEditingId(promo._id);
    setForm({
      title: promo.title || '',
      description: promo.description || '',
      discountType: promo.discountType || 'percentage',
      discountValue: String(promo.discountValue ?? ''),
      applicableTo: promo.applicableTo || 'category',
      productId: promo.productId?._id || promo.productId || '',
      category: promo.category || 'Fresh Vegetables',
      farmerId: promo.farmerId?._id || promo.farmerId || '',
      promoCode: promo.promoCode || '',
      startDate: promo.startDate?.slice(0, 10) || emptyPromo.startDate,
      endDate: promo.endDate?.slice(0, 10) || emptyPromo.endDate
    });
  };

  const toggle = async (id) => {
    await api.patch(`/promotions/${id}/toggle`);
    await load();
  };

  const approve = async (id, approved) => {
    await api.patch(`/promotions/${id}/approve`, { approved, activate: approved });
    await load();
  };

  const remove = async (id) => {
    await api.delete(`/promotions/${id}`);
    await load();
  };

  const productOptions = useMemo(() => {
    if (user?.role === 'admin') return products;
    return products.filter((product) => (product.farmerId?._id || product.farmerId)?.toString() === user?._id?.toString());
  }, [products, user]);

  return (
    <Screen title="Promotions" subtitle={canManage ? 'Create and manage discounts' : 'Available offers'} refreshing={loading} onRefresh={load}>
      <ErrorMessage message={error} onRetry={load} />

      {canManage ? (
        <Card>
          <Text style={styles.sectionTitle}>{editingId ? 'Edit promotion' : 'New promotion'}</Text>
          <FieldLabel>Title</FieldLabel>
          <TextInput onChangeText={(value) => setField('title', value)} style={inputStyle} value={form.title} />

          <FieldLabel>Description</FieldLabel>
          <TextInput multiline onChangeText={(value) => setField('description', value)} style={inputStyle} value={form.description} />

          <FieldLabel>Discount type</FieldLabel>
          <View style={styles.pillRow}>
            {discountOptions.map((option) => (
              <TogglePill
                key={option.value}
                active={form.discountType === option.value}
                label={option.label}
                onPress={() => setField('discountType', option.value)}
              />
            ))}
          </View>

          <FieldLabel>Discount value</FieldLabel>
          <TextInput keyboardType="numeric" onChangeText={(value) => setField('discountValue', value)} style={inputStyle} value={form.discountValue} />

          <FieldLabel>Applies to</FieldLabel>
          <View style={styles.pillRow}>
            {applicableOptions.map((option) => (
              <TogglePill
                key={option.value}
                active={form.applicableTo === option.value}
                label={option.label}
                onPress={() => setField('applicableTo', option.value)}
              />
            ))}
          </View>

          {form.applicableTo === 'product' ? (
            <>
              <FieldLabel>Product</FieldLabel>
              <TextInput
                onChangeText={(value) => setField('productId', value)}
                placeholder="Enter product ID or keep empty for admin selection"
                style={inputStyle}
                value={form.productId}
              />
              {!form.productId && productOptions.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectRow}>
                  {productOptions.map((product) => (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      key={product._id}
                      onPress={() => setField('productId', product._id)}
                      style={styles.selectChip}
                    >
                      <Text style={styles.selectText}>{product.productName}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}
            </>
          ) : null}

          {form.applicableTo === 'category' ? (
            <>
              <FieldLabel>Category</FieldLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectRow}>
                {PRODUCT_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    key={category}
                    onPress={() => setField('category', category)}
                    style={[styles.selectChip, form.category === category && styles.selectChipActive]}
                  >
                    <Text style={[styles.selectText, form.category === category && styles.selectTextActive]}>{category}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}

          {form.applicableTo === 'farmer' ? (
            <>
              <FieldLabel>Farmer</FieldLabel>
              <TextInput
                onChangeText={(value) => setField('farmerId', value)}
                placeholder="Enter farmer ID"
                style={inputStyle}
                value={form.farmerId}
              />
              {farmers.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectRow}>
                  {farmers.map((farmer) => (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      key={farmer._id}
                      onPress={() => setField('farmerId', farmer._id)}
                      style={styles.selectChip}
                    >
                      <Text style={styles.selectText}>{farmer.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}
            </>
          ) : null}

          <FieldLabel>Promo code</FieldLabel>
          <TextInput autoCapitalize="characters" onChangeText={(value) => setField('promoCode', value)} style={inputStyle} value={form.promoCode} />

          <FieldLabel>Start date</FieldLabel>
          <TextInput onChangeText={(value) => setField('startDate', value)} style={inputStyle} value={form.startDate} />

          <FieldLabel>End date</FieldLabel>
          <TextInput onChangeText={(value) => setField('endDate', value)} style={inputStyle} value={form.endDate} />

          <View style={{ gap: 10, marginTop: 12 }}>
            <Button onPress={submit} title={editingId ? 'Update promotion' : 'Create promotion'} />
            {editingId ? <Button onPress={resetForm} title="Cancel edit" variant="secondary" /> : null}
          </View>
        </Card>
      ) : null}

      <Text style={styles.sectionTitle}>Active promotions</Text>
      {!publicPromotions.length ? <EmptyState title="No promotions available" /> : null}
      {publicPromotions.map((promo) => (
        <Card key={promo._id}>
          <Text style={styles.promoTitle}>{promo.title}</Text>
          <Text style={styles.promoText}>{promo.description || 'No description'}</Text>
          <Text style={styles.promoMeta}>{promo.discountType} - {promo.discountValue}</Text>
          <Text style={styles.promoMeta}>{promo.isActive ? 'Active' : 'Inactive'} - {promo.isApproved ? 'Approved' : 'Pending approval'}</Text>
        </Card>
      ))}

      {canManage ? (
        <>
          <Text style={styles.sectionTitle}>My promotions</Text>
          {!managedPromotions.length ? <EmptyState title="No managed promotions yet" /> : null}
          {managedPromotions.map((promo) => (
            <Card key={promo._id}>
              <View style={styles.rowSpace}>
                <Text style={styles.promoTitle}>{promo.title}</Text>
                <View style={[styles.statusPill, promo.isApproved ? styles.statusPillActive : styles.statusPillPending]}>
                  <Text style={styles.statusPillText}>{promo.isApproved ? 'Approved' : 'Pending'}</Text>
                </View>
              </View>
              <Text style={styles.promoText}>{promo.description || 'No description'}</Text>
              <Text style={styles.promoMeta}>{promo.applicableTo} - {promo.discountType} {promo.discountValue}</Text>
              <Text style={styles.promoMeta}>Live now: {promo.isLiveNow ? 'Yes' : 'No'} - Active: {promo.isActive ? 'Yes' : 'No'}</Text>
              <View style={styles.actionRow}>
                <Button onPress={() => editPromotion(promo)} title="Edit" variant="secondary" />
                <Button onPress={() => toggle(promo._id)} title={promo.isActive ? 'Disable' : 'Enable'} variant="secondary" />
                {canApprove && !promo.isApproved ? <Button onPress={() => approve(promo._id, true)} title="Approve" /> : null}
                {canApprove && promo.isApproved ? <Button onPress={() => approve(promo._id, false)} title="Reject" variant="secondary" /> : null}
                <Button onPress={() => remove(promo._id)} title="Delete" variant="danger" />
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function TogglePill({ label, active, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const inputStyle = {
  backgroundColor: '#fff',
  borderColor: '#d9e2dc',
  borderRadius: 8,
  borderWidth: 1,
  marginBottom: 14,
  padding: 12
};

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 4
  },
  promoTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900'
  },
  promoText: {
    color: colors.textMuted,
    marginTop: 6
  },
  promoMeta: {
    color: '#475467',
    marginTop: 6
  },
  rowSpace: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14
  },
  pill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  pillActive: {
    backgroundColor: colors.primary
  },
  pillText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800'
  },
  pillTextActive: {
    color: '#fff'
  },
  selectRow: {
    gap: 8,
    paddingBottom: 6
  },
  selectChip: {
    backgroundColor: '#fff',
    borderColor: '#d9e2dc',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  selectChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  selectText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800'
  },
  selectTextActive: {
    color: '#fff'
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  statusPillActive: {
    backgroundColor: colors.primarySoft
  },
  statusPillPending: {
    backgroundColor: '#fff7df'
  },
  statusPillText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '900'
  }
});
