import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import api, { getApiError } from '../api/api';
import ErrorMessage from '../components/ErrorMessage';
import LocationPickerMap from '../components/LocationPickerMap';
import { Button, Card, FieldLabel, Screen } from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const toLocation = (place, source = 'search') => ({
  label: place?.name || place?.display_name || 'Selected location',
  address: place?.display_name || place?.address || '',
  latitude: Number(place?.lat ?? place?.latitude),
  longitude: Number(place?.lon ?? place?.longitude),
  source
});

async function searchLocations(query) {
  const { data } = await api.get('/geo/search', { params: { q: query, limit: 5 } });
  return data;
}

async function reverseLocation(latitude, longitude) {
  const { data } = await api.get('/geo/reverse', { params: { lat: latitude, lon: longitude } });
  return data;
}

export default function CheckoutScreen({ navigation }) {
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const [address, setAddress] = useState(user?.address || '');
  const [promoCode, setPromoCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [preview, setPreview] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState(user?.address || '');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTouched, setSearchTouched] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');

  const payloadItems = items.map((item) => ({ productId: item.productId, quantity: item.quantity }));

  const loadPreview = async () => {
    if (!items.length) return;
    setError('');
    try {
      const { data } = await api.post('/orders/preview', { items: payloadItems, promoCode: promoCode || undefined });
      setPreview(data);
    } catch (err) {
      setError(getApiError(err, 'Could not preview checkout'));
    }
  };

  useEffect(() => {
    loadPreview();
  }, [items.length]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query || query.length < 3) {
      setSearchResults([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      setSearchLoading(true);
      searchLocations(query)
        .then((results) => {
          setSearchResults(results || []);
          setSearchTouched(true);
        })
        .catch((err) => {
          setError(getApiError(err, 'Could not search for that location'));
        })
        .finally(() => {
          setSearchLoading(false);
        });
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const applyPlace = (place, source = 'search') => {
    const nextLocation = toLocation(place, source);
    if (!Number.isFinite(nextLocation.latitude) || !Number.isFinite(nextLocation.longitude)) return;
    setSelectedLocation(nextLocation);
    if (nextLocation.address) {
      setAddress(nextLocation.address);
      setSearchQuery(nextLocation.address);
    }
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;
    setSearchLoading(true);
    setError('');
    try {
      const results = await searchLocations(query);
      setSearchResults(results || []);
      setSearchTouched(true);
    } catch (err) {
      setError(getApiError(err, 'Could not search for that location'));
    } finally {
      setSearchLoading(false);
    }
  };

  const handleMapTap = async ({ latitude, longitude }) => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    setSearchLoading(true);
    setError('');
    try {
      const place = await reverseLocation(latitude, longitude);
      const nextLocation = {
        label: place?.name || place?.display_name || 'Selected point',
        address: place?.display_name || `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`,
        latitude,
        longitude,
        source: 'map'
      };
      setSelectedLocation(nextLocation);
      setAddress(nextLocation.address);
      setSearchQuery(nextLocation.address);
      setSearchResults([]);
    } catch (err) {
      const fallback = {
        label: 'Selected point',
        address: `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`,
        latitude,
        longitude,
        source: 'map'
      };
      setSelectedLocation(fallback);
      setAddress(fallback.address);
      setSearchQuery(fallback.address);
      setSearchResults([]);
      setError(getApiError(err, 'Location selected, but address lookup failed.'));
    } finally {
      setSearchLoading(false);
    }
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const demoPayment = {
        mode: 'CARD',
        cardNumber: '4242424242424242',
        cardName: user?.name || 'Demo Customer',
        expiry: '12/30',
        cvv: '123'
      };

      const trimmedAddress = address.trim();
      const { data } = await api.post('/orders', {
        items: payloadItems,
        address: trimmedAddress,
        deliveryLocation: selectedLocation
          ? {
              label: selectedLocation.label,
              address: trimmedAddress || selectedLocation.address,
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
              source: selectedLocation.source
            }
          : undefined,
        promoCode: promoCode || undefined,
        paymentMethod,
        demoPayment: paymentMethod === 'ONLINE' ? demoPayment : undefined
      });
      clearCart();
      setPlacedOrderId(data.order?._id || data._id || '');
      setSuccessVisible(true);
    } catch (err) {
      setError(getApiError(err, 'Checkout failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Checkout" subtitle="Preview discounts, tax, delivery, and payment">
      <ErrorMessage message={error} onRetry={loadPreview} />

      <FieldLabel>Delivery address</FieldLabel>
      <TextInput
        multiline
        onChangeText={setAddress}
        placeholder="Address"
        style={inputStyle}
        value={address}
      />

      <FieldLabel>Search address or location</FieldLabel>
      <View style={styles.searchRow}>
        <TextInput
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          placeholder="Search on the map"
          style={[inputStyle, styles.searchInput]}
          value={searchQuery}
        />
        <TouchableOpacity activeOpacity={0.88} disabled={searchLoading} onPress={handleSearch} style={styles.searchButton}>
          {searchLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchButtonText}>Search</Text>}
        </TouchableOpacity>
      </View>

      {searchResults.length && searchTouched ? (
        <Card>
          <Text style={styles.sectionTitle}>Search results</Text>
          <Text style={styles.sectionSubtitle}>Tap a result to focus the map and save it for delivery.</Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            {searchResults.map((result, index) => (
              <TouchableOpacity
                activeOpacity={0.88}
                key={`${result.place_id || index}`}
                onPress={() => applyPlace(result, 'search')}
                style={[
                  styles.resultRow,
                  selectedLocation?.address === result.display_name && styles.resultRowActive
                ]}
              >
                <View style={styles.resultDot} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={2} style={styles.resultTitle}>
                    {result.display_name}
                  </Text>
                  <Text style={styles.resultMeta}>
                    {Number(result.lat).toFixed(5)}, {Number(result.lon).toFixed(5)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      ) : null}

      <Card>
        <View style={styles.mapHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Choose on map</Text>
            <Text style={styles.sectionSubtitle}>Tap anywhere on the map to set a delivery point.</Text>
          </View>
          {searchLoading ? <ActivityIndicator color="#208354" /> : null}
        </View>
        <View style={styles.mapWrap}>
          <LocationPickerMap
            onReady={() => {}}
            onTap={handleMapTap}
            selectedLocation={selectedLocation}
            height={320}
          />
        </View>
        {selectedLocation ? (
          <View style={styles.selectedBox}>
            <Text style={styles.selectedLabel}>Selected location</Text>
            <Text style={styles.selectedAddress}>{selectedLocation.address}</Text>
            <Text style={styles.selectedMeta}>
              {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
            </Text>
          </View>
        ) : (
          <Text style={styles.helperText}>Search a location or tap on the map to save the delivery point.</Text>
        )}
      </Card>

      <FieldLabel>Promo code</FieldLabel>
      <TextInput
        autoCapitalize="characters"
        onChangeText={setPromoCode}
        onSubmitEditing={loadPreview}
        placeholder="Optional promo code"
        style={inputStyle}
        value={promoCode}
      />

      <View style={{ flexDirection: 'row', gap: 10, marginVertical: 12 }}>
        <View style={{ flex: 1 }}>
          <Button onPress={() => setPaymentMethod('COD')} title="COD" variant={paymentMethod === 'COD' ? 'primary' : 'secondary'} />
        </View>
        <View style={{ flex: 1 }}>
          <Button onPress={() => setPaymentMethod('ONLINE')} title="Online demo" variant={paymentMethod === 'ONLINE' ? 'primary' : 'secondary'} />
        </View>
      </View>

      <Button onPress={loadPreview} title="Refresh preview" variant="secondary" />

      <Card>
        <Text style={{ color: '#101828', fontSize: 18, fontWeight: '900' }}>Summary</Text>
        {(preview?.lineItems || []).map((line) => (
          <Text key={line.productId} style={{ color: '#475467', marginTop: 8 }}>
            {line.productName} x {line.quantity}: Rs {Number(line.lineTotal || 0).toFixed(2)}
          </Text>
        ))}
        <Text style={{ color: '#101828', fontSize: 20, fontWeight: '900', marginTop: 12 }}>
          Total: Rs {Number(preview?.summary?.totalAmount || 0).toFixed(2)}
        </Text>
        <Text style={{ color: '#667085', marginTop: 4 }}>Discount: Rs {Number(preview?.summary?.discountTotal || 0).toFixed(2)}</Text>
      </Card>

      <Button disabled={loading || !items.length} onPress={submit} title={loading ? 'Placing order...' : 'Place order'} />

      <Modal animationType="fade" transparent visible={successVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Text style={styles.modalIcon}>✓</Text>
            </View>
            <Text style={styles.modalTitle}>Order placed successfully</Text>
            <Text style={styles.modalText}>
              Your order has been created and is now being processed. We’ve saved your selected delivery location.
            </Text>
            {placedOrderId ? <Text style={styles.modalMeta}>Order ID: #{String(placedOrderId).slice(-6)}</Text> : null}
            <View style={styles.modalActions}>
              <View style={{ flex: 1 }}>
                <Button
                  onPress={() => {
                    setSuccessVisible(false);
                    if (placedOrderId) {
                      navigation.replace('OrderDetails', { orderId: placedOrderId });
                    }
                  }}
                  title="View order"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  onPress={() => {
                    setSuccessVisible(false);
                    navigation.navigate('CustomerTabs', { screen: 'Home' });
                  }}
                  title="Go to Homepage"
                  variant="secondary"
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const inputStyle = {
  backgroundColor: '#fff',
  borderColor: '#d9e2dc',
  borderRadius: 8,
  borderWidth: 1,
  minHeight: 48,
  padding: 12
};

const styles = {
  searchRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12
  },
  searchInput: {
    flex: 1,
    marginBottom: 0
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: '#208354',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    minWidth: 92,
    paddingHorizontal: 14
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900'
  },
  sectionTitle: {
    color: '#101828',
    fontSize: 17,
    fontWeight: '900'
  },
  sectionSubtitle: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4
  },
  resultRow: {
    alignItems: 'flex-start',
    backgroundColor: '#f7faf8',
    borderColor: '#dbe5df',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12
  },
  resultRowActive: {
    backgroundColor: '#ecfdf3',
    borderColor: '#a8d8b8'
  },
  resultDot: {
    backgroundColor: '#208354',
    borderRadius: 999,
    height: 10,
    marginTop: 5,
    width: 10
  },
  resultTitle: {
    color: '#101828',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18
  },
  resultMeta: {
    color: '#667085',
    fontSize: 12,
    marginTop: 4
  },
  mapHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12
  },
  mapWrap: {
    borderColor: '#d9e2dc',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden'
  },
  selectedBox: {
    backgroundColor: '#ecfdf3',
    borderColor: '#bde5c8',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    padding: 12
  },
  selectedLabel: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  selectedAddress: {
    color: '#101828',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 4
  },
  selectedMeta: {
    color: '#667085',
    fontSize: 12,
    marginTop: 4
  },
  helperText: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(4, 20, 12, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    maxWidth: 420,
    padding: 22,
    width: '100%'
  },
  modalIconWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#dff7e8',
    borderRadius: 999,
    height: 56,
    justifyContent: 'center',
    width: 56
  },
  modalIcon: {
    color: '#166534',
    fontSize: 28,
    fontWeight: '900'
  },
  modalTitle: {
    color: '#101828',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 14,
    textAlign: 'center'
  },
  modalText: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center'
  },
  modalMeta: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center'
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18
  }
};
