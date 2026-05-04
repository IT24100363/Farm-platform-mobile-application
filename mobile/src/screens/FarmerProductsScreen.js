import React, { useEffect, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import api, { getApiError } from '../api/api';
import CategoryDropdown from '../components/CategoryDropdown';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import { Button, Card, FieldLabel, Screen } from '../components/Screen';
import { PRODUCT_CATEGORIES } from '../constants/productCategories';
import { uploadProductImageFromDevice } from '../utils/productImageUpload';

const emptyProduct = { productName: '', category: 'Fresh Vegetables', description: '', price: '', quantity: '', images: '' };

export default function FarmerProductsScreen() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/products/farmer/my');
      setProducts(data || []);
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
      if (editingId) await api.put(`/products/${editingId}`, payload);
      else await api.post('/products', payload);
      setForm(emptyProduct);
      setEditingId(null);
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
      images: (product.images || []).join(', ')
    });
  };

  const remove = async (id) => {
    await api.delete(`/products/${id}`);
    await load();
  };

  return (
    <Screen title="My products" refreshing={loading} onRefresh={load}>
      <ErrorMessage message={error} onRetry={load} />
      <Card>
        <Text style={{ color: '#101828', fontSize: 18, fontWeight: '900' }}>{editingId ? 'Edit product' : 'Add product'}</Text>
        <FieldLabel>Name</FieldLabel>
        <TextInput onChangeText={(value) => setField('productName', value)} style={inputStyle} value={form.productName} />
        <CategoryDropdown label="Category" onChange={(value) => setField('category', value)} options={PRODUCT_CATEGORIES} value={form.category} />
        <FieldLabel>Description</FieldLabel>
        <TextInput multiline onChangeText={(value) => setField('description', value)} style={inputStyle} value={form.description} />
        <FieldLabel>Price</FieldLabel>
        <TextInput keyboardType="numeric" onChangeText={(value) => setField('price', value)} style={inputStyle} value={form.price} />
        <FieldLabel>Quantity</FieldLabel>
        <TextInput keyboardType="numeric" onChangeText={(value) => setField('quantity', value)} style={inputStyle} value={form.quantity} />
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
          {editingId ? <Button onPress={() => { setEditingId(null); setForm(emptyProduct); }} title="Cancel edit" variant="secondary" /> : null}
        </View>
      </Card>
      {!products.length ? <EmptyState title="No products created" /> : null}
      {products.map((product) => (
        <Card key={product._id}>
          <Text style={{ color: '#101828', fontSize: 17, fontWeight: '900' }}>{product.productName}</Text>
          <Text style={{ color: '#667085', marginTop: 5 }}>{product.category} - Qty {product.quantity}</Text>
          <Text style={{ color: '#166534', fontWeight: '900', marginTop: 8 }}>Rs {Number(product.price || 0).toFixed(2)}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}><Button onPress={() => edit(product)} title="Edit" variant="secondary" /></View>
            <View style={{ flex: 1 }}><Button onPress={() => remove(product._id)} title="Delete" variant="danger" /></View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const inputStyle = { backgroundColor: '#fff', borderColor: '#d9e2dc', borderRadius: 8, borderWidth: 1, padding: 12 };
const helperStyle = { color: '#667085', fontSize: 12 };
