import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <Ionicons name="alert-circle" size={20} color={colors.danger} />
        <Text style={styles.text}>{message}</Text>
      </View>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry} style={styles.button}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.dangerSoft,
    borderColor: '#fecdd3',
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  text: {
    color: colors.danger,
    flex: 1,
    fontWeight: '700'
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: colors.danger,
    borderRadius: 10,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700'
  }
});
