import { calcDayScore } from '@/lib/nutrition'
import type { MealEntry, NutritionSummary } from '@/types'

export const PERIOD_OPTIONS = [7, 30, 90] as const
export type PeriodDays = (typeof PERIOD_OPTIONS)[number]

const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const

export type DayAnalytics = {
  date: string
  dayName: string
  kcal: number
  protein: number
  fat: number
  carbs: number
}

export type AnalyticsGoals = {
  kcal: number
  protein: number
  fat: number
  carbs: number
}

export type WeeklyTrendPoint = {
  weekStart: string
  avgKcal: number
  avgScore: number
}

export function buildDatesRange(lastNDays: number, todayIso: string): string[] {
  const [y, m, d] = todayIso.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  return Array.from({ length: lastNDays }, (_, i) => {
    const dt = new Date(base)
    dt.setDate(dt.getDate() - (lastNDays - 1 - i))
    const yy = dt.getFullYear()
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const dd = String(dt.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  })
}

function dayNameFromIso(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0)
  return DAYS_RU[dt.getDay()]
}

export function aggregatePeriodData(entries: MealEntry[], dates: string[]): DayAnalytics[] {
  const byDate = new Map<string, NutritionSummary>()
  for (const e of entries) {
    const prev = byDate.get(e.date) ?? { kcal: 0, protein: 0, fat: 0, carbs: 0 }
    byDate.set(e.date, {
      kcal: prev.kcal + e.kcal,
      protein: prev.protein + e.protein,
      fat: prev.fat + e.fat,
      carbs: prev.carbs + e.carbs,
    })
  }
  return dates.map((date) => {
    const n = byDate.get(date) ?? { kcal: 0, protein: 0, fat: 0, carbs: 0 }
    return { date, dayName: dayNameFromIso(date), ...n }
  })
}

export function averageOfNonZero(values: number[]) {
  const nonZero = values.filter((v) => v > 0)
  if (nonZero.length === 0) return 0
  return nonZero.reduce((sum, v) => sum + v, 0) / nonZero.length
}

export function calcMacroDistribution(periodData: DayAnalytics[]) {
  const protein = periodData.reduce((s, d) => s + d.protein, 0)
  const fat = periodData.reduce((s, d) => s + d.fat, 0)
  const carbs = periodData.reduce((s, d) => s + d.carbs, 0)
  const total = protein + fat + carbs
  return {
    protein: total > 0 ? (protein / total) * 100 : 0,
    fat: total > 0 ? (fat / total) * 100 : 0,
    carbs: total > 0 ? (carbs / total) * 100 : 0,
  }
}

function startOfWeekIso(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const day = dt.getDay()
  const diff = (day + 6) % 7 // monday-based
  dt.setDate(dt.getDate() - diff)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function calcWeeklyTrend(
  periodData: DayAnalytics[],
  goals: Pick<AnalyticsGoals, 'kcal' | 'protein'>
) {
  const map = new Map<string, { kcal: number; scoreSum: number; days: number }>()
  for (const d of periodData) {
    const key = startOfWeekIso(d.date)
    const prev = map.get(key) ?? { kcal: 0, scoreSum: 0, days: 0 }
    const score = calcDayScore(
      { kcal: d.kcal, protein: d.protein, fat: d.fat, carbs: d.carbs },
      { kcal: goals.kcal, protein: goals.protein }
    )
    map.set(key, {
      kcal: prev.kcal + d.kcal,
      scoreSum: prev.scoreSum + score,
      days: prev.days + 1,
    })
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, v]) => ({
      weekStart,
      avgKcal: v.days > 0 ? v.kcal / v.days : 0,
      avgScore: v.days > 0 ? v.scoreSum / v.days : 0,
    }))
    .slice(-6) satisfies WeeklyTrendPoint[]
}

export function buildSmartInsights(args: {
  today: DayAnalytics
  periodData: DayAnalytics[]
  goals: AnalyticsGoals
  macroDistribution: { protein: number; fat: number; carbs: number }
  calorieDeviationAvgPct: number
}) {
  const { today, periodData, goals, macroDistribution, calorieDeviationAvgPct } = args
  const list: string[] = []

  if (today.kcal > goals.kcal * 1.1) list.push('Сегодня калорий выше цели более чем на 10%')
  if (today.kcal > 0 && today.kcal < goals.kcal * 0.8)
    list.push('Сегодня калорий заметно меньше цели')
  if (today.protein < goals.protein * 0.9) list.push('Белка за день не хватает до целевого уровня')
  if (macroDistribution.fat > 40) list.push('Доля жиров в рационе высокая для выбранного периода')
  if (macroDistribution.carbs < 25 && periodData.some((d) => d.kcal > 0)) {
    list.push('Углеводов в среднем мало — возможна просадка энергии')
  }
  if (calorieDeviationAvgPct > 8) list.push('В среднем по периоду есть устойчивый профицит калорий')
  if (calorieDeviationAvgPct < -8) list.push('В среднем по периоду есть устойчивый дефицит калорий')
  if (list.length === 0) list.push('Рацион в целом близок к целям — хорошая стабильность')
  return list.slice(0, 4)
}

export function buildRecommendations(args: {
  today: DayAnalytics
  goals: AnalyticsGoals
  macroDistribution: { protein: number; fat: number; carbs: number }
}) {
  const { today, goals, macroDistribution } = args
  const tips: string[] = []

  if (today.protein < goals.protein * 0.9) {
    tips.push('Добавьте 1 белковый приём: творог, яйца, птица или протеин-йогурт')
  }
  if (today.kcal > goals.kcal * 1.1) {
    tips.push('Снизьте калорийность ужина: больше овощей, меньше масел и быстрых углеводов')
  }
  if (today.kcal > 0 && today.kcal < goals.kcal * 0.8) {
    tips.push('Добавьте небольшой полезный перекус, чтобы не уходить в сильный дефицит')
  }
  if (macroDistribution.fat > 40) tips.push('Сместите баланс в сторону белка и сложных углеводов')
  if (tips.length === 0) tips.push('Продолжайте текущий режим — динамика выглядит здоровой')
  return tips.slice(0, 3)
}
