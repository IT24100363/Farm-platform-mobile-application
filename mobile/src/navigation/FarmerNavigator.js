import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FarmerDashboardScreen from '../screens/FarmerDashboardScreen';
import FarmerProductsScreen from '../screens/FarmerProductsScreen';
import FarmerOrdersScreen from '../screens/FarmerOrdersScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PromotionsScreen from '../screens/PromotionsScreen';
import ReviewsScreen from '../screens/ReviewsScreen';
import { stackScreenOptions, tabScreenOptions } from './tabOptions';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function FarmerTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Dashboard" component={FarmerDashboardScreen} />
      <Tab.Screen name="Products" component={FarmerProductsScreen} />
      <Tab.Screen name="Orders" component={FarmerOrdersScreen} />
      <Tab.Screen name="Promos" component={PromotionsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function FarmerNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="FarmerTabs" component={FarmerTabs} options={{ headerShown: false }} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} options={{ title: 'Order details' }} />
      <Stack.Screen name="Reviews" component={ReviewsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
