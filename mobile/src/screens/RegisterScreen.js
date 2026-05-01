import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ErrorMessage from '../components/ErrorMessage';
import { Button } from '../components/Screen';
import { getApiError } from '../api/api';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import { colors, radius, shadow } from '../theme';

const roles = ['customer', 'farmer', 'delivery'];

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'customer' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await register({ ...form, email: form.email.trim().toLowerCase() });
    } catch (err) {
      setError(getApiError(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.panel}>
        <BrandLogo compact />
        <Text style={styles.title}>Create account</Text>
        <View style={styles.titleUnderline} />
        <ErrorMessage message={error} />
        <Input icon="person-outline" onChangeText={(value) => setField('name', value)} placeholder="Full name" value={form.name} />
        <Input icon="mail-outline" autoCapitalize="none" keyboardType="email-address" onChangeText={(value) => setField('email', value)} placeholder="Email" value={form.email} />
        <Input icon="call-outline" keyboardType="phone-pad" onChangeText={(value) => setField('phone', value)} placeholder="Phone" value={form.phone} />
        <Input icon="lock-closed-outline" onChangeText={(value) => setField('password', value)} placeholder="Password" secureTextEntry value={form.password} />
        <View style={styles.roles}>
          {roles.map((role) => (
            <TouchableOpacity key={role} onPress={() => setField('role', role)} style={[styles.role, form.role === role && styles.activeRole]}>
              <Text style={[styles.roleText, form.role === role && styles.activeRoleText]}>{role}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Button disabled={loading} icon="person-add-outline" onPress={submit} title={loading ? 'Creating...' : 'Register'} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
          <Text style={styles.linkText}>Back to sign in</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function Input({ icon, ...props }) {
  return (
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={19} color={colors.textMuted} />
      <TextInput placeholderTextColor="#91a09a" style={styles.input} {...props} />
    </View>
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
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    marginTop: 18,
    textShadowColor: 'rgba(32, 131, 84, 0.12)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8
  },
  titleUnderline: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 4,
    marginBottom: 14,
    marginTop: 7,
    width: 54
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
    paddingVertical: 13
  },
  roles: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14
  },
  role: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    flex: 1,
    padding: 10
  },
  activeRole: {
    backgroundColor: colors.primary
  },
  roleText: {
    color: '#334155',
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'capitalize'
  },
  activeRoleText: {
    color: '#fff'
  },
  link: {
    alignItems: 'center',
    marginTop: 16
  },
  linkText: {
    color: colors.primary,
    fontWeight: '800'
  }
});
