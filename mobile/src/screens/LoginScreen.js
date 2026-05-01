import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ErrorMessage from '../components/ErrorMessage';
import { Button } from '../components/Screen';
import { getApiError } from '../api/api';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import { colors, radius, shadow } from '../theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('customer@example.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setError(getApiError(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.panel}>
        <BrandLogo />
        <Text style={styles.title}>Sign in</Text>
        <View style={styles.titleUnderline} />
        <Text style={styles.subtitle}>Use your customer, farmer, admin, or delivery account.</Text>
        <ErrorMessage message={error} />
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
          <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="Email" placeholderTextColor="#91a09a" style={styles.input} value={email} />
        </View>
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
          <TextInput onChangeText={setPassword} placeholder="Password" placeholderTextColor="#91a09a" secureTextEntry style={styles.input} value={password} />
        </View>
        <Button disabled={loading} icon="log-in-outline" onPress={submit} title={loading ? 'Signing in...' : 'Sign in'} />
        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.link}>
          <Text style={styles.linkText}>Create a new account</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 20
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    ...shadow
  },
  title: {
    color: colors.primaryDark,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
    marginTop: 24,
    textShadowColor: 'rgba(32, 131, 84, 0.12)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8
  },
  titleUnderline: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 4,
    marginTop: 7,
    width: 54
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 16,
    marginTop: 10
  },
  inputWrap: {
    alignItems: 'center',
    backgroundColor: '#f9fbfa',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 14
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14
  },
  link: {
    alignItems: 'center',
    marginTop: 16
  },
  linkText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900'
  }
});
