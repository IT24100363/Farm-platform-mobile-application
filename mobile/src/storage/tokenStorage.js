import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'farmer_customer_access_token';
const USER_KEY = 'farmer_customer_user';

export const saveAuth = async ({ token, user }) => {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  if (user) await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
};

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);

export const getStoredUser = async () => {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearAuth = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
};
