import { useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { mealEntriesRepository } from '@/db/repositories'
import { useUserProfileQuery } from '@/hooks/useUserProfileQuery'
import { Colors, Spacing, Radius, Typography, MacroColors } from '@/constants'
import { formatNutritionNumber } from '@/lib/format-nutrition'

function WeekBar({
  day,
  calories,
  goal,
  isToday,
}: {
  day: string
  calories: number
  goal: number
  isToday: boolean
}) {
  const pct = goal > 0 ? Math.min(calories / goal, 1) : 0
  const color =
    pct >= 0.9 && pct <= 1.1 ? Colors.primary : pct > 1.1 ? Colors.danger : Colors.secondary

  return (
    <View style={barStyles.col}>
      <Text style={barStyles.calLabel}>{calories > 0 ? formatNutritionNumber(calories) : ''}</Text>
      <View style={barStyles.track}>
        <View
          style={[barStyles.fill, { height: `${Math.max(pct * 100, 2)}%`, backgroundColor: color }]}
        />
      </View>
      <Text style={[barStyles.dayLabel, isToday && barStyles.dayLabelToday]}>{day}</Text>
    </View>
  )
}

const barStyles = StyleSheet.create({
  col: { flex: 1, alignItems: 'center', gap: 4 },
  calLabel: { fontSize: 9, color: Colors.textTertiary, height: 12 },
  track: {
    width: 28,
    height: 80,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  fill: { width: '100%', borderRadius: Radius.sm },
  dayLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  dayLabelToday: { color: Colors.primary, fontWeight: '700' },
})

const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets()
  const { data: profile } = useUserProfileQuery()

  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const weekDates = useMemo(() => {
    const base = new Date(todayIso + 'T00:00:00')
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(d.getDate() - (6 - i))
      return d.toISOString().slice(0, 10)
    })
  }, [todayIso])

  const fromDate = weekDates[0]
  const toDate = weekDates[6]

  const { data: entries } = useQuery({
    queryKey: ['mealEntries', 'range', fromDate, toDate],
    queryFn: () => mealEntriesRepository.findByDateRange(fromDate, toDate),
  })

  const weekData = useMemo(() => {
    return weekDates.map((date) => {
      const dayEntries = (entries ?? []).filter((e) => e.date === date)
      const kcal = dayEntries.reduce((s, e) => s + e.kcal, 0)
      const protein = dayEntries.reduce((s, e) => s + e.protein, 0)
      const fat = dayEntries.reduce((s, e) => s + e.fat, 0)
      const carbs = dayEntries.reduce((s, e) => s + e.carbs, 0)
      const d = new Date(date + 'T00:00:00')
      return { date, kcal, protein, fat, carbs, dayName: DAYS_RU[d.getDay()] }
    })
  }, [entries, weekDates])

  const avgKcal =
    weekData.length > 0
      ? weekData.filter((d) => d.kcal > 0).reduce((s, d) => s + d.kcal, 0) /
        Math.max(weekData.filter((d) => d.kcal > 0).length, 1)
      : 0

  const goal = profile?.calorieGoal ?? 2000
  const todayStr = todayIso

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Аналитика</Text>
        <Text style={styles.subtitle}>За последние 7 дней</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Калории по дням</Text>
          <View style={styles.barsRow}>
            {weekData.map((d) => (
              <WeekBar
                key={d.date}
                day={d.dayName}
                calories={d.kcal}
                goal={goal}
                isToday={d.date === todayStr}
              />
            ))}
          </View>
          <View style={styles.goalLine}>
            <Text style={styles.goalLineText}>Цель: {formatNutritionNumber(goal)} ккал</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statValue, { color: Colors.calories }]}>
              {formatNutritionNumber(avgKcal)}
            </Text>
            <Text style={styles.statLabel}>ккал / день</Text>
            <Text style={styles.statCaption}>среднее</Text>
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>
              {weekData.filter((d) => d.kcal > 0 && d.kcal <= goal * 1.05).length}
            </Text>
            <Text style={styles.statLabel}>дней в норме</Text>
            <Text style={styles.statCaption}>из 7</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Средние макронутриенты</Text>
          {(['protein', 'fat', 'carbs'] as const).map((macro) => {
            const avg =
              weekData.filter((d) => d.kcal > 0).reduce((s, d) => s + d[macro], 0) /
              Math.max(weekData.filter((d) => d.kcal > 0).length, 1)
            const mc = MacroColors[macro]
            return (
              <View key={macro} style={styles.macroRow}>
                <Text style={[styles.macroName, { color: mc.color }]}>{mc.label}</Text>
                <View style={styles.macroBarTrack}>
                  <View
                    style={[
                      styles.macroBarFill,
                      { width: `${Math.min((avg / 200) * 100, 100)}%`, backgroundColor: mc.color },
                    ]}
                  />
                </View>
                <Text style={styles.macroValue}>{formatNutritionNumber(avg)} г</Text>
              </View>
            )
          })}
        </View>

        <View style={[styles.card, styles.comingSoon]}>
          <Text style={styles.comingSoonEmoji}>🚀</Text>
          <Text style={styles.comingSoonTitle}>Расширенная аналитика</Text>
          <Text style={styles.comingSoonText}>
            Графики прогресса, динамика веса и детальный анализ питания — скоро
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  title: { ...Typography.h2 },
  subtitle: { ...Typography.caption, marginTop: 2 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  cardTitle: { ...Typography.h4 },
  barsRow: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'flex-end' },
  goalLine: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  goalLineText: { ...Typography.caption, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 2,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  statValue: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  statLabel: { ...Typography.body, fontWeight: '600', textAlign: 'center' },
  statCaption: { ...Typography.caption },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  macroName: {
    width: 60,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  macroBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.round,
    overflow: 'hidden',
  },
  macroBarFill: { height: '100%', borderRadius: Radius.round },
  macroValue: { ...Typography.body, fontWeight: '600', width: 50, textAlign: 'right' },
  comingSoon: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  comingSoonEmoji: { fontSize: 40 },
  comingSoonTitle: { ...Typography.h3 },
  comingSoonText: { ...Typography.bodySmall, textAlign: 'center' },
})
