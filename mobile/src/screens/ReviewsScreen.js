import React, { useEffect, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import api, { getApiError } from '../api/api';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import { Button, Card, FieldLabel, Screen } from '../components/Screen';
import { useAuth } from '../context/AuthContext';

export default function ReviewsScreen({ route }) {
  const { user } = useAuth();
  const { productId } = route.params || {};
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const manage = ['admin', 'farmer'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = manage
        ? await api.get('/reviews/manage')
        : await api.get(productId ? `/reviews/product/${productId}` : '/reviews/product/none');
      setReviews(data || []);
    } catch (err) {
      setError(getApiError(err, 'Could not load reviews'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [productId, user?.role]);

  const addReview = async () => {
    try {
      await api.post('/reviews', { productId, rating: Number(rating), comment });
      setComment('');
      await load();
    } catch (err) {
      Alert.alert('Review failed', getApiError(err));
    }
  };

  const sendReply = async (id) => {
    try {
      await api.put(`/reviews/${id}/reply`, { reply });
      setReply('');
      await load();
    } catch (err) {
      Alert.alert('Reply failed', getApiError(err));
    }
  };

  const remove = async (id) => {
    await api.delete(`/reviews/${id}`);
    await load();
  };

  return (
    <Screen title="Reviews" subtitle={manage ? 'Review management' : 'Product feedback'} refreshing={loading} onRefresh={load}>
      <ErrorMessage message={error} onRetry={load} />
      {user?.role === 'customer' && productId ? (
        <Card>
          <Text style={{ color: '#101828', fontSize: 18, fontWeight: '900' }}>Write review</Text>
          <FieldLabel>Rating 1-5</FieldLabel>
          <TextInput keyboardType="numeric" onChangeText={setRating} style={inputStyle} value={rating} />
          <FieldLabel>Comment</FieldLabel>
          <TextInput multiline onChangeText={setComment} style={inputStyle} value={comment} />
          <View style={{ marginTop: 12 }}><Button onPress={addReview} title="Submit review" /></View>
        </Card>
      ) : null}
      {manage ? (
        <Card>
          <FieldLabel>Reply text</FieldLabel>
          <TextInput multiline onChangeText={setReply} placeholder="Write a farmer/admin reply" style={inputStyle} value={reply} />
        </Card>
      ) : null}
      {!reviews.length ? <EmptyState title="No reviews found" /> : null}
      {reviews.map((review) => (
        <Card key={review._id}>
          <Text style={{ color: '#101828', fontSize: 17, fontWeight: '900' }}>
            {review.productId?.productName || 'Product'} - {review.rating}/5
          </Text>
          <Text style={{ color: '#667085', marginTop: 6 }}>{review.customerId?.name || 'Customer'}</Text>
          <Text style={{ color: '#475467', marginTop: 8 }}>{review.comment || 'No comment'}</Text>
          {review.farmerReply ? <Text style={{ color: '#166534', marginTop: 8 }}>Reply: {review.farmerReply}</Text> : null}
          {manage ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}><Button onPress={() => sendReply(review._id)} title="Reply" variant="secondary" /></View>
              {user?.role === 'admin' ? <View style={{ flex: 1 }}><Button onPress={() => remove(review._id)} title="Delete" variant="danger" /></View> : null}
            </View>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const inputStyle = { backgroundColor: '#fff', borderColor: '#d9e2dc', borderRadius: 8, borderWidth: 1, padding: 12 };
