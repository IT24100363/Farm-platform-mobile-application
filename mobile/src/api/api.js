import axios from 'axios';
import Constants from 'expo-constants';
import { getToken } from '../storage/tokenStorage';

export const API_URLS = {
  localAndroid: 'http://10.0.2.2:5000/api',
  localDevice: 'http://192.168.1.100:5000/api',
  render: 'https://your-render-service.onrender.com/api',
  railway: 'https://your-railway-service.up.railway.app/api'
};

const configuredUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  API_URLS.localDevice;

export const API_BASE_URL = configuredUrl.replace(/\/$/, '');
console.log('API_BASE_URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getApiError = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.message || error?.message || fallback;

export default api;
