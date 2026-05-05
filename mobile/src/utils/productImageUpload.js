import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import api, { getApiError } from '../api/api';

const inferMimeType = (uri) => {
  const clean = String(uri || '').split('?')[0].toLowerCase();
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
};

const buildFileName = (asset) => {
  if (asset?.fileName) return asset.fileName;
  const ext = inferMimeType(asset?.uri) === 'image/png' ? 'png' : 'jpg';
  return `product-${Date.now()}.${ext}`;
};

export const uploadProductImageFromDevice = async () => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') {
    Alert.alert('Permission needed', 'Please allow photo library access to upload a product image.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    
    quality: 0.85
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0];
  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    name: buildFileName(asset),
    type: asset.mimeType || inferMimeType(asset.uri)
  });

  try {
    const { data } = await api.post('/products/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (!data?.url) {
      throw new Error('Upload failed');
    }

    return data.url;
  } catch (err) {
    Alert.alert('Upload failed', getApiError(err, 'Could not upload the selected image.'));
    return null;
  }
};
