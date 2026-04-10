import { useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, LayoutAnimation } from 'react-native'
import { Colors, MealConfig, Spacing, Radius, Typography } from '@/constants'
import { GramsSheet } from '@/components/ui/GramsSheet'
import { formatNutritionNumber, numberToInputString } from '@/lib/format-nutrition'
import type { EnrichedMealEntry } from '@/types'

interface MealSectionProps {
  mealType: string
  entries: EnrichedMealEntry[]
  onAddPress: (mealType: string) => void
  onDeleteEntry: (entry: EnrichedMealEntry) => void
  onUpdateEntryGrams: (entry: EnrichedMealEntry, grams: number) => void
}

interface MealEntryRowProps {
  entry: EnrichedMealEntry
  onEdit: () => void
  onDelete: () => void
}

function MealEntryRow({ entry, onEdit, onDelete }: MealEntryRowProps) {
  const displayName = entry.productName ?? 'Неизвестный продукт'
  return (
    <View style={styles.entryRow}>
      <Pressable
        onPress={onEdit}
        style={styles.entryInfo}
        hitSlop={4}
        accessibilityRole='button'
        accessibilityLabel={`${displayName}, ${formatNutritionNumber(entry.grams)} грамм, изменить`}
      >
        <Text style={styles.entryName} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.entryGrams}>
          {formatNutritionNumber(entry.grams)} г · нажмите, чтобы изменить
        </Text>
      </Pressable>
      <View style={styles.entryMacros}>
        <Text style={styles.entryCalories}>{formatNutritionNumber(entry.kcal)} ккал</Text>
        <View style={styles.entryMacroRow}>
          <Text style={[styles.entryMacroLabel, { color: Colors.protein }]}>
            Б {formatNutritionNumber(entry.protein)}
          </Text>
          <Text style={[styles.entryMacroLabel, { color: Colors.fat }]}>
            Ж {formatNutritionNumber(entry.fat)}
          </Text>
          <Text style={[styles.entryMacroLabel, { color: Colors.carbs }]}>
            У {formatNutritionNumber(entry.carbs)}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onDelete}
        style={styles.deleteButton}
        hitSlop={10}
        accessibilityRole='button'
        accessibilityLabel='Удалить запись'
      >
        <Text style={styles.deleteText}>✕</Text>
      </Pressable>
    </View>
  )
}

export function MealSection({
  mealType,
  entries,
  onAddPress,
  onDeleteEntry,
  onUpdateEntryGrams,
}: MealSectionProps) {
  const [expanded, setExpanded] = useState(true)
  const [editingEntry, setEditingEntry] = useState<EnrichedMealEntry | null>(null)
  const reopenLockedRef = useRef(false)
  const reopenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mc = MealConfig[mealType] ?? MealConfig.snack

  const totalCal = entries.reduce((s, e) => s + e.kcal, 0)
  const totalProtein = entries.reduce((s, e) => s + e.protein, 0)
  const totalFat = entries.reduce((s, e) => s + e.fat, 0)
  const totalCarbs = entries.reduce((s, e) => s + e.carbs, 0)

  function toggleExpanded() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded((v) => !v)
  }

  function openEdit(entry: EnrichedMealEntry) {
    if (reopenLockedRef.current) return
    setEditingEntry(entry)
  }

  function closeEditWithLock() {
    reopenLockedRef.current = true
    if (reopenTimerRef.current) {
      clearTimeout(reopenTimerRef.current)
    }
    reopenTimerRef.current = setTimeout(() => {
      reopenLockedRef.current = false
      reopenTimerRef.current = null
    }, 300)
    setEditingEntry(null)
  }

  return (
    <View style={styles.card}>
      <Pressable onPress={toggleExpanded} style={styles.header}>
        <View style={[styles.indicator, { backgroundColor: mc.tint }]} />
        <View style={styles.headerText}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.mealLabel}>{mc.label}</Text>
            <Text style={styles.mealTime}>{mc.time}</Text>
          </View>
          {entries.length > 0 ? (
            <Text style={styles.mealSummary}>
              {formatNutritionNumber(totalCal)} ккал · Б {formatNutritionNumber(totalProtein)} · Ж{' '}
              {formatNutritionNumber(totalFat)} · У {formatNutritionNumber(totalCarbs)}
            </Text>
          ) : (
            <Text style={styles.emptyHint}>Нет записей</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.chevronWrap, !expanded && styles.chevronWrapCollapsed]}>
            <Text style={styles.chevronText}>›</Text>
          </View>
        </View>
      </Pressable>

      {expanded ? (
        <View>
          {entries.map((entry) => (
            <MealEntryRow
              key={entry.id}
              entry={entry}
              onEdit={() => openEdit(entry)}
              onDelete={() => onDeleteEntry(entry)}
            />
          ))}

          <Pressable
            onPress={() => onAddPress(mealType)}
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
            accessibilityRole='button'
            accessibilityLabel={`Добавить продукт, ${mc.label}`}
          >
            <Text style={[styles.addIcon, { color: mc.tint }]}>+</Text>
            <Text style={[styles.addLabel, { color: mc.tint }]}>
              {entries.length === 0 ? 'Добавить в этот приём' : 'Добавить продукт'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {editingEntry ? (
        <GramsSheet
          key={editingEntry.id}
          visible
          onClose={closeEditWithLock}
          title={editingEntry.productName ?? 'Неизвестный продукт'}
          brand={editingEntry.brand}
          contextLine={`Приём пищи: ${mc.label}`}
          initialGrams={numberToInputString(editingEntry.grams)}
          computePreview={(g) => {
            const factor = editingEntry.grams > 0 ? g / editingEntry.grams : 0
            return {
              kcal: editingEntry.kcal * factor,
              protein: editingEntry.protein * factor,
              fat: editingEntry.fat * factor,
              carbs: editingEntry.carbs * factor,
            }
          }}
          confirmLabel='Сохранить'
          onConfirm={(grams) => {
            onUpdateEntryGrams(editingEntry, grams)
            closeEditWithLock()
          }}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingRight: Spacing.lg,
  },
  indicator: {
    width: 3,
    height: 36,
    borderRadius: Radius.round,
    marginLeft: Spacing.lg,
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mealLabel: {
    ...Typography.h4,
  },
  mealTime: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  mealSummary: {
    ...Typography.bodySmall,
    fontSize: 12,
  },
  emptyHint: {
    ...Typography.caption,
  },
  headerRight: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronWrap: {
    transform: [{ rotate: '-90deg' }],
  },
  chevronWrapCollapsed: {
    transform: [{ rotate: '90deg' }],
  },
  chevronText: {
    fontSize: 20,
    color: Colors.textTertiary,
    fontWeight: '300',
    lineHeight: 22,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  entryInfo: {
    flex: 1,
    paddingVertical: 2,
  },
  entryName: {
    ...Typography.body,
    fontWeight: '500',
  },
  entryGrams: {
    ...Typography.caption,
    marginTop: 1,
    color: Colors.textTertiary,
    fontSize: 11,
  },
  entryMacros: {
    alignItems: 'flex-end',
    gap: 2,
  },
  entryCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  entryMacroRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  entryMacroLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  deleteButton: {
    width: 26,
    height: 26,
    borderRadius: Radius.round,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  deleteText: {
    fontSize: 10,
    color: Colors.danger,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  addButtonPressed: {
    backgroundColor: Colors.background,
  },
  addIcon: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 20,
  },
  addLabel: {
    ...Typography.body,
    fontWeight: '500',
  },
})
