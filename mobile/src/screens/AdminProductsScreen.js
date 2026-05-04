import React, { useEffect, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import api, { getApiError } from '../api/api';
import CategoryDropdown from '../components/CategoryDropdown';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import { Button, Card, FieldLabel, Screen } from '../components/Screen';
import { PRODUCT_CATEGORIES } from '../constants/productCategories';
import { uploadProductImageFromDevice } from '../utils/productImageUpload';

const emptyProduct = {
  productName: '',
  category: 'Fresh Vegetables',
  description: '',
  price: '',
  quantity: '',
  images: '',
  farmerId: ''
};

export default function AdminProductsScreen() {
  const [products, setProducts] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [productsRes, farmersRes] = await Promise.all([
        api.get('/products/admin/all', { params: { search, limit: 50 } }),
        api.get('/users', { params: { role: 'farmer', limit: 200, active: 'true', approved: 'true' } })
      ]);
      setProducts(productsRes.data.items || []);
      setFarmers(farmersRes.data.items || []);
    } catch (err) {
      setError(getApiError(err, 'Could not load products'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const appendImage = (url) => {
    if (!url) return;
    setForm((current) => ({
      ...current,
      images: current.images ? `${current.images}, ${url}` : url
    }));
  };

  const resetForm = () => {
    setForm(emptyProduct);
    setEditingId(null);
  };

  const addImageFromDevice = async () => {
    try {
      setUploadingImage(true);
      const uploadedUrl = await uploadProductImageFromDevice();
      appendImage(uploadedUrl);
    } finally {
      setUploadingImage(false);
    }
  };

  const submit = async () => {
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        quantity: Number(form.quantity),
        images: form.images ? form.images.split(',').map((item) => item.trim()).filter(Boolean) : []
      };
      if (!payload.farmerId) delete payload.farmerId;
      if (editingId) {
        await api.put(`/products/admin/${editingId}`, payload);
      } else {
        await api.post('/products/admin', payload);
      }
      resetForm();
      await load();
    } catch (err) {
      Alert.alert('Product save failed', getApiError(err));
    }
  };

  const edit = (product) => {
    setEditingId(product._id);
    setForm({
      productName: product.productName || '',
      category: product.category || 'Fresh Vegetables',
      description: product.description || '',
      price: String(product.price ?? ''),
      quantity: String(product.quantity ?? ''),
      images: (product.images || []).join(', '),
      farmerId: product.farmerId?._id || product.farmerId || ''
    });
  };

  const toggle = async (id) => {
    await api.patch(`/products/${id}/toggle`);
    await load();
  };

  const remove = async (id) => {
    await api.delete(`/products/admin/${id}`);
    await load();
  };

  return (
    <Screen title="Admin products" refreshing={loading} onRefresh={load}>
      <TextInput onChangeText={setSearch} onSubmitEditing={load} placeholder="Search products" style={inputStyle} value={search} />
      <ErrorMessage message={error} onRetry={load} />
      <Card>
        <Text style={titleStyle}>{editingId ? 'Edit product' : 'Add product'}</Text>
        <FieldLabel>Name</FieldLabel>
        <TextInput onChangeText={(value) => setField('productName', value)} style={inputStyle} value={form.productName} />
        <CategoryDropdown label="Category" onChange={(value) => setField('category', value)} options={PRODUCT_CATEGORIES} value={form.category} />
        <FieldLabel>Description</FieldLabel>
        <TextInput multiline onChangeText={(value) => setField('description', value)} style={inputStyle} value={form.description} />
        <FieldLabel>Price</FieldLabel>
        <TextInput keyboardType="numeric" onChangeText={(value) => setField('price', value)} style={inputStyle} value={form.price} />
        <FieldLabel>Quantity</FieldLabel>
        <TextInput keyboardType="numeric" onChangeText={(value) => setField('quantity', value)} style={inputStyle} value={form.quantity} />
        <FieldLabel>Farmer</FieldLabel>
        <TextInput
          onChangeText={(value) => setField('farmerId', value)}
          placeholder="Assign farmer ID or leave blank"
          style={inputStyle}
          value={form.farmerId}
        />
        <FieldLabel>Images</FieldLabel>
        <View style={{ gap: 10, marginBottom: 10 }}>
          <Button
            icon="cloud-upload-outline"
            onPress={addImageFromDevice}
            title={uploadingImage ? 'Uploading image...' : 'Upload from device'}
            variant="secondary"
            disabled={uploadingImage}
          />
          <Text style={helperStyle}>Or paste one or more image URLs below, separated by commas.</Text>
        </View>
        <TextInput onChangeText={(value) => setField('images', value)} style={inputStyle} value={form.images} />
        <View style={{ gap: 10, marginTop: 12 }}>
          <Button onPress={submit} title={editingId ? 'Update product' : 'Create product'} />
          {editingId ? <Button onPress={resetForm} title="Cancel edit" variant="secondary" /> : null}
        </View>
        <Text style={helperStyle}>Admin can create products for any approved farmer, or leave farmer blank to assign later.</Text>
      </Card>
      {!products.length ? <EmptyState title="No products found" /> : null}
      {products.map((product) => (
        <Card key={product._id}>
          <Text style={{ color: '#101828', fontSize: 17, fontWeight: '900' }}>{product.productName}</Text>
          <Text style={{ color: '#667085', marginTop: 5 }}>{product.category} - {product.farmerId?.name || 'Farmer'}</Text>
          <Text style={{ color: product.isAvailable ? '#166534' : '#be123c', marginTop: 6 }}>{product.isAvailable ? 'Available' : 'Unavailable'}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}><Button onPress={() => toggle(product._id)} title="Toggle" variant="secondary" /></View>
            <View style={{ flex: 1 }}><Button onPress={() => edit(product)} title="Edit" variant="secondary" /></View>
            <View style={{ flex: 1 }}><Button onPress={() => remove(product._id)} title="Delete" variant="danger" /></View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const inputStyle = { backgroundColor: '#fff', borderColor: '#d9e2dc', borderRadius: 8, borderWidth: 1, marginBottom: 14, padding: 12 };
const titleStyle = { color: '#101828', fontSize: 18, fontWeight: '900' };
const helperStyle = { color: '#667085', fontSize: 12, marginTop: 8 };
