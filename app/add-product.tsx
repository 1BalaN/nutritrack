import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { productsRepository, mealEntriesRepository } from '@/db/repositories'
import { numberToInputString, formatNutritionNumber } from '@/lib/format-nutrition'
import { queryKeys } from '@/query/query-keys'
import { Colors, Spacing, Radius, Typography } from '@/constants'
import { enqueueSync } from '@/services'
import type { MealEntry, Product } from '@/types'

interface FieldConfig {
  key: keyof FormState
  label: string
  suffix: string
  hint?: string
  required?: boolean
}

interface FormState {
  name: string
  brand: string
  kcal: string
  protein: string
  fat: string
  carbs: string
  fiber: string
  sugar: string
}

const MACRO_FIELDS: FieldConfig[] = [
  { key: 'kcal', label: 'Калории', suffix: 'ккал / 100 г', required: true },
  { key: 'protein', label: 'Белки', suffix: 'г / 100 г', required: true },
  { key: 'fat', label: 'Жиры', suffix: 'г / 100 г', required: true },
  { key: 'carbs', label: 'Углеводы', suffix: 'г / 100 г', required: true },
  { key: 'fiber', label: 'Клетчатка', suffix: 'г / 100 г', hint: 'необязательно' },
  { key: 'sugar', label: 'Сахар', suffix: 'г / 100 г', hint: 'необязательно' },
]

function NumericInput({
  label,
  suffix,
  hint,
  value,
  onChange,
  required,
  error,
}: {
  label: string
  suffix: string
  hint?: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  error?: boolean
}) {
  return (
    <View style={fieldStyles.row}>
      <View style={fieldStyles.labelCol}>
        <Text style={fieldStyles.label}>
          {label}
          {required ? <Text style={fieldStyles.required}> *</Text> : null}
        </Text>
        {hint ? <Text style={fieldStyles.hint}>{hint}</Text> : null}
      </View>
      <View style={[fieldStyles.inputWrap, error && fieldStyles.inputError]}>
        <TextInput
          style={fieldStyles.input}
          value={value}
          onChangeText={(v) => onChange(v.replace(',', '.'))}
          keyboardType='decimal-pad'
          placeholder='0'
          placeholderTextColor={Colors.textTertiary}
          selectTextOnFocus
        />
        <Text style={fieldStyles.suffix}>{suffix}</Text>
      </View>
    </View>
  )
}

const fieldStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  labelCol: { flex: 1 },
  label: { ...Typography.body, fontWeight: '500' },
  required: { color: Colors.danger },
  hint: { ...Typography.caption, marginTop: 1 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    minWidth: 130,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputError: { borderColor: Colors.danger },
  input: {
    height: 40,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
    minWidth: 70,
  },
  suffix: { fontSize: 12, color: Colors.textTertiary, fontWeight: '500' },
})

async function invalidateMealDays(qc: QueryClient, dates: string[]) {
  await qc.invalidateQueries({ queryKey: queryKeys.products.all })
  for (const d of dates) {
    await qc.invalidateQueries({ queryKey: queryKeys.mealEntries.byDate(d) })
    await qc.invalidateQueries({ queryKey: queryKeys.mealEntries.summaryByDate(d) })
  }
}

