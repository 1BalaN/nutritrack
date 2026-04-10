import { useState, useCallback, useEffect, useMemo } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { LegendList } from '@legendapp/list'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useProductsQuery } from '@/hooks/useProductsQuery'
import { useCreateMealEntryMutation } from '@/hooks/useMealEntryMutations'
import { Colors, Spacing, Radius, Typography } from '@/constants'
import { BarcodeIcon } from '@/components/ui/BarcodeIcon'
import { GramsSheet } from '@/components/ui/GramsSheet'
import { isFatSecretConfigured } from '@/lib/api'
import { fsSearchOnline, fsFetchAndNormalize } from '@/services/fatsecret.service'
import { getSearchCache, setSearchCache } from '@/lib/cache'
import { productsRepository } from '@/db/repositories'
import { calcNutritionFromGrams } from '@/lib/nutrition'
import { formatNutritionNumber } from '@/lib/format-nutrition'
import type { Product, MealType, CreateProductInput } from '@/types'
import type { FatSecretOnlineResult } from '@/services/fatsecret.service'
import * as Haptics from 'expo-haptics'

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
}

// ────── List item types ──────

type LocalListItem = { type: 'local'; product: Product }
type OnlineListItem = { type: 'online'; result: FatSecretOnlineResult }
type HeaderListItem = { type: 'header'; title: string; subtitle?: string }
type ListItem = LocalListItem | OnlineListItem | HeaderListItem

// ────── Description parser for FatSecret ──────

interface ParsedMacros {
  kcal: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
}

const FS_DESC_PATTERNS = {
  kcal: /Calories:\s*([\d.]+)/i,
  protein: /Protein:\s*([\d.]+)/i,
  fat: /Fat:\s*([\d.]+)/i,
  carbs: /Carbs:\s*([\d.]+)/i,
} as const

function parseFatSecretDescription(desc: string): ParsedMacros {
  const pick = (re: RegExp) => {
    const m = desc.match(re)
    return m ? parseFloat(m[1]) : null
  }
  return {
    kcal: pick(FS_DESC_PATTERNS.kcal),
    protein: pick(FS_DESC_PATTERNS.protein),
    fat: pick(FS_DESC_PATTERNS.fat),
    carbs: pick(FS_DESC_PATTERNS.carbs),
  }
}

// ────── Sub-components ──────

function LocalProductRow({
  product,
  onPress,
  onEditProduct,
}: {
  product: Product
  onPress: (p: Product) => void
  onEditProduct: (p: Product) => void
}) {
  return (
    <View style={styles.productRow}>
      <Pressable
        onPress={() => onPress(product)}
        style={({ pressed }) => [styles.productRowMain, pressed && styles.productRowPressed]}
      >
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {product.name}
          </Text>
          {product.brand ? (
            <Text style={styles.productBrand} numberOfLines={1}>
              {product.brand}
            </Text>
          ) : null}
        </View>
        <View style={styles.productMacros}>
          <Text style={styles.productKcal}>{formatNutritionNumber(product.kcalPer100g)}</Text>
          <Text style={styles.productKcalLabel}>ккал/100г</Text>
        </View>
        <View style={styles.productMacroDetail}>
          <Text style={[styles.macroChip, { color: Colors.protein }]}>
            Б{formatNutritionNumber(product.protein)}
          </Text>
          <Text style={[styles.macroChip, { color: Colors.fat }]}>
            Ж{formatNutritionNumber(product.fat)}
          </Text>
          <Text style={[styles.macroChip, { color: Colors.carbs }]}>
            У{formatNutritionNumber(product.carbs)}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => onEditProduct(product)}
        style={({ pressed }) => [styles.productEditBtn, pressed && { opacity: 0.7 }]}
        hitSlop={10}
        accessibilityRole='button'
        accessibilityLabel={`Редактировать продукт: ${product.name}`}
      >
        <Text style={styles.productEditBtnText}>✎</Text>
      </Pressable>
    </View>
  )
}

