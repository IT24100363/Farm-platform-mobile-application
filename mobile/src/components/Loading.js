import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import BrandLogo from './BrandLogo';
import { colors } from '../theme';

export default function Loading({ message = 'Loading...' }) {
  return (
    <View style={styles.container}>
      <BrandLogo />
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 24
  },
  spinner: {
    marginTop: 24
  },
  text: {
    color: colors.textMuted,
    fontWeight: '700',
    marginTop: 10
  }
});
