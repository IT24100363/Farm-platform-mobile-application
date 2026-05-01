import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CartScreen from '../screens/CartScreen';
import GuestPromptScreen from '../screens/GuestPromptScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import ProductInsightsScreen from '../screens/ProductInsightsScreen';
import ProductListScreen from '../screens/ProductListScreen';
import PromotionsScreen from '../screens/PromotionsScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ReviewsScreen from '../screens/ReviewsScreen';
import { useCart } from '../context/CartContext';
import { stackScreenOptions, tabScreenOptions } from './tabOptions';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function OrdersGuestScreen(props) {
  return <GuestPromptScreen {...props} route={{ ...props.route, params: { variant: 'orders' } }} />;
}

function ProfileGuestScreen(props) {
  return <GuestPromptScreen {...props} route={{ ...props.route, params: { variant: 'profile' } }} />;
}

function GuestTabs() {
  const { items } = useCart();
  const cartCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Products" component={ProductListScreen} />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarBadge: cartCount > 0 ? (cartCount > 99 ? '99+' : cartCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#dc2626',
            color: '#fff',
            fontSize: 10,
            fontWeight: '900',
            minWidth: 18,
            height: 18
          }
        }}
      />
      <Tab.Screen name="Orders" component={OrdersGuestScreen} />
      <Tab.Screen name="Profile" component={ProfileGuestScreen} />
    </Tab.Navigator>
  );
}

export default function GuestNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="GuestTabs" component={GuestTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{ title: 'Product details' }} />
      <Stack.Screen name="ProductInsights" component={ProductInsightsScreen} options={{ title: 'Product insights' }} />
      <Stack.Screen name="Promotions" component={PromotionsScreen} />
      <Stack.Screen name="Reviews" component={ReviewsScreen} />
      <Stack.Screen
        name="Checkout"
        component={GuestPromptScreen}
        initialParams={{ variant: 'checkout' }}
      />
      <Stack.Screen
        name="Notifications"
        component={GuestPromptScreen}
        initialParams={{ variant: 'notifications' }}
      />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
