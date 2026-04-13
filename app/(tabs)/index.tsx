import { useCallback, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, type RelativePathString } from 'expo-router'
import { useNutritionStore } from '@/store/nutrition.store'
import { useMealEntriesByDateQuery } from '@/hooks/useMealEntriesByDateQuery'
import {
  useDeleteMealEntryMutation,
  useUpdateMealEntryMutation,
} from '@/hooks/useMealEntryMutations'
import { addCalendarDaysIso, calendarTodayIso } from '@/lib/date-calendar'
import { useUndoLastMutation } from '@/hooks/useUndoLastMutation'
import { useUserProfileQuery } from '@/hooks/useUserProfileQuery'
import { MacroBar } from '@/components/ui/MacroBar'
import { DateNavigator } from '@/components/ui/DateNavigator'
import { MealSection } from '@/components/ui/MealSection'
import { UndoToast } from '@/components/ui/UndoToast'
import { Colors, Spacing, Radius, Typography } from '@/constants'
import type { EnrichedMealEntry } from '@/types'

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const

export default function DiaryScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const selectedDate = useNutritionStore((s) => s.selectedDate)
  const setSelectedDate = useNutritionStore((s) => s.setSelectedDate)
  const canUndo = useNutritionStore((s) => s.undoStack.length > 0)

  const { entriesByMeal, summary, isFetching, isPending, refetch } =
    useMealEntriesByDateQuery(selectedDate)
  const deleteMutation = useDeleteMealEntryMutation()
  const updateMealEntryMutation = useUpdateMealEntryMutation()
  const { trigger: triggerUndo } = useUndoLastMutation()
  const { data: profile } = useUserProfileQuery()

  const [undoVisible, setUndoVisible] = useState(false)
  const [undoMessage, setUndoMessage] = useState('')

  const goToPrevDay = useCallback(() => {
    setSelectedDate(addCalendarDaysIso(selectedDate, -1))
  }, [selectedDate, setSelectedDate])

  const goToNextDay = useCallback(() => {
    const today = calendarTodayIso()
    if (selectedDate >= today) return
    setSelectedDate(addCalendarDaysIso(selectedDate, 1))
  }, [selectedDate, setSelectedDate])

  const goToToday = useCallback(() => {
    setSelectedDate(calendarTodayIso())
  }, [setSelectedDate])

  const handleAddPress = useCallback(
    (mealType: string) => {
      router.push({ pathname: '/add-food', params: { mealType, date: selectedDate } })
    },
    [router, selectedDate]
  )

  const handleDeleteEntry = useCallback(
    (entry: EnrichedMealEntry) => {
      const name = entry.productName ?? 'продукт'
      deleteMutation.mutate(entry, {
        onSuccess: () => {
          setUndoMessage(`Удалено: ${name}`)
          setUndoVisible(true)
        },
      })
    },
    [deleteMutation]
  )

  const handleUpdateEntryGrams = useCallback(
    (entry: EnrichedMealEntry, grams: number) => {
      updateMealEntryMutation.mutate({ entry, grams })
    },
    [updateMealEntryMutation]
  )

  const handleUndo = useCallback(() => {
    setUndoVisible(false)
    triggerUndo()
  }, [triggerUndo])

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Дневник</Text>
        <Pressable
          onPress={() => router.push('/add-recipe' as RelativePathString)}
          style={({ pressed }) => [styles.addProductBtn, pressed && styles.addProductBtnPressed]}
          accessibilityRole='button'
          accessibilityLabel='Добавить рецепт'
        >
          <Text style={styles.addProductBtnText}>+ Добавить рецепт</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isPending}
            onRefresh={() => void refetch()}
            tintColor={Colors.primary}
          />
        }
      >
        <DateNavigator
          date={selectedDate}
          onPrev={goToPrevDay}
          onNext={goToNextDay}
          onToday={goToToday}
        />

        <MacroBar
          calories={summary.kcal}
          caloriesGoal={profile?.calorieGoal ?? 2000}
          protein={summary.protein}
          proteinGoal={profile?.proteinGoal ?? 150}
          fat={summary.fat}
          fatGoal={profile?.fatGoal ?? 65}
          carbs={summary.carbs}
          carbsGoal={profile?.carbsGoal ?? 250}
        />

        {MEAL_ORDER.map((mealType) => (
          <MealSection
            key={mealType}
            mealType={mealType}
            entries={entriesByMeal[mealType] ?? []}
            onAddPress={handleAddPress}
            onDeleteEntry={handleDeleteEntry}
            onUpdateEntryGrams={handleUpdateEntryGrams}
          />
        ))}
      </ScrollView>

      <UndoToast
        visible={undoVisible && canUndo}
        message={undoMessage}
        onUndo={handleUndo}
        onDismiss={() => setUndoVisible(false)}
      />
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
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    ...Typography.h2,
    flexShrink: 0,
  },
  addProductBtn: {
    flexShrink: 1,
    backgroundColor: Colors.primarySurface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  addProductBtnPressed: {
    opacity: 0.85,
  },
  addProductBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
})
