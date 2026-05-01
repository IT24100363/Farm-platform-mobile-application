import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing } from '../theme';

export function Screen({
  title,
  subtitle,
  children,
  actionLabel,
  onAction,
  actionIcon = 'notifications-outline',
  actionBadgeCount = 0,
  refreshing,
  onRefresh
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <View style={styles.titleAccentRow}>
              <View style={styles.titleDot} />
              <View style={styles.titleLine} />
            </View>
            <Text numberOfLines={2} style={styles.title}>{title}</Text>
            <View style={styles.titleUnderline} />
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {actionLabel ? (
            <TouchableOpacity onPress={onAction} style={styles.headerButton}>
              <View style={styles.headerIconWrap}>
                <Ionicons name={actionIcon} size={18} color={colors.primaryDark} />
                {actionBadgeCount > 0 ? (
                  <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>
                      {actionBadgeCount > 99 ? '99+' : actionBadgeCount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.headerButtonText}>{actionLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Button({ title, onPress, variant = 'primary', disabled, icon }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, variant === 'secondary' && styles.secondaryButton, variant === 'danger' && styles.dangerButton, disabled && styles.disabledButton]}
    >
      {icon ? <Ionicons name={icon} size={18} color={variant === 'secondary' ? colors.primaryDark : '#fff'} /> : null}
      <Text style={[styles.buttonText, variant === 'secondary' && styles.secondaryButtonText]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function FieldLabel({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

export const sharedStyles = styles;

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    padding: spacing.md,
    paddingBottom: 96
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadow
  },
  titleBlock: {
    flex: 1,
    minWidth: 0
  },
  titleAccentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8
  },
  titleDot: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 9,
    width: 9
  },
  titleLine: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    flex: 1,
    height: 3,
    maxWidth: 82
  },
  title: {
    color: colors.primaryDark,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 42,
    textShadowColor: 'rgba(32, 131, 84, 0.12)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8
  },
  titleUnderline: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 4,
    marginTop: 7,
    width: 52
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4
  },
  headerButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  headerIconWrap: {
    marginRight: 1,
    position: 'relative'
  },
  headerBadge: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderColor: '#fff',
    borderRadius: 999,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 3,
    position: 'absolute',
    right: -10,
    top: -10
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12
  },
  headerButtonText: {
    color: colors.primaryDark,
    fontWeight: '800'
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...shadow
  },
  secondaryButton: {
    backgroundColor: colors.surfaceMuted,
    shadowOpacity: 0,
    elevation: 0
  },
  dangerButton: {
    backgroundColor: colors.danger
  },
  disabledButton: {
    opacity: 0.55
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900'
  },
  secondaryButtonText: {
    color: colors.primaryDark
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...shadow
  },
  label: {
    color: '#344255',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
    marginTop: 12
  }
});
