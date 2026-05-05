import React, { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function CategoryDropdown({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Select category',
  sheetTitle
}) {
  const [open, setOpen] = useState(false);

  const normalizedOptions = useMemo(
    () =>
      options.map((option) =>
        typeof option === 'string'
          ? { label: option, value: option }
          : { label: option?.label ?? String(option?.value ?? ''), value: option?.value ?? option?.label ?? '' }
      ),
    [options]
  );

  const selectedLabel = useMemo(() => {
    if (!value) return placeholder;
    const selected = normalizedOptions.find((option) => String(option.value) === String(value));
    return selected?.label || String(value);
  }, [normalizedOptions, placeholder, value]);

  const choose = (option) => {
    onChange(option.value);
    setOpen(false);
  };

  return (
    <>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity activeOpacity={0.86} onPress={() => setOpen(true)} style={styles.trigger}>
        <Text numberOfLines={1} style={[styles.triggerText, !value && styles.placeholder]}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal animationType="fade" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setOpen(false)} style={styles.backdrop}>
          <View onStartShouldSetResponder={() => true} style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{sheetTitle || (label ? `Select ${String(label).toLowerCase()}` : 'Select option')}</Text>
              <TouchableOpacity activeOpacity={0.85} onPress={() => setOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.optionList} showsVerticalScrollIndicator={false}>
              {normalizedOptions.map((option) => {
                const active = String(option.value) === String(value);
                return (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    key={String(option.value)}
                    onPress={() => choose(option)}
                    style={[styles.option, active && styles.optionActive]}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
                    {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: spacing.xs
  },
  trigger: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  triggerText: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700'
  },
  placeholder: {
    color: colors.textMuted,
    fontWeight: '600'
  },
  backdrop: {
    backgroundColor: 'rgba(5, 18, 12, 0.48)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    maxHeight: '72%',
    overflow: 'hidden',
    padding: spacing.md
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900'
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34
  },
  optionList: {
    gap: 10,
    paddingBottom: spacing.xs
  },
  option: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13
  },
  optionActive: {
    backgroundColor: colors.primarySoft,
    borderColor: '#b4e0c7'
  },
  optionText: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '800'
  },
  optionTextActive: {
    color: colors.primaryDark
  }
});
