import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const icons = {
  Home: ['home', 'home-outline'],
  Products: ['basket', 'basket-outline'],
  Cart: ['cart', 'cart-outline'],
  Orders: ['receipt', 'receipt-outline'],
  Profile: ['person', 'person-outline'],
  Dashboard: ['grid', 'grid-outline'],
  Users: ['people', 'people-outline'],
  Promos: ['pricetag', 'pricetag-outline'],
  Deliveries: ['bicycle', 'bicycle-outline']
};

export const tabScreenOptions = ({ route }) => ({
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: '#94a3a2',
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '800',
    paddingBottom: 4
  },
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: 72,
    paddingTop: 8
  },
  tabBarIcon: ({ color, focused, size }) => {
    const [active, inactive] = icons[route.name] || ['ellipse', 'ellipse-outline'];
    return <Ionicons name={focused ? active : inactive} size={size + 2} color={color} />;
  }
});

export const stackScreenOptions = {
  contentStyle: { backgroundColor: colors.background },
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTintColor: colors.primaryDark,
  headerTitleStyle: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: '900'
  }
};
