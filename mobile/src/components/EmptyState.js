import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

export default function EmptyState({ title = 'Nothing here yet', message = 'Pull to refresh or check again later.', icon = 'file-tray-outline' }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 32
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    height: 58,
    justifyContent: 'center',
    marginBottom: 14,
    width: 58
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900'
  },
  message: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    textAlign: 'center'
  }
});
