import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { mealEntriesRepository } from '@/db/repositories'
import { calcDayScore } from '@/lib/nutrition'
import { calendarTodayIso } from '@/lib/date-calendar'
import {
  aggregatePeriodData,
  averageOfNonZero,
  buildDatesRange,
  buildRecommendations,
  buildSmartInsights,
  calcMacroDistribution,
  calcWeeklyTrend,
  type PeriodDays,
} from '@/lib/analytics'
import type { UserProfile } from '@/types'

export function useAnalyticsData(periodDays: PeriodDays, profile?: UserProfile | undefined) {
  const todayIso = calendarTodayIso()
  const periodDates = useMemo(() => buildDatesRange(periodDays, todayIso), [periodDays, todayIso])
  const fromDate = periodDates[0]
  const toDate = periodDates[periodDates.length - 1]

  const goals = useMemo(
    () => ({
      kcal: profile?.calorieGoal ?? 2000,
      protein: profile?.proteinGoal ?? 150,
      fat: profile?.fatGoal ?? 65,
      carbs: profile?.carbsGoal ?? 250,
    }),
    [profile]
  )

  const query = useQuery({
    queryKey: ['analytics', 'period', fromDate, toDate, periodDays],
    queryFn: () => mealEntriesRepository.findByDateRange(fromDate, toDate),
  })

  const periodData = useMemo(
    () => aggregatePeriodData(query.data ?? [], periodDates),
    [query.data, periodDates]
  )
  const weekData = useMemo(() => periodData.slice(-7), [periodData])

  const avgKcal = useMemo(() => averageOfNonZero(periodData.map((d) => d.kcal)), [periodData])
  const avgByMacro = useMemo(
    () => ({
      protein: averageOfNonZero(periodData.map((d) => d.protein)),
      fat: averageOfNonZero(periodData.map((d) => d.fat)),
      carbs: averageOfNonZero(periodData.map((d) => d.carbs)),
    }),
    [periodData]
  )

  const macroDistribution = useMemo(() => calcMacroDistribution(periodData), [periodData])
  const calorieDeviationAvgPct = goals.kcal > 0 ? ((avgKcal - goals.kcal) / goals.kcal) * 100 : 0

  const today = useMemo(
    () =>
      periodData.find((d) => d.date === todayIso) ?? {
        date: todayIso,
        dayName: '',
        kcal: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
      },
    [periodData, todayIso]
  )

  const dayScoreToday = useMemo(
    () =>
      calcDayScore(
        { kcal: today.kcal, protein: today.protein, fat: today.fat, carbs: today.carbs },
        { kcal: goals.kcal, protein: goals.protein }
      ),
    [today, goals]
  )

  const avgDayScore = useMemo(() => {
    const scores = periodData
      .filter((d) => d.kcal > 0 || d.protein > 0 || d.fat > 0 || d.carbs > 0)
      .map((d) =>
        calcDayScore(
          { kcal: d.kcal, protein: d.protein, fat: d.fat, carbs: d.carbs },
          { kcal: goals.kcal, protein: goals.protein }
        )
      )
    return scores.length ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0
  }, [periodData, goals])

  const weeklyTrend = useMemo(
    () => calcWeeklyTrend(periodData, { kcal: goals.kcal, protein: goals.protein }),
    [periodData, goals]
  )

  const smartInsights = useMemo(
    () =>
      buildSmartInsights({
        today,
        periodData,
        goals,
        macroDistribution,
        calorieDeviationAvgPct,
      }),
    [today, periodData, goals, macroDistribution, calorieDeviationAvgPct]
  )

  const recommendations = useMemo(
    () => buildRecommendations({ today, goals, macroDistribution }),
    [today, goals, macroDistribution]
  )

  const daysInNorm = useMemo(
    () => periodData.filter((d) => d.kcal > 0 && d.kcal <= goals.kcal * 1.05).length,
    [periodData, goals.kcal]
  )

  return {
    ...query,
    todayIso,
    periodDates,
    periodData,
    weekData,
    goals,
    avgKcal,
    avgByMacro,
    macroDistribution,
    calorieDeviationAvgPct,
    dayScoreToday,
    avgDayScore,
    weeklyTrend,
    smartInsights,
    recommendations,
    daysInNorm,
  }
}
