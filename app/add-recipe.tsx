import { useMemo, useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { mealEntriesRepository, productsRepository, recipesRepository } from '@/db/repositories'
import { useProductsQuery } from '@/hooks/useProductsQuery'
import { Colors, Radius, Spacing, Typography } from '@/constants'
import { queryKeys } from '@/query/query-keys'
import { formatNutritionNumber } from '@/lib/format-nutrition'
import { enqueueSync } from '@/services'
import type { MealEntry, Product, Recipe } from '@/types'

type RecipeIngredientDraft = {
  product: Product
  grams: string
}

export default function AddRecipeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const qc = useQueryClient()
  const params = useLocalSearchParams<{ recipeId?: string | string[] }>()
  const recipeId = useMemo(() => {
    const raw = params.recipeId
    if (typeof raw === 'string' && raw.length > 0) return raw
    if (Array.isArray(raw) && raw[0]) return raw[0]
    return null
  }, [params.recipeId])
  const isEdit = recipeId != null

  const [name, setName] = useState('')
  const [search, setSearch] = useState('')
  const [ingredients, setIngredients] = useState<RecipeIngredientDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  const { data: products = [] } = useProductsQuery(search)

  useEffect(() => {
    if (!recipeId) return
    let cancelled = false
    setLoading(true)
    void (async () => {
      const recipe = await recipesRepository.findById(recipeId)
      if (!recipe) {
        if (!cancelled) setLoading(false)
        return
      }
      if (cancelled) return
      setName(recipe.name)
      const loadedIngredients: RecipeIngredientDraft[] = []
      for (const ing of recipe.ingredients) {
        const p = await productsRepository.findById(ing.productId)
        if (p) {
          loadedIngredients.push({ product: p, grams: String(ing.grams) })
        }
      }
      if (cancelled) return
      setIngredients(loadedIngredients)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [recipeId])

  const totals = useMemo(() => {
    return ingredients.reduce(
      (acc, i) => {
        const grams = parseFloat(i.grams.replace(',', '.')) || 0
        const factor = grams / 100
        return {
          kcal: acc.kcal + i.product.kcalPer100g * factor,
          protein: acc.protein + i.product.protein * factor,
          fat: acc.fat + i.product.fat * factor,
          carbs: acc.carbs + i.product.carbs * factor,
          grams: acc.grams + grams,
        }
      },
      { kcal: 0, protein: 0, fat: 0, carbs: 0, grams: 0 }
    )
  }, [ingredients])

  const per100 = useMemo(() => {
    if (totals.grams <= 0) return { kcal: 0, protein: 0, fat: 0, carbs: 0 }
    const factor = 100 / totals.grams
    return {
      kcal: totals.kcal * factor,
      protein: totals.protein * factor,
      fat: totals.fat * factor,
      carbs: totals.carbs * factor,
    }
  }, [totals])

  function addIngredient(product: Product) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIngredients((prev) => {
      const existing = prev.find((x) => x.product.id === product.id)
      if (existing) {
        return prev.map((x) =>
          x.product.id === product.id
            ? { ...x, grams: String((parseFloat(x.grams) || 0) + 100) }
            : x
        )
      }
      return [...prev, { product, grams: '100' }]
    })
  }

  async function onSave() {
    const cleanName = name.trim()
    const cleanIngredients = ingredients
      .map((i) => ({ productId: i.product.id, grams: parseFloat(i.grams.replace(',', '.')) || 0 }))
      .filter((i) => i.grams > 0)

    if (!cleanName) {
      Alert.alert('Ошибка', 'Введите название рецепта.')
      return
    }
    if (cleanIngredients.length === 0) {
      Alert.alert('Ошибка', 'Добавьте хотя бы один ингредиент.')
      return
    }

    setSaving(true)
    try {
      if (recipeId) {
        const updated = await recipesRepository.update(recipeId, {
          name: cleanName,
          servings: 1,
          ingredients: cleanIngredients,
        })
        await enqueueSync('recipe', recipeId, 'update', updated)
      } else {
        const created = await recipesRepository.create({
          name: cleanName,
          servings: 1,
          ingredients: cleanIngredients,
        })
        await enqueueSync('recipe', created.id, 'create', created)
      }
      await qc.invalidateQueries({ queryKey: queryKeys.recipes.all })
      router.back()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      Alert.alert('Ошибка', msg)
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete() {
    if (!recipeId) return
    void (async () => {
      const refs = await mealEntriesRepository.countByRecipeId(recipeId)
      const msg =
        refs > 0
          ? `Рецепт используется в ${refs} записях дневника. Эти записи тоже будут удалены.`
          : 'Рецепт будет удалён.'
      Alert.alert('Удалить рецепт?', msg, [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const recipeSnapshot = await recipesRepository.findById(recipeId)
              const removedEntries = await mealEntriesRepository.findByRecipeId(recipeId)
              const affectedDates = await mealEntriesRepository.deleteByRecipeId(recipeId)
              await recipesRepository.delete(recipeId)
              await enqueueSync('recipe', recipeId, 'delete', {
                id: recipeId,
                updatedAt: Date.now(),
              })
              await qc.invalidateQueries({ queryKey: queryKeys.recipes.all })
              for (const d of affectedDates) {
                await qc.invalidateQueries({ queryKey: queryKeys.mealEntries.byDate(d) })
                await qc.invalidateQueries({ queryKey: queryKeys.mealEntries.summaryByDate(d) })
              }
              Alert.alert('Удалено', 'Рецепт удалён. Можно отменить действие.', [
                {
                  text: 'Отменить',
                  onPress: () => {
                    void (async () => {
                      if (!recipeSnapshot) return
                      await recipesRepository.restore(recipeSnapshot as Recipe)
                      await mealEntriesRepository.restoreMany(removedEntries as MealEntry[])
                      await enqueueSync('recipe', recipeSnapshot.id, 'create', recipeSnapshot)
                      for (const e of removedEntries) {
                        await enqueueSync('meal_entry', e.id, 'create', e)
                      }
                      await qc.invalidateQueries({ queryKey: queryKeys.recipes.all })
                      for (const d of [...new Set(removedEntries.map((e) => e.date))]) {
                        await qc.invalidateQueries({ queryKey: queryKeys.mealEntries.byDate(d) })
                        await qc.invalidateQueries({
                          queryKey: queryKeys.mealEntries.summaryByDate(d),
                        })
                      }
                    })()
                  },
                },
                { text: 'Ок', style: 'cancel' },
              ])
              router.back()
            })()
          },
        },
      ])
    })()
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.title}>{isEdit ? 'Редактировать рецепт' : 'Новый рецепт'}</Text>
        <Pressable onPress={() => void onSave()} style={styles.saveBtn} disabled={saving}>
          <Text style={styles.saveText}>{saving ? '...' : 'Сохранить'}</Text>
        </Pressable>
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm }}>
          <ActivityIndicator size='small' color={Colors.primary} />
          <Text style={styles.empty}>Загрузка рецепта...</Text>
        </View>
      ) : null}

      {!loading ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps='handled'
        >
          <View style={styles.card}>
            <Text style={styles.label}>Название рецепта</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder='Например: Овсянка с бананом'
              style={styles.input}
              placeholderTextColor={Colors.textTertiary}
            />
            <Text style={styles.empty}>
              Укажите ингредиенты в граммах для всего блюда — значения на 100 г посчитаются
              автоматически.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Ингредиенты</Text>
            {ingredients.length === 0 ? (
              <Text style={styles.empty}>Пока нет ингредиентов</Text>
            ) : null}
            {ingredients.map((item) => (
              <View key={item.product.id} style={styles.ingredientRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ingName}>{item.product.name}</Text>
                  {item.product.brand ? (
                    <Text style={styles.ingBrand}>{item.product.brand}</Text>
                  ) : null}
                </View>
                <TextInput
                  value={item.grams}
                  onChangeText={(v) =>
                    setIngredients((prev) =>
                      prev.map((x) =>
                        x.product.id === item.product.id ? { ...x, grams: v.replace(',', '.') } : x
                      )
                    )
                  }
                  keyboardType='decimal-pad'
                  style={styles.gramsInput}
                />
                <Text style={styles.unit}>г</Text>
                <Pressable
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                    setIngredients((prev) => prev.filter((x) => x.product.id !== item.product.id))
                  }}
                  style={styles.removeBtn}
                >
                  <Text style={styles.removeText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Добавить ингредиент</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder='Поиск продукта...'
              style={styles.input}
              placeholderTextColor={Colors.textTertiary}
            />
            {products.slice(0, 15).map((p) => (
              <Pressable key={p.id} onPress={() => addIngredient(p)} style={styles.productRow}>
                <Text style={styles.productName}>{p.name}</Text>
                <Text style={styles.productMeta}>
                  {formatNutritionNumber(p.kcalPer100g)} ккал · Б {formatNutritionNumber(p.protein)}
                </Text>
              </Pressable>
            ))}
            {search.trim().length > 0 && products.length === 0 ? (
              <Text style={styles.empty}>Ничего не найдено. Попробуйте другое название.</Text>
            ) : null}
          </View>

          <View style={styles.totals}>
            <Text style={styles.totalTitle}>Итого: {formatNutritionNumber(totals.grams)} г</Text>
            <Text style={styles.totalMeta}>
              {formatNutritionNumber(totals.kcal)} ккал · Б {formatNutritionNumber(totals.protein)}{' '}
              · Ж {formatNutritionNumber(totals.fat)} · У {formatNutritionNumber(totals.carbs)}
            </Text>
            <Text style={[styles.totalTitle, { marginTop: Spacing.xs }]}>На 100 г</Text>
            <Text style={styles.totalMeta}>
              {formatNutritionNumber(per100.kcal)} ккал · Б {formatNutritionNumber(per100.protein)}{' '}
              · Ж {formatNutritionNumber(per100.fat)} · У {formatNutritionNumber(per100.carbs)}
            </Text>
          </View>
          {isEdit ? (
            <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>Удалить рецепт</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : null}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: Colors.textSecondary, fontSize: 14 },
  title: { ...Typography.h4 },
  saveBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  saveText: { color: Colors.white, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  label: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  input: {
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.md,
    color: Colors.text,
  },
  empty: { ...Typography.caption, color: Colors.textTertiary },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  ingName: { ...Typography.body, fontWeight: '500' },
  ingBrand: { ...Typography.caption, color: Colors.textTertiary },
  gramsInput: {
    width: 70,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    textAlign: 'center',
    color: Colors.text,
  },
  unit: { ...Typography.caption, color: Colors.textSecondary },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.round,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: Colors.danger, fontSize: 10, fontWeight: '700' },
  productRow: {
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  productName: { ...Typography.body, fontWeight: '500' },
  productMeta: { ...Typography.caption, color: Colors.textTertiary },
  totals: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  totalTitle: { ...Typography.body, fontWeight: '700' },
  totalMeta: { ...Typography.caption, color: Colors.textSecondary },
  deleteBtn: {
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  deleteText: {
    color: Colors.danger,
    fontWeight: '600',
  },
})
