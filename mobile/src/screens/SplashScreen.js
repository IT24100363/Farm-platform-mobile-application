import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import BrandLogo from '../components/BrandLogo';
import { colors } from '../theme';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <BrandLogo />
      <Text style={styles.tagline}>Fresh produce, fair prices, direct delivery.</Text>
      <ActivityIndicator color={colors.primary} size="large" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 28
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
    textAlign: 'center'
  },
  spinner: {
    marginTop: 26
  }
});