export default function AddProductScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const qc = useQueryClient()
  const params = useLocalSearchParams<{ productId?: string | string[] }>()

  const productId = useMemo(() => {
    const raw = params.productId
    if (typeof raw === 'string' && raw.length > 0) return raw
    if (Array.isArray(raw) && raw[0]) return raw[0]
    return null
  }, [params.productId])
  const isEdit = productId != null

  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'missing'>(
    isEdit ? 'loading' : 'ready'
  )
  const [barcodeHint, setBarcodeHint] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    name: '',
    brand: '',
    kcal: '',
    protein: '',
    fat: '',
    carbs: '',
    fiber: '',
    sugar: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, boolean>>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!productId) {
      setLoadState('ready')
      setBarcodeHint(null)
      return
    }
    let cancelled = false
    setLoadState('loading')
    void productsRepository.findById(productId).then((p) => {
      if (cancelled) return
      if (!p) {
        setLoadState('missing')
        return
      }
      setForm({
        name: p.name,
        brand: p.brand ?? '',
        kcal: numberToInputString(p.kcalPer100g),
        protein: numberToInputString(p.protein),
        fat: numberToInputString(p.fat),
        carbs: numberToInputString(p.carbs),
        fiber: p.fiber != null ? numberToInputString(p.fiber) : '',
        sugar: p.sugar != null ? numberToInputString(p.sugar) : '',
      })
      setBarcodeHint(p.barcode ?? null)
      setLoadState('ready')
    })
    return () => {
      cancelled = true
    }
  }, [productId])

  const set = useCallback((key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: false }))
  }, [])

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, boolean>> = {}
    if (!form.name.trim()) newErrors.name = true
    if (!form.kcal.trim() || isNaN(parseFloat(form.kcal.replace(',', '.')))) newErrors.kcal = true
    if (!form.protein.trim() || isNaN(parseFloat(form.protein.replace(',', '.'))))
      newErrors.protein = true
    if (!form.fat.trim() || isNaN(parseFloat(form.fat.replace(',', '.')))) newErrors.fat = true
    if (!form.carbs.trim() || isNaN(parseFloat(form.carbs.replace(',', '.'))))
      newErrors.carbs = true
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function parseNum(v: string): number {
    return parseFloat(v.replace(',', '.')) || 0
  }

  async function handleSave() {
    if (!validate()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    setSaving(true)
    try {
      if (isEdit && productId) {
        const updated = await productsRepository.update(productId, {
          name: form.name.trim(),
          brand: form.brand.trim() || null,
          kcalPer100g: parseNum(form.kcal),
          protein: parseNum(form.protein),
          fat: parseNum(form.fat),
          carbs: parseNum(form.carbs),
          fiber: form.fiber ? parseNum(form.fiber) : null,
          sugar: form.sugar ? parseNum(form.sugar) : null,
        })
        if (!updated) {
          Alert.alert('Ошибка', 'Продукт не найден.')
          return
        }
        await enqueueSync('product', updated.id, 'update', updated)
        const dates = await mealEntriesRepository.recalculateNutritionForProductId(productId)
        await invalidateMealDays(qc, dates)
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        router.back()
        return
      }

      const created = await productsRepository.create({
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        kcalPer100g: parseNum(form.kcal),
        protein: parseNum(form.protein),
        fat: parseNum(form.fat),
        carbs: parseNum(form.carbs),
        fiber: form.fiber ? parseNum(form.fiber) : null,
        sugar: form.sugar ? parseNum(form.sugar) : null,
        sodium: null,
        barcode: null,
        source: 'manual',
      })
      await enqueueSync('product', created.id, 'create', created)
      await qc.invalidateQueries({ queryKey: queryKeys.products.all })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[add-product] save failed:', e)
      const msg = e instanceof Error ? e.message : String(e)
      Alert.alert('Ошибка', `Не удалось сохранить продукт.\n\n${msg}`)
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete() {
    if (!productId) return
    void (async () => {
      const inRecipes = await productsRepository.countRecipeIngredientRefs(productId)
      if (inRecipes > 0) {
        Alert.alert(
          'Нельзя удалить',
          'Этот продукт указан как ингредиент в рецептах. Сначала уберите его из рецептов.'
        )
        return
      }
      const n = await mealEntriesRepository.countByProductId(productId)
      Alert.alert(
        'Удалить продукт?',
        n > 0
          ? `Также будут удалены ${n} записей в дневнике с этим продуктом.`
          : 'Продукт будет удалён из справочника.',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Удалить',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                setSaving(true)
                try {
                  const productSnapshot = await productsRepository.findById(productId)
                  const removedEntries = await mealEntriesRepository.findByProductId(productId)
                  const dates = await mealEntriesRepository.deleteByProductId(productId)
                  await productsRepository.delete(productId)
                  await enqueueSync('product', productId, 'delete', {
                    id: productId,
                    updatedAt: Date.now(),
                  })
                  await invalidateMealDays(qc, dates)
                  if (productSnapshot) {
                    Alert.alert('Удалено', 'Продукт удалён. Можно отменить действие.', [
                      {
                        text: 'Отменить',
                        onPress: () => {
                          void (async () => {
                            await productsRepository.restore(productSnapshot as Product)
                            await mealEntriesRepository.restoreMany(removedEntries as MealEntry[])
                            await enqueueSync(
                              'product',
                              productSnapshot.id,
                              'create',
                              productSnapshot
                            )
                            for (const e of removedEntries) {
                              await enqueueSync('meal_entry', e.id, 'create', e)
                            }
                            await invalidateMealDays(qc, [
                              ...new Set(removedEntries.map((e) => e.date)),
                            ])
                          })()
                        },
                      },
                      { text: 'Ок', style: 'cancel' },
                    ])
                  }
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                  setLoadState('missing')
                } catch (e) {
                  const msg = e instanceof Error ? e.message : String(e)
                  Alert.alert('Ошибка', `Не удалось удалить продукт.\n\n${msg}`)
                } finally {
                  setSaving(false)
                }
              })()
            },
          },
        ]
      )
    })()
  }

  if (loadState === 'loading' || loadState === 'idle') {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size='large' color={Colors.primary} />
      </View>
    )
  }

  if (loadState === 'missing') {
    return (
      <View
        style={[
          styles.root,
          styles.centered,
          { paddingTop: insets.top, paddingHorizontal: Spacing.xl },
        ]}
      >
        <Text style={styles.missingTitle}>Продукт не найден</Text>
        <Pressable style={styles.saveBtn} onPress={() => router.back()}>
          <Text style={styles.saveBtnText}>Закрыть</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
        <Text style={styles.title}>{isEdit ? 'Редактировать' : 'Новый продукт'}</Text>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.saveBtnText}>{saving ? '...' : 'Сохранить'}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Название</Text>
          <View style={styles.card}>
            <View style={styles.nameRow}>
              <TextInput
                style={[styles.nameInput, errors.name && styles.nameInputError]}
                value={form.name}
                onChangeText={(v) => set('name', v)}
                placeholder='Например: Куриная грудка варёная'
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize='sentences'
                returnKeyType='next'
                autoFocus={!isEdit}
              />
            </View>
            <View style={[styles.nameRow, styles.brandRow]}>
              <TextInput
                style={styles.brandInput}
                value={form.brand}
                onChangeText={(v) => set('brand', v)}
                placeholder='Бренд (необязательно)'
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize='words'
                returnKeyType='next'
              />
            </View>
          </View>
          {errors.name ? <Text style={styles.errorText}>Введите название продукта</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Пищевая ценность на 100 г</Text>
          <View style={styles.card}>
            {MACRO_FIELDS.map((f) => (
              <NumericInput
                key={f.key}
                label={f.label}
                suffix={f.suffix}
                hint={f.hint}
                value={form[f.key]}
                onChange={(v) => set(f.key, v)}
                required={f.required}
                error={errors[f.key]}
              />
            ))}
          </View>
        </View>

        <View style={styles.calcPreview}>
          <Text style={styles.calcTitle}>Предпросмотр на 100 г</Text>
          <View style={styles.calcRow}>
            <CalcBadge label='ккал' value={parseNum(form.kcal)} color={Colors.calories} />
            <CalcBadge label='белки' value={parseNum(form.protein)} color={Colors.protein} />
            <CalcBadge label='жиры' value={parseNum(form.fat)} color={Colors.fat} />
            <CalcBadge label='углев.' value={parseNum(form.carbs)} color={Colors.carbs} />
          </View>
        </View>

        {isEdit && barcodeHint ? (
          <View style={styles.barcodeHintBox}>
            <Text style={styles.barcodeHintLabel}>Штрихкод</Text>
            <Text style={styles.barcodeHintValue}>{barcodeHint}</Text>
            <Text style={styles.barcodeHintCaption}>
              Чтобы изменить штрихкод, создайте новый продукт.
            </Text>
          </View>
        ) : null}

        {isEdit ? (
          <Pressable
            onPress={confirmDelete}
            disabled={saving}
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.deleteBtnText}>Удалить продукт</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function CalcBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={calcStyles.badge}>
      <Text style={[calcStyles.value, { color }]}>{formatNutritionNumber(value)}</Text>
      <Text style={calcStyles.label}>{label}</Text>
    </View>
  )
}

const calcStyles = StyleSheet.create({
  badge: { flex: 1, alignItems: 'center', gap: 2 },
  value: { fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },
  label: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
})

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  missingTitle: { ...Typography.h4, textAlign: 'center', color: Colors.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  closeBtnText: { fontSize: 14, color: Colors.textSecondary },
  title: { ...Typography.h4 },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  saveBtnText: { ...Typography.body, color: Colors.white, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  section: { gap: Spacing.xs },
  sectionHeader: {
    ...Typography.label,
    color: Colors.textSecondary,
    paddingLeft: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  nameRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  brandRow: { borderBottomWidth: 0 },
  nameInput: {
    ...Typography.bodyLarge,
    color: Colors.text,
    height: 52,
    borderWidth: 0,
  },
  nameInputError: {
    color: Colors.danger,
  },
  brandInput: {
    ...Typography.body,
    color: Colors.textSecondary,
    height: 44,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.danger,
    paddingLeft: Spacing.xs,
  },
  calcPreview: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  calcTitle: { ...Typography.bodySmall, fontWeight: '600', textAlign: 'center' },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between' },
  barcodeHintBox: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  barcodeHintLabel: { ...Typography.caption, fontWeight: '600', color: Colors.textSecondary },
  barcodeHintValue: { ...Typography.body, fontWeight: '600' },
  barcodeHintCaption: { ...Typography.caption, color: Colors.textTertiary },
  deleteBtn: {
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  deleteBtnText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.danger,
  },
})
