import { calcNutritionFromGrams, calcBMR, calcTDEE, calcDayScore } from '@/lib/nutrition'

describe('calcNutritionFromGrams', () => {
  const product = { kcalPer100g: 165, protein: 31, fat: 3.6, carbs: 0 }

  it('calculates nutrition for 100g', () => {
    const result = calcNutritionFromGrams(product, 100)
    expect(result.kcal).toBe(165)
    expect(result.protein).toBe(31)
    expect(result.fat).toBe(3.6)
    expect(result.carbs).toBe(0)
  })

  it('calculates nutrition for 200g', () => {
    const result = calcNutritionFromGrams(product, 200)
    expect(result.kcal).toBe(330)
    expect(result.protein).toBe(62)
  })

  it('calculates nutrition for 0g', () => {
    const result = calcNutritionFromGrams(product, 0)
    expect(result.kcal).toBe(0)
    expect(result.protein).toBe(0)
  })

  it('keeps full precision from per-100g values and grams', () => {
    const p = { kcalPer100g: 100, protein: 10, fat: 3.33, carbs: 5.55 }
    const result = calcNutritionFromGrams(p, 150)
    expect(result.kcal).toBe(150)
    expect(result.protein).toBe(15)
    expect(result.fat).toBeCloseTo(4.995, 10)
    expect(result.carbs).toBeCloseTo(8.325, 10)
  })
})

describe('calcBMR', () => {
  it('calculates male BMR (Mifflin-St Jeor)', () => {
    // 88.362 + 13.397*80 + 4.799*180 - 5.677*30
    const expected = 88.362 + 13.397 * 80 + 4.799 * 180 - 5.677 * 30
    const bmr = calcBMR(80, 180, 30, 'male')
    expect(bmr).toBeCloseTo(expected, 1)
  })

  it('calculates female BMR (Mifflin-St Jeor)', () => {
    // 447.593 + 9.247*60 + 3.098*165 - 4.33*25
    const expected = 447.593 + 9.247 * 60 + 3.098 * 165 - 4.33 * 25
    const bmr = calcBMR(60, 165, 25, 'female')
    expect(bmr).toBeCloseTo(expected, 1)
  })

  it('male BMR > female BMR for same params', () => {
    const male = calcBMR(70, 170, 30, 'male')
    const female = calcBMR(70, 170, 30, 'female')
    expect(male).toBeGreaterThan(female)
  })
})

describe('calcTDEE', () => {
  it('returns rounded result', () => {
    const tdee = calcTDEE(80, 180, 30, 'male', 'moderate')
    expect(Number.isInteger(tdee)).toBe(true)
  })

  it('very_active > sedentary', () => {
    const sedentary = calcTDEE(80, 180, 30, 'male', 'sedentary')
    const veryActive = calcTDEE(80, 180, 30, 'male', 'very_active')
    expect(veryActive).toBeGreaterThan(sedentary)
  })
})

describe('calcDayScore', () => {
  it('returns 100 for perfect adherence', () => {
    const score = calcDayScore(
      { kcal: 2000, protein: 150, fat: 60, carbs: 200 },
      { kcal: 2000, protein: 150 }
    )
    expect(score).toBe(100)
  })

  it('returns 0 for zero intake', () => {
    const score = calcDayScore(
      { kcal: 0, protein: 0, fat: 0, carbs: 0 },
      { kcal: 2000, protein: 150 }
    )
    expect(score).toBe(0)
  })

  it('is between 0 and 100', () => {
    const score = calcDayScore(
      { kcal: 1500, protein: 100, fat: 50, carbs: 150 },
      { kcal: 2000, protein: 150 }
    )
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})
