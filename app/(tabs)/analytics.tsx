import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Platform, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUserProfileQuery } from '@/hooks/useUserProfileQuery'
import { useAnalyticsData } from '@/hooks/useAnalyticsData'
import { PERIOD_OPTIONS, type PeriodDays } from '@/lib/analytics'
import { Colors, Spacing, Radius, Typography, MacroColors } from '@/constants'
import { formatNutritionNumber } from '@/lib/format-nutrition'
import type { DayAnalytics } from '@/lib/analytics'

const ANDROID_TABBAR_OVERLAY_GAP = 72

function DayBar({
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

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets()
  const { data: profile } = useUserProfileQuery()
  const [periodDays, setPeriodDays] = useState<PeriodDays>(7)

  const analytics = useAnalyticsData(periodDays, profile)

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Аналитика</Text>
        <Text style={styles.subtitle}>Питание и прогресс</Text>
      </View>

      <View style={styles.periodRow}>
        {PERIOD_OPTIONS.map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriodDays(p)}
            style={({ pressed }) => [
              styles.periodChip,
              periodDays === p && styles.periodChipActive,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.periodChipText, periodDays === p && styles.periodChipTextActive]}>
              {p}д
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === 'android' ? ANDROID_TABBAR_OVERLAY_GAP : 24),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Калории по дням</Text>
          <View style={styles.barsRow}>
            {analytics.weekData.map((d: DayAnalytics) => (
              <DayBar
                key={d.date}
                day={d.dayName}
                calories={d.kcal}
                goal={analytics.goals.kcal}
                isToday={d.date === analytics.todayIso}
              />
            ))}
          </View>
          <View style={styles.goalLine}>
            <Text style={styles.goalLineText}>
              Цель: {formatNutritionNumber(analytics.goals.kcal)} ккал · период: {periodDays} дней
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statValue, { color: Colors.calories }]}>
              {formatNutritionNumber(analytics.avgKcal)}
            </Text>
            <Text style={styles.statLabel}>ккал / день</Text>
            <Text style={styles.statCaption}>среднее</Text>
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>
              {analytics.daysInNorm}
            </Text>
            <Text style={styles.statLabel}>дней в норме</Text>
            <Text style={styles.statCaption}>из {periodDays}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Day Score и отклонение</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { flex: 1 }]}>
              <Text
                style={[
                  styles.statValue,
                  { color: analytics.dayScoreToday >= 80 ? Colors.primary : Colors.accent },
                ]}
              >
                {formatNutritionNumber(analytics.dayScoreToday)}
              </Text>
              <Text style={styles.statLabel}>Day Score</Text>
              <Text style={styles.statCaption}>сегодня</Text>
            </View>
            <View style={[styles.statCard, { flex: 1 }]}>
              <Text style={[styles.statValue, { color: Colors.secondary }]}>
                {formatNutritionNumber(analytics.avgDayScore)}
              </Text>
              <Text style={styles.statLabel}>Day Score</Text>
              <Text style={styles.statCaption}>средний</Text>
            </View>
          </View>
          <View style={styles.deviationBlock}>
            <Text style={styles.deviationTitle}>Отклонение калорий от цели</Text>
            <Text
              style={[
                styles.deviationValue,
                analytics.calorieDeviationAvgPct > 8
                  ? { color: Colors.danger }
                  : analytics.calorieDeviationAvgPct < -8
                    ? { color: Colors.secondary }
                    : { color: Colors.primary },
              ]}
            >
              {analytics.calorieDeviationAvgPct > 0 ? '+' : ''}
              {formatNutritionNumber(analytics.calorieDeviationAvgPct)}%
            </Text>
            <Text style={styles.statCaption}>в среднем за выбранный период</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Распределение БЖУ</Text>
          {(['protein', 'fat', 'carbs'] as const).map((macro) => {
            const mc = MacroColors[macro]
            const pct = analytics.macroDistribution[macro]
            return (
              <View key={`${macro}-dist`} style={styles.macroRow}>
                <Text style={[styles.macroName, { color: mc.color }]}>{mc.label}</Text>
                <View style={styles.macroBarTrack}>
                  <View
                    style={[
                      styles.macroBarFill,
                      {
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: mc.color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.macroValue}>{formatNutritionNumber(pct)}%</Text>
              </View>
            )
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Средние БЖУ в граммах</Text>
          {(['protein', 'fat', 'carbs'] as const).map((macro) => {
            const avg = analytics.avgByMacro[macro]
            const mc = MacroColors[macro]
            const goalByMacro =
              macro === 'protein'
                ? analytics.goals.protein
                : macro === 'fat'
                  ? analytics.goals.fat
                  : analytics.goals.carbs
            return (
              <View key={macro} style={styles.macroRow}>
                <Text style={[styles.macroName, { color: mc.color }]}>{mc.label}</Text>
                <View style={styles.macroBarTrack}>
                  <View
                    style={[
                      styles.macroBarFill,
                      {
                        width: `${Math.min((avg / Math.max(goalByMacro, 1)) * 100, 100)}%`,
                        backgroundColor: mc.color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.macroValue}>{formatNutritionNumber(avg)} г</Text>
              </View>
            )
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Тренд по неделям</Text>
          {analytics.weeklyTrend.map((w) => (
            <View key={w.weekStart} style={styles.trendRow}>
              <Text style={styles.trendWeek}>Неделя {w.weekStart.slice(5)}</Text>
              <Text style={styles.trendMetric}>
                {formatNutritionNumber(w.avgKcal)} ккал/день · Score{' '}
                {formatNutritionNumber(w.avgScore)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Smart Insights</Text>
          {analytics.smartInsights.map((ins, idx) => (
            <Text key={`ins-${idx}`} style={styles.bulletText}>
              • {ins}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Рекомендации</Text>
          {analytics.recommendations.map((tip, idx) => (
            <Text key={`tip-${idx}`} style={styles.bulletText}>
              • {tip}
            </Text>
          ))}
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
  periodRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  periodChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodChipActive: {
    backgroundColor: Colors.primarySurface,
    borderColor: Colors.primaryLight,
  },
  periodChipText: { ...Typography.caption, fontWeight: '600', color: Colors.textSecondary },
  periodChipTextActive: { color: Colors.primary },
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
  deviationBlock: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  deviationTitle: { ...Typography.caption, color: Colors.textSecondary },
  deviationValue: { fontSize: 22, fontWeight: '700' },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  trendWeek: { ...Typography.caption, color: Colors.textSecondary },
  trendMetric: { ...Typography.bodySmall, fontWeight: '600' },
  bulletText: { ...Typography.bodySmall, lineHeight: 20, color: Colors.textSecondary },
})
