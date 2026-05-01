import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '../theme';

export default function BrandLogo({ compact = false }) {
  return (
    <View style={[styles.row, compact && styles.compactRow]}>
      <View style={[styles.mark, compact && styles.compactMark]}>
        <Ionicons name="leaf" size={compact ? 20 : 30} color="#fff" />
      </View>
      <View>
        <Text style={[styles.name, compact && styles.compactName]}>Farm Direct</Text>
        {!compact ? <Text style={styles.caption}>Farmer Customer Platform</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  compactRow: {
    gap: 8
  },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
    width: 56,
    ...shadow
  },
  compactMark: {
    borderRadius: 12,
    height: 36,
    width: 36
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900'
  },
  compactName: {
    fontSize: 18
  },
  caption: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2
  }
});