function OnlineProductRow({
  result,
  onSave,
  isSaving,
}: {
  result: FatSecretOnlineResult
  onSave: (r: FatSecretOnlineResult) => void
  isSaving: boolean
}) {
  const macros = parseFatSecretDescription(result.description)
  return (
    <View style={styles.onlineRow}>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {result.name}
        </Text>
        {result.brand ? (
          <Text style={styles.productBrand} numberOfLines={1}>
            {result.brand}
          </Text>
        ) : null}
        {macros.kcal ? (
          <View style={styles.onlineMacroRow}>
            <Text style={[styles.onlineMacro, { color: Colors.calories }]}>
              {formatNutritionNumber(macros.kcal)} ккал
            </Text>
            {macros.protein != null ? (
              <Text style={[styles.onlineMacro, { color: Colors.protein }]}>
                Б{formatNutritionNumber(macros.protein)}
              </Text>
            ) : null}
            {macros.fat != null ? (
              <Text style={[styles.onlineMacro, { color: Colors.fat }]}>
                Ж{formatNutritionNumber(macros.fat)}
              </Text>
            ) : null}
            {macros.carbs != null ? (
              <Text style={[styles.onlineMacro, { color: Colors.carbs }]}>
                У{formatNutritionNumber(macros.carbs)}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.onlineDesc} numberOfLines={1}>
            {result.description}
          </Text>
        )}
      </View>
      <Pressable
        onPress={() => !isSaving && onSave(result)}
        style={({ pressed }) => [styles.saveOnlineBtn, pressed && { opacity: 0.7 }]}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size='small' color={Colors.primary} />
        ) : (
          <Text style={styles.saveOnlineBtnText}>Добавить</Text>
        )}
      </Pressable>
    </View>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  )
}

// ────── Main screen ──────

