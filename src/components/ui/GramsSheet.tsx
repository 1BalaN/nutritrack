import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Colors, Spacing, Radius, Typography } from '@/constants'
import { formatNutritionNumber } from '@/lib/format-nutrition'
import type { NutritionSummary } from '@/types'

export type GramsPreview = Pick<NutritionSummary, 'kcal' | 'protein' | 'fat' | 'carbs'>

interface GramsSheetProps {
  visible: boolean
  onClose: () => void
  title: string
  brand?: string | null
  contextLine: string
  initialGrams: string
  computePreview: (gramsNum: number) => GramsPreview | null
  confirmLabel: string
  onConfirm: (grams: number) => void
}

function PreviewMacro({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.previewMacro}>
      <Text style={[styles.previewValue, { color }]}>{formatNutritionNumber(value)}</Text>
      <Text style={styles.previewLabel}>{label}</Text>
    </View>
  )
}

export function GramsSheet({
  visible,
  onClose,
  title,
  brand,
  contextLine,
  initialGrams,
  computePreview,
  confirmLabel,
  onConfirm,
}: GramsSheetProps) {
  const [grams, setGrams] = useState(initialGrams)

  const gramsNum = parseFloat(grams.replace(',', '.')) || 0
  const preview = gramsNum > 0 ? computePreview(gramsNum) : null
  const isValid = gramsNum > 0 && gramsNum <= 5000

  return (
    <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheet}
      >
        <View style={styles.handle} />
        <Text style={styles.productName} numberOfLines={2}>
          {title}
        </Text>
        {brand ? <Text style={styles.brand}>{brand}</Text> : null}
        <Text style={styles.contextLine}>{contextLine}</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={grams}
            onChangeText={(v) => setGrams(v.replace(',', '.'))}
            keyboardType='decimal-pad'
            selectTextOnFocus
            autoFocus={visible}
            placeholder='100'
            placeholderTextColor={Colors.textTertiary}
          />
          <Text style={styles.unit}>г</Text>
        </View>
        {preview ? (
          <View style={styles.previewRow}>
            <PreviewMacro label='ккал' value={preview.kcal} color={Colors.calories} />
            <PreviewMacro label='белки' value={preview.protein} color={Colors.protein} />
            <PreviewMacro label='жиры' value={preview.fat} color={Colors.fat} />
            <PreviewMacro label='углев.' value={preview.carbs} color={Colors.carbs} />
          </View>
        ) : null}
        <Pressable
          onPress={() => isValid && onConfirm(gramsNum)}
          style={({ pressed }) => [
            styles.confirmBtn,
            !isValid && styles.confirmBtnDisabled,
            pressed && styles.confirmBtnPressed,
          ]}
          disabled={!isValid}
        >
          <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
        </Pressable>
        <Pressable onPress={onClose} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Отмена</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xxl,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: Radius.round,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  productName: {
    ...Typography.h3,
    textAlign: 'center',
  },
  brand: {
    ...Typography.bodySmall,
    textAlign: 'center',
    marginTop: -Spacing.sm,
  },
  contextLine: {
    ...Typography.caption,
    textAlign: 'center',
    color: Colors.primary,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  input: {
    width: 120,
    height: 60,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceSecondary,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  unit: {
    ...Typography.h3,
    color: Colors.textSecondary,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  previewMacro: {
    alignItems: 'center',
    gap: 2,
  },
  previewValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  previewLabel: {
    ...Typography.caption,
    fontSize: 11,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  confirmBtnDisabled: {
    backgroundColor: Colors.textDisabled,
  },
  confirmBtnPressed: {
    backgroundColor: Colors.primaryDark,
  },
  confirmBtnText: {
    ...Typography.h4,
    color: Colors.white,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  cancelBtnText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
})
