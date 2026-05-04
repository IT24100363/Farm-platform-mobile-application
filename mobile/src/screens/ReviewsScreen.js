import React, { useEffect, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const [editingReviewId, setEditingReviewId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const manage = ['admin', 'farmer'].includes(user?.role);
  const ownReview = reviews.find((review) => String(review.customerId?._id || review.customerId) === String(user?._id));

  const beginEditReview = (review) => {
    setEditingReviewId(review._id);
    setRating(String(review.rating ?? 5));
    setComment(review.comment || '');
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = manage
        ? await api.get('/reviews/manage')
        : await api.get(productId ? `/reviews/product/${productId}` : '/reviews/product/none');
      setReviews(data || []);
      const latestOwnReview = (data || []).find((review) => String(review.customerId?._id || review.customerId) === String(user?._id));
      if (user?.role === 'customer' && latestOwnReview) {
        beginEditReview(latestOwnReview);
      } else if (user?.role === 'customer' && !latestOwnReview) {
        setEditingReviewId('');
        setRating('5');
        setComment('');
      }
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
      const payload = { productId, rating: Number(rating), comment };
      if (editingReviewId) {
        await api.put(`/reviews/${editingReviewId}`, payload);
      } else {
        await api.post('/reviews', payload);
      }
      setComment('');
      setRating('5');
      setEditingReviewId('');
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
    Alert.alert('Delete review?', 'This review will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/reviews/${id}`);
          if (editingReviewId === id) {
            setEditingReviewId('');
            setRating('5');
            setComment('');
          }
          await load();
        }
      }
    ]);
  };

  return (
    <Screen title="Reviews" subtitle={manage ? 'Review management' : 'Product feedback'} refreshing={loading} onRefresh={load}>
      <ErrorMessage message={error} onRetry={load} />
      {user?.role === 'customer' && productId ? (
        <Card>
          <Text style={{ color: '#101828', fontSize: 18, fontWeight: '900' }}>
            {editingReviewId ? 'Edit your review' : 'Write review'}
          </Text>
          {ownReview ? (
            <Text style={{ color: '#667085', marginTop: 4 }}>
              You can update or delete your posted review from the review card below.
            </Text>
          ) : null}
          <FieldLabel>Rating 1-5</FieldLabel>
          <TextInput keyboardType="numeric" onChangeText={setRating} style={inputStyle} value={rating} />
          <FieldLabel>Comment</FieldLabel>
          <TextInput multiline onChangeText={setComment} style={inputStyle} value={comment} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Button onPress={addReview} title={editingReviewId ? 'Update review' : 'Submit review'} />
            </View>
            {editingReviewId ? (
              <View style={{ flex: 1 }}>
                <Button
                  onPress={() => {
                    setEditingReviewId('');
                    setRating('5');
                    setComment('');
                  }}
                  title="Cancel edit"
                  variant="secondary"
                />
              </View>
            ) : null}
          </View>
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
          <View style={styles.reviewHeader}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#101828', fontSize: 17, fontWeight: '900' }}>
                {review.productId?.productName || 'Product'} - {review.rating}/5
              </Text>
              <Text style={{ color: '#667085', marginTop: 6 }}>{review.customerId?.name || 'Customer'}</Text>
            </View>
            {user?.role === 'customer' && String(review.customerId?._id || review.customerId) === String(user?._id) ? (
              <View style={styles.reviewActions}>
                <IconAction
                  accessibilityLabel="Edit review"
                  icon="pencil"
                  onPress={() => beginEditReview(review)}
                />
                <IconAction
                  accessibilityLabel="Delete review"
                  icon="trash"
                  onPress={() => remove(review._id)}
                />
              </View>
            ) : null}
          </View>
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

function IconAction({ accessibilityLabel, icon, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.85} accessibilityLabel={accessibilityLabel} onPress={onPress} style={styles.iconButton}>
      <Ionicons name={icon} size={18} color="#0f5132" />
    </TouchableOpacity>
  );
}

const styles = {
  reviewHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12
  },
  reviewActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#ecfdf3',
    borderColor: '#bde5c8',
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34
  }
};
