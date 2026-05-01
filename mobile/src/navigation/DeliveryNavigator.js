import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DeliveryDashboardScreen from '../screens/DeliveryDashboardScreen';
import DeliveryOrdersScreen from '../screens/DeliveryOrdersScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import { stackScreenOptions, tabScreenOptions } from './tabOptions';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DeliveryTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Dashboard" component={DeliveryDashboardScreen} />
      <Tab.Screen name="Deliveries" component={DeliveryOrdersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function DeliveryNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="DeliveryTabs" component={DeliveryTabs} options={{ headerShown: false }} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} options={{ title: 'Order details' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