export default function AddFoodScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const params = useLocalSearchParams<{
    mealType?: string
    date?: string
    productId?: string
    search?: string
    prefillName?: string
    prefillBrand?: string
    prefillKcal?: string
    prefillProtein?: string
    prefillFat?: string
    prefillCarbs?: string
    prefillBarcode?: string
    prefillSource?: string
    prefillFatsecretId?: string
  }>()

  const mealType = (params.mealType ?? 'breakfast') as MealType
  const date = params.date ?? new Date().toISOString().slice(0, 10)

  const [search, setSearch] = useState(params.search ?? '')
  const [selected, setSelected] = useState<Product | null>(null)
  const [onlineResults, setOnlineResults] = useState<FatSecretOnlineResult[]>([])
  const [isOnlineLoading, setIsOnlineLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  const { data: localProducts, isLoading: isLocalLoading } = useProductsQuery(search)
  const createMutation = useCreateMealEntryMutation()

  const routeProductId = useMemo(() => {
    const raw = params.productId
    if (typeof raw === 'string' && raw.length > 0) return raw
    if (Array.isArray(raw) && raw[0]) return raw[0]
    return null
  }, [params.productId])

  // Prefill from scanner or deep link (Strict Mode: cleanup cancels stale async work)
  useEffect(() => {
    if (!params.prefillName && !routeProductId) return

    let cancelled = false

    if (params.prefillName) {
      void (async () => {
        const input: CreateProductInput = {
          name: params.prefillName!,
          brand: params.prefillBrand || null,
          kcalPer100g: parseFloat(params.prefillKcal ?? '0') || 0,
          protein: parseFloat(params.prefillProtein ?? '0') || 0,
          fat: parseFloat(params.prefillFat ?? '0') || 0,
          carbs: parseFloat(params.prefillCarbs ?? '0') || 0,
          fiber: null,
          sugar: null,
          sodium: null,
          barcode: params.prefillBarcode || null,
          source: (params.prefillSource as CreateProductInput['source']) ?? 'fatsecret',
          fatsecretId: params.prefillFatsecretId || null,
          cachedAt: Date.now(),
        }

        let product: Product | null = null
        if (input.barcode) product = await productsRepository.findByBarcode(input.barcode)
        if (!product && input.fatsecretId)
          product = await productsRepository.findByFatsecretId(input.fatsecretId)
        if (!product) product = await productsRepository.create(input)

        if (!cancelled) setSelected(product)
      })()
    } else if (routeProductId) {
      void productsRepository.findById(routeProductId).then((p) => {
        if (!cancelled && p) setSelected(p)
      })
    }

    return () => {
      cancelled = true
    }
  }, [
    params.prefillName,
    params.prefillBrand,
    params.prefillKcal,
    params.prefillProtein,
    params.prefillFat,
    params.prefillCarbs,
    params.prefillBarcode,
    params.prefillSource,
    params.prefillFatsecretId,
    routeProductId,
  ])

  // Online search debounce
  useEffect(() => {
    if (!isFatSecretConfigured || !search.trim() || search.length < 2) {
      setOnlineResults([])
      return
    }
    const localCount = localProducts?.length ?? 0
    // No need to search online if local has plenty of results
    if (localCount >= 10) {
      setOnlineResults([])
      return
    }

    const timer = setTimeout(async () => {
      const cached = getSearchCache(search)
      if (cached) {
        setOnlineResults(cached)
        return
      }
      setIsOnlineLoading(true)
      try {
        const results = await fsSearchOnline(search)
        // Filter out products already in local DB by name similarity to reduce noise
        setOnlineResults(results)
        setSearchCache(search, results)
      } catch {
        // silently fail — local results are still shown
      } finally {
        setIsOnlineLoading(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [search, localProducts?.length])

  const handleLocalPress = useCallback((product: Product) => {
    void Haptics.selectionAsync()
    setSelected(product)
  }, [])

  const handleOnlineSave = useCallback(async (result: FatSecretOnlineResult) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSavingId(result.fatsecretId)
    try {
      // Check if already cached in local DB
      let product = await productsRepository.findByFatsecretId(result.fatsecretId)
      if (!product) {
        const input = await fsFetchAndNormalize(result.fatsecretId)
        if (input) {
          product = await productsRepository.create(input)
        }
      }
      if (product) {
        void Haptics.selectionAsync()
        setSelected(product)
      }
    } finally {
      setSavingId(null)
    }
  }, [])

  const handleConfirm = useCallback(
    (gramsNum: number) => {
      if (!selected) return
      createMutation.mutate(
        { date, mealType, productId: selected.id, grams: gramsNum },
        {
          onSuccess: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            router.back()
          },
        }
      )
    },
    [selected, createMutation, date, mealType, router]
  )

  const listData = useMemo((): ListItem[] => {
    const list: ListItem[] = []
    const hasLocal = (localProducts?.length ?? 0) > 0
    const hasOnline = onlineResults.length > 0

    if (search.trim()) {
      if (hasLocal) {
        list.push({ type: 'header', title: 'Из вашей базы' })
        for (const p of localProducts ?? []) {
          list.push({ type: 'local', product: p })
        }
      }
      if (isOnlineLoading) {
        list.push({ type: 'header', title: 'Поиск онлайн...', subtitle: 'FatSecret' })
      } else if (hasOnline) {
        list.push({ type: 'header', title: 'Онлайн', subtitle: 'FatSecret' })
        for (const r of onlineResults) {
          list.push({ type: 'online', result: r })
        }
      }
    } else {
      for (const p of localProducts ?? []) {
        list.push({ type: 'local', product: p })
      }
    }
    return list
  }, [search, localProducts, onlineResults, isOnlineLoading])

  const keyExtractor = useCallback((item: ListItem, index: number) => {
    if (item.type === 'local') return `l:${item.product.id}`
    if (item.type === 'online') return `o:${item.result.fatsecretId}`
    return `h:${item.title}:${index}`
  }, [])

  const getItemType = useCallback((item: ListItem) => item.type, [])

  const handleEditProduct = useCallback(
    (product: Product) => {
      void Haptics.selectionAsync()
      router.push({ pathname: '/add-product', params: { productId: product.id } })
    },
    [router]
  )

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'header') {
        return <SectionHeader title={item.title} subtitle={item.subtitle} />
      }
      if (item.type === 'local') {
        return (
          <LocalProductRow
            product={item.product}
            onPress={handleLocalPress}
            onEditProduct={handleEditProduct}
          />
        )
      }
      return (
        <OnlineProductRow
          result={item.result}
          onSave={handleOnlineSave}
          isSaving={savingId === item.result.fatsecretId}
        />
      )
    },
    [handleLocalPress, handleEditProduct, handleOnlineSave, savingId]
  )

  const isEmpty = !isLocalLoading && listData.length === 0

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Text style={styles.backText}>✕</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Добавить продукт</Text>
          <Text style={styles.headerSubtitle}>{MEAL_LABELS[mealType] ?? mealType}</Text>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/scanner', params: { mealType, date } })}
          style={styles.scanButton}
          hitSlop={8}
        >
          <BarcodeIcon size={15} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          placeholder='Поиск продуктов...'
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          clearButtonMode='while-editing'
          autoCapitalize='none'
          returnKeyType='search'
        />
        {isLocalLoading || isOnlineLoading ? (
          <ActivityIndicator size='small' color={Colors.primary} />
        ) : null}
      </View>

      {isEmpty ? (
        <View style={styles.emptyState}>
          {search.trim() ? (
            <>
              <Text style={styles.emptyTitle}>«{search}» не найдено</Text>
              <Text style={styles.emptySubtitle}>
                {isFatSecretConfigured
                  ? 'Попробуйте другое написание или добавьте продукт вручную'
                  : 'Добавьте продукт вручную'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyTitle}>База продуктов пуста</Text>
              <Text style={styles.emptySubtitle}>
                Отсканируйте штрихкод или добавьте продукт вручную
              </Text>
            </>
          )}
          <Pressable onPress={() => router.push('/add-product')} style={styles.addNewProductBtn}>
            <Text style={styles.addNewProductBtnText}>+ Добавить продукт вручную</Text>
          </Pressable>
        </View>
      ) : (
        <LegendList
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          estimatedItemSize={68}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        />
      )}

      {selected ? (
        <GramsSheet
          key={selected.id}
          visible
          onClose={() => setSelected(null)}
          title={selected.name}
          brand={selected.brand}
          contextLine={`Приём пищи: ${MEAL_LABELS[mealType] ?? mealType}`}
          initialGrams='100'
          computePreview={(g) => (g > 0 ? calcNutritionFromGrams(selected, g) : null)}
          confirmLabel='Добавить в дневник'
          onConfirm={handleConfirm}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.round,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h4,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  scanButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.round,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  searchIcon: {
    fontSize: 18,
    color: Colors.textTertiary,
  },
  searchInput: {
    flex: 1,
    height: 48,
    ...Typography.bodyLarge,
    color: Colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
    gap: Spacing.xs,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  productRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  productRowPressed: {
    opacity: 0.7,
  },
  productEditBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  productEditBtnText: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '600',
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    borderLeftWidth: 2,
    borderLeftColor: Colors.primaryLight,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    ...Typography.body,
    fontWeight: '500',
  },
  productBrand: {
    ...Typography.caption,
    marginTop: 1,
  },
  productMacros: {
    alignItems: 'center',
  },
  productKcal: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  productKcalLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  productMacroDetail: {
    gap: 1,
    alignItems: 'flex-end',
  },
  macroChip: {
    fontSize: 11,
    fontWeight: '600',
  },
  onlineMacroRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: 3,
  },
  onlineMacro: {
    fontSize: 11,
    fontWeight: '600',
  },
  onlineDesc: {
    ...Typography.caption,
    marginTop: 2,
    color: Colors.textTertiary,
  },
  saveOnlineBtn: {
    backgroundColor: Colors.primarySurface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  saveOnlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingTop: 60,
    gap: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h4,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    textAlign: 'center',
    color: Colors.textTertiary,
  },
  addNewProductBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primarySurface,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  addNewProductBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
})
