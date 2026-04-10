import { View, Text, StyleSheet } from 'react-native'
import { Colors, MacroColors, Spacing, Radius, Typography } from '@/constants'
import { formatNutritionNumber } from '@/lib/format-nutrition'

interface MacroBarProps {
  calories: number
  caloriesGoal: number
  protein: number
  proteinGoal: number
  fat: number
  fatGoal: number
  carbs: number
  carbsGoal: number
}

function MacroCol({
  label,
  value,
  goal,
  color,
}: {
  label: string
  value: number
  goal: number
  color: string
}) {
  return (
    <View style={styles.macroCol}>
      <Text style={styles.macroColLabel}>{label}</Text>
      <Text style={[styles.macroColValue, { color }]}>{formatNutritionNumber(value)}</Text>
      <Text style={styles.macroColGoal}>из {formatNutritionNumber(goal)} г</Text>
    </View>
  )
}

export function MacroBar({
  calories,
  caloriesGoal,
  protein,
  proteinGoal,
  fat,
  fatGoal,
  carbs,
  carbsGoal,
}: MacroBarProps) {
  const calPct = caloriesGoal > 0 ? Math.min(calories / caloriesGoal, 1) : 0
  const remaining = Math.max(caloriesGoal - calories, 0)
  const isOver = calories > caloriesGoal && caloriesGoal > 0

  return (
    <View style={styles.container}>
      <View style={styles.caloriesBlock}>
        <Text style={styles.caloriesKcal}>{formatNutritionNumber(calories)}</Text>
        <Text style={styles.caloriesUnit}>ккал</Text>
        <Text style={styles.caloriesGoalLine}>
          цель {formatNutritionNumber(caloriesGoal)} ккал · осталось{' '}
          <Text style={isOver ? styles.overText : styles.remainingEm}>
            {isOver
              ? `+${formatNutritionNumber(calories - caloriesGoal)}`
              : formatNutritionNumber(remaining)}
          </Text>
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${calPct * 100}%`,
              backgroundColor: isOver ? Colors.danger : Colors.primary,
            },
          ]}
        />
      </View>

      <View style={styles.macrosRow}>
        <MacroCol
          label='Белки'
          value={protein}
          goal={proteinGoal}
          color={MacroColors.protein.color}
        />
        <View style={styles.divider} />
        <MacroCol label='Жиры' value={fat} goal={fatGoal} color={MacroColors.fat.color} />
        <View style={styles.divider} />
        <MacroCol label='Углеводы' value={carbs} goal={carbsGoal} color={MacroColors.carbs.color} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  caloriesBlock: {
    alignItems: 'center',
    gap: 2,
  },
  caloriesKcal: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  caloriesUnit: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: -2,
  },
  caloriesGoalLine: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  remainingEm: {
    fontWeight: '700',
    color: Colors.primary,
  },
  overText: {
    fontWeight: '700',
    color: Colors.danger,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.round,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.round,
  },
  macrosRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: Spacing.xs,
  },
  macroCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  macroColLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  macroColValue: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  macroColGoal: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
})
