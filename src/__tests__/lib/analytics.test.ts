import {
  aggregatePeriodData,
  averageOfNonZero,
  buildDatesRange,
  buildRecommendations,
  buildSmartInsights,
  calcMacroDistribution,
  calcWeeklyTrend,
} from '@/lib/analytics'
import type { MealEntry } from '@/types'

function mealEntry(partial: Partial<MealEntry>): MealEntry {
  return {
    id: partial.id ?? '1',
    date: partial.date ?? '2026-04-01',
    mealType: partial.mealType ?? 'breakfast',
    productId: partial.productId ?? 'p1',
    recipeId: partial.recipeId ?? null,
    grams: partial.grams ?? 100,
    kcal: partial.kcal ?? 0,
    protein: partial.protein ?? 0,
    fat: partial.fat ?? 0,
    carbs: partial.carbs ?? 0,
    syncedAt: partial.syncedAt ?? null,
    createdAt: partial.createdAt ?? 1,
    updatedAt: partial.updatedAt ?? 1,
  }
}

describe('analytics helpers', () => {
  it('buildDatesRange returns expected number of dates', () => {
    const dates = buildDatesRange(7, '2026-04-13')
    expect(dates).toHaveLength(7)
    expect(dates[0]).toBe('2026-04-07')
    expect(dates[6]).toBe('2026-04-13')
  })

  it('aggregatePeriodData sums entries per day and keeps empty days', () => {
    const entries = [
      mealEntry({ id: 'a', date: '2026-04-10', kcal: 100, protein: 10, fat: 5, carbs: 8 }),
      mealEntry({ id: 'b', date: '2026-04-10', kcal: 200, protein: 20, fat: 10, carbs: 16 }),
      mealEntry({ id: 'c', date: '2026-04-11', kcal: 300, protein: 30, fat: 15, carbs: 24 }),
    ]
    const dates = ['2026-04-10', '2026-04-11', '2026-04-12']
    const data = aggregatePeriodData(entries, dates)
    expect(data[0].kcal).toBe(300)
    expect(data[0].protein).toBe(30)
    expect(data[2].kcal).toBe(0)
    expect(data[0].dayName.length).toBeGreaterThan(0)
  })

  it('averageOfNonZero skips zeros', () => {
    expect(averageOfNonZero([0, 100, 200])).toBe(150)
    expect(averageOfNonZero([0, 0, 0])).toBe(0)
  })

  it('calcMacroDistribution returns percentages summing close to 100', () => {
    const dist = calcMacroDistribution([
      { date: '2026-04-10', dayName: 'Пт', kcal: 0, protein: 40, fat: 30, carbs: 30 },
    ])
    expect(dist.protein).toBeCloseTo(40, 5)
    expect(dist.fat).toBeCloseTo(30, 5)
    expect(dist.carbs).toBeCloseTo(30, 5)
    expect(dist.protein + dist.fat + dist.carbs).toBeCloseTo(100, 5)
  })

  it('calcWeeklyTrend groups by week and computes averages', () => {
    const data = [
      { date: '2026-04-06', dayName: 'Пн', kcal: 1000, protein: 80, fat: 30, carbs: 100 },
      { date: '2026-04-07', dayName: 'Вт', kcal: 1500, protein: 90, fat: 40, carbs: 110 },
      { date: '2026-04-14', dayName: 'Вт', kcal: 2000, protein: 120, fat: 60, carbs: 180 },
    ]
    const trend = calcWeeklyTrend(data, { kcal: 2000, protein: 150 })
    expect(trend.length).toBe(2)
    expect(trend[0].avgKcal).toBeCloseTo(1250, 5)
    expect(trend[1].avgKcal).toBeCloseTo(2000, 5)
  })

  it('buildSmartInsights and buildRecommendations return meaningful non-empty arrays', () => {
    const args = {
      today: { date: '2026-04-13', dayName: 'Пн', kcal: 2500, protein: 90, fat: 110, carbs: 120 },
      periodData: [
        { date: '2026-04-13', dayName: 'Пн', kcal: 2500, protein: 90, fat: 110, carbs: 120 },
      ],
      goals: { kcal: 2000, protein: 150, fat: 65, carbs: 250 },
      macroDistribution: { protein: 22, fat: 50, carbs: 28 },
      calorieDeviationAvgPct: 12,
    }
    const insights = buildSmartInsights(args)
    const tips = buildRecommendations(args)
    expect(insights.length).toBeGreaterThan(0)
    expect(tips.length).toBeGreaterThan(0)
  })
})
