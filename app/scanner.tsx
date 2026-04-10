import { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { fsBarcodeToProduct } from '@/services'
import { isFatSecretConfigured } from '@/lib/api'
import { productsRepository } from '@/db/repositories'
import { getBarcodeCache, setBarcodeCache } from '@/lib/cache'
import { Colors, Spacing, Radius, Typography } from '@/constants'
import type { CreateProductInput, MealType } from '@/types'

type ScanState = 'idle' | 'scanning' | 'found' | 'not_found' | 'error'
type ScanSource = 'local' | 'fatsecret'

interface ScanResult {
  name: string
  source: ScanSource
  productId?: string
  productInput?: CreateProductInput
}

/**
 * Barcode resolution waterfall:
 * 1. Local SQLite (instant, no API call)
 * 2. MMKV cache (instant, skip API)
 * 3. FatSecret API (BY/RU locale)
 * 4. Not found → manual add
 */
async function resolveBarcode(barcode: string): Promise<
  | { found: true; source: ScanSource; productId?: string; productInput?: CreateProductInput; name: string }
  | { found: false }
> {
  // 1. Local DB
  const local = await productsRepository.findByBarcode(barcode)
  if (local) {
    return { found: true, source: 'local', productId: local.id, name: local.name }
  }

  // 2. MMKV cache (previously fetched from FatSecret)
  const cached = getBarcodeCache(barcode)
  if (cached) {
    return { found: true, source: 'fatsecret', productInput: cached, name: cached.name }
  }

  // 3. FatSecret
  if (isFatSecretConfigured) {
    const fsProduct = await fsBarcodeToProduct(barcode)
    if (fsProduct) {
      setBarcodeCache(barcode, fsProduct)
      return { found: true, source: 'fatsecret', productInput: fsProduct, name: fsProduct.name }
    }
  }

  return { found: false }
}

export default function ScannerScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const params = useLocalSearchParams<{ mealType?: string; date?: string }>()
  const mealType = (params.mealType ?? 'breakfast') as MealType
  const date = params.date ?? new Date().toISOString().slice(0, 10)

  const [permission, requestPermission] = useCameraPermissions()
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [cooldown, setCooldown] = useState(false)
  /** Camera fires many onBarcodeScanned events before React state updates — guard with a ref. */
  const scanBusyRef = useRef(false)
  const lastBarcodeRef = useRef<string | null>(null)

  useEffect(() => {
    if (!permission?.granted) {
      void requestPermission()
    }
  }, [permission, requestPermission])

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      const code = data.trim()
      if (!code) return
      if (scanBusyRef.current) return
      if (code === lastBarcodeRef.current) return
      if (cooldown || scanState === 'scanning') return

      scanBusyRef.current = true
      lastBarcodeRef.current = code
      setCooldown(true)
      setScanState('scanning')
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      try {
        const result = await resolveBarcode(code)

        if (result.found) {
          const sr: ScanResult = {
            name: result.name,
            source: result.source,
            productId: result.productId,
            productInput: result.productInput,
          }
          setScanResult(sr)
          setScanState('found')
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

          setTimeout(() => {
            if (result.productId) {
              // Already in DB — go straight to add-food with productId
              router.replace({
                pathname: '/add-food',
                params: { mealType, date, productId: result.productId },
              })
            } else if (result.productInput) {
              // Found online — go to add-food with pre-filled data as params
              router.replace({
                pathname: '/add-food',
                params: {
                  mealType,
                  date,
                  prefillName: result.productInput.name,
                  prefillBrand: result.productInput.brand ?? '',
                  prefillKcal: String(result.productInput.kcalPer100g),
                  prefillProtein: String(result.productInput.protein),
                  prefillFat: String(result.productInput.fat),
                  prefillCarbs: String(result.productInput.carbs),
                  prefillBarcode: code,
                  prefillSource: result.productInput.source,
                  prefillFatsecretId: result.productInput.fatsecretId ?? '',
                },
              })
            }
          }, 900)
        } else {
          lastBarcodeRef.current = null
          setScanState('not_found')
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        }
      } catch {
        lastBarcodeRef.current = null
        setScanState('error')
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } finally {
        setTimeout(() => {
          scanBusyRef.current = false
          setCooldown(false)
        }, 3000)
      }
    },
    [cooldown, scanState, mealType, date, router]
  )

  const handleAddManually = useCallback(() => {
    router.replace({
      pathname: '/add-food',
      params: { mealType, date },
    })
  }, [router, mealType, date])

  const handleRetry = useCallback(() => {
    scanBusyRef.current = false
    lastBarcodeRef.current = null
    setScanState('idle')
    setScanResult(null)
    setCooldown(false)
  }, [])

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.permTitle}>Доступ к камере</Text>
        <Text style={styles.permSubtitle}>
          Для сканирования штрихкодов необходим доступ к камере
        </Text>
        <Pressable style={styles.permButton} onPress={() => void requestPermission()}>
          <Text style={styles.permButtonText}>Разрешить доступ</Text>
        </Pressable>
        <Pressable style={styles.cancelLink} onPress={() => router.back()}>
          <Text style={styles.cancelLinkText}>Отмена</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing='back'
        onBarcodeScanned={scanState === 'scanning' || scanState === 'found' ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'qr', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.topTitle}>Сканер штрихкода</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Dark overlay with viewfinder cutout */}
      <View style={styles.overlay}>
        <View style={styles.darkTop} />
        <View style={styles.middleRow}>
          <View style={styles.darkSide} />
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.darkSide} />
        </View>
        <View style={styles.darkBottom} />
      </View>

      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {scanState === 'idle' ? (
          <View style={styles.hintBlock}>
            <Text style={styles.hint}>Наведите камеру на штрихкод</Text>
          </View>
        ) : null}

        {scanState === 'scanning' ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color={Colors.white} size='small' />
            <Text style={styles.statusText}>Ищем продукт...</Text>
          </View>
        ) : null}

        {scanState === 'found' && scanResult ? (
          <View style={styles.statusRow}>
            <View style={styles.sourceTag}>
              <Text style={styles.sourceTagText}>{sourceLabel(scanResult.source)}</Text>
            </View>
            <Text style={styles.statusText} numberOfLines={1}>
              {scanResult.name}
            </Text>
          </View>
        ) : null}

        {scanState === 'not_found' ? (
          <View style={styles.notFoundBlock}>
            <Text style={styles.notFoundTitle}>Продукт не найден</Text>
            <Text style={styles.notFoundSub}>Попробуйте ещё раз или добавьте вручную</Text>
            <View style={styles.notFoundActions}>
              <Pressable style={styles.retryBtn} onPress={handleRetry}>
                <Text style={styles.retryBtnText}>Сканировать снова</Text>
              </Pressable>
              <Pressable style={styles.manualBtn} onPress={handleAddManually}>
                <Text style={styles.manualBtnText}>Добавить вручную</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {scanState === 'error' ? (
          <View style={styles.notFoundBlock}>
            <Text style={styles.notFoundTitle}>Ошибка соединения</Text>
            <Pressable style={styles.retryBtn} onPress={handleRetry}>
              <Text style={styles.retryBtnText}>Попробовать снова</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  )
}

function sourceLabel(source: ScanSource): string {
  switch (source) {
    case 'local': return 'Локальная база'
    case 'fatsecret': return 'FatSecret'
  }
}

const CORNER_SIZE = 24
const CORNER_THICKNESS = 3

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxxl,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.round,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: Colors.white,
  },
  topTitle: {
    ...Typography.h4,
    color: Colors.white,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  darkTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  middleRow: {
    flexDirection: 'row',
    height: 260,
  },
  darkSide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  darkBottom: {
    flex: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  viewfinder: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.white,
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: Spacing.xl,
    zIndex: 10,
    paddingHorizontal: Spacing.xl,
  },
  hintBlock: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  hint: {
    ...Typography.body,
    color: Colors.white,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    maxWidth: '100%',
  },
  sourceTag: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    flexShrink: 0,
  },
  sourceTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.white,
    letterSpacing: 0.3,
  },
  statusText: {
    ...Typography.body,
    color: Colors.white,
    flexShrink: 1,
  },
  notFoundBlock: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  notFoundTitle: {
    ...Typography.h4,
    color: Colors.white,
  },
  notFoundSub: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  notFoundActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  retryBtnText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.white,
  },
  manualBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  manualBtnText: {
    ...Typography.bodySmall,
    color: Colors.white,
  },
  permTitle: {
    ...Typography.h2,
    textAlign: 'center',
  },
  permSubtitle: {
    ...Typography.bodySmall,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
  permButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
  },
  permButtonText: {
    ...Typography.h4,
    color: Colors.white,
  },
  cancelLink: {
    paddingVertical: Spacing.sm,
  },
  cancelLinkText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
})
