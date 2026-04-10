import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useMealEntriesByDateQuery } from '@/hooks/useMealEntriesByDateQuery'
import { useProductsQuery } from '@/hooks/useProductsQuery'
import {
  useCreateMealEntryMutation,
  useDeleteMealEntryMutation,
} from '@/hooks/useMealEntryMutations'
import { useUndoLastMutation } from '@/hooks/useUndoLastMutation'
import { nutritionSelectors, useNutritionStore } from '@/store/nutrition.store'
import { uiSelectors, useUIStore } from '@/store/ui.store'
import type { MealType } from '@/types'

export default function DiaryScreen() {
  const selectedDate = useNutritionStore(nutritionSelectors.selectedDate)
  const mealTypeFilter = useNutritionStore(nutritionSelectors.mealTypeFilter)
  const setSelectedDate = useNutritionStore((s) => s.setSelectedDate)
  const setMealTypeFilter = useNutritionStore((s) => s.setMealTypeFilter)
  const canUndo = useNutritionStore(nutritionSelectors.canUndo)
  const isCompactMode = useUIStore(uiSelectors.isDiaryCompactMode)
  const setCompactMode = useUIStore((s) => s.setDiaryCompactMode)

  const { data: products = [], isLoading: isProductsLoading } = useProductsQuery()
  const {
    filteredEntries,
    summary,
    isLoading: isEntriesLoading,
  } = useMealEntriesByDateQuery(selectedDate, mealTypeFilter)

  const createMutation = useCreateMealEntryMutation()
  const deleteMutation = useDeleteMealEntryMutation()
  const undoMutation = useUndoLastMutation()

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  const handleQuickAdd = async () => {
    const firstProduct = products[0]
    if (!firstProduct) return

    await createMutation.mutateAsync({
      date: selectedDate,
      mealType: 'snack',
      productId: firstProduct.id,
      grams: 100,
    })
  }

  const handleDelete = async (id: string) => {
    const entry = filteredEntries.find((item) => item.id === id)
    if (!entry) return
    await deleteMutation.mutateAsync(entry)
  }

  const setFilter = (filter: MealType | 'all') => () => setMealTypeFilter(filter)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Дневник питания</Text>
      <Text style={styles.subtitle}>Дата: {selectedDate}</Text>

      <View style={styles.row}>
        <Pressable onPress={() => setSelectedDate(today)} style={styles.button}>
          <Text style={styles.buttonText}>Сегодня</Text>
        </Pressable>
        <Pressable onPress={() => setCompactMode(!isCompactMode)} style={styles.button}>
          <Text style={styles.buttonText}>
            {isCompactMode ? 'Обычный режим' : 'Компактный режим'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <Pressable onPress={setFilter('all')} style={styles.filterButton}>
          <Text style={styles.filterText}>Все</Text>
        </Pressable>
        <Pressable onPress={setFilter('breakfast')} style={styles.filterButton}>
          <Text style={styles.filterText}>Завтрак</Text>
        </Pressable>
        <Pressable onPress={setFilter('lunch')} style={styles.filterButton}>
          <Text style={styles.filterText}>Обед</Text>
        </Pressable>
        <Pressable onPress={setFilter('dinner')} style={styles.filterButton}>
          <Text style={styles.filterText}>Ужин</Text>
        </Pressable>
        <Pressable onPress={setFilter('snack')} style={styles.filterButton}>
          <Text style={styles.filterText}>Перекус</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <Pressable onPress={handleQuickAdd} style={styles.button} disabled={isProductsLoading}>
          <Text style={styles.buttonText}>Быстро добавить 100г</Text>
        </Pressable>
        <Pressable
          onPress={() => undoMutation.mutate()}
          style={[styles.button, !canUndo ? styles.buttonDisabled : null]}
          disabled={!canUndo}
        >
          <Text style={styles.buttonText}>Undo</Text>
        </Pressable>
      </View>

      {isEntriesLoading ? <Text style={styles.subtitle}>Загрузка...</Text> : null}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>Ккал: {summary.kcal.toFixed(1)}</Text>
        <Text style={styles.summaryText}>Б: {summary.protein.toFixed(1)}</Text>
        <Text style={styles.summaryText}>Ж: {summary.fat.toFixed(1)}</Text>
        <Text style={styles.summaryText}>У: {summary.carbs.toFixed(1)}</Text>
      </View>

      <View style={styles.list}>
        {filteredEntries.length === 0 ? (
          <Text style={styles.subtitle}>Записей пока нет</Text>
        ) : (
          filteredEntries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <Text style={styles.entryText}>
                {entry.mealType}: {entry.grams}г / {entry.kcal.toFixed(1)} ккал
              </Text>
              <Pressable onPress={() => handleDelete(entry.id)}>
                <Text style={styles.deleteText}>Удалить</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  subtitle: {
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    borderWidth: 1,
    borderColor: '#1DB954',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#1DB954',
    fontWeight: '600',
  },
  filterButton: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  filterText: {
    color: '#444',
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  summaryText: {
    color: '#222',
  },
  list: {
    gap: 8,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  entryText: {
    color: '#222',
  },
  deleteText: {
    color: '#D00',
    fontWeight: '600',
  },
})
