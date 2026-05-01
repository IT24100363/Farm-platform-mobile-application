import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen } from '../components/Screen';
import BrandLogo from '../components/BrandLogo';
import { colors } from '../theme';

const defaultsByVariant = {
  checkout: {
    icon: 'lock-closed-outline',
    title: 'Checkout',
    subtitle: 'Sign in to complete your order',
    heading: 'Checkout is available after login',
    message: 'Your cart is saved here, but placing an order requires an account so we can manage delivery, payment, and tracking.'
  },
  orders: {
    icon: 'receipt-outline',
    title: 'Orders',
    subtitle: 'Sign in to see your order history',
    heading: 'Order history is locked for guests',
    message: 'Create an account or sign in to track current orders, view past purchases, and manage delivery updates.'
  },
  profile: {
    icon: 'person-outline',
    title: 'Profile',
    subtitle: 'Sign in to access your account',
    heading: 'Your account lives behind login',
    message: 'Profile details, saved address, and account settings are only available once you sign in.'
  },
  notifications: {
    icon: 'notifications-outline',
    title: 'Alerts',
    subtitle: 'Sign in to see account notifications',
    heading: 'Notifications are available after login',
    message: 'Sign in to receive order updates, low-stock messages, and account alerts tied to your profile.'
  }
};

export default function GuestPromptScreen({ navigation, route }) {
  const variant = route.params?.variant || 'profile';
  const config = defaultsByVariant[variant] || defaultsByVariant.profile;

  return (
    <Screen title={config.title} subtitle={config.subtitle}>
      <Card style={{ alignItems: 'center', paddingVertical: 26 }}>
        <BrandLogo compact />
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.primarySoft,
            borderRadius: 24,
            height: 68,
            justifyContent: 'center',
            marginTop: 18,
            width: 68
          }}
        >
          <Ionicons name={config.icon} size={30} color={colors.primaryDark} />
        </View>
        <Text
          style={{
            color: colors.text,
            fontSize: 22,
            fontWeight: '900',
            marginTop: 18,
            textAlign: 'center'
          }}
        >
          {config.heading}
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 15,
            lineHeight: 22,
            marginTop: 10,
            textAlign: 'center'
          }}
        >
          {config.message}
        </Text>
        <View style={{ gap: 10, marginTop: 20, width: '100%' }}>
          <Button icon="log-in-outline" onPress={() => navigation.navigate('Login')} title="Login" />
          <Button icon="person-add-outline" onPress={() => navigation.navigate('Register')} title="Register" variant="secondary" />
        </View>
      </Card>
    </Screen>
  );
}
