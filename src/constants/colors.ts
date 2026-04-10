export const Colors = {
  // Brand
  primary: '#16A34A',
  primaryDark: '#15803D',
  primaryLight: '#BBF7D0',
  primarySurface: '#F0FDF4',

  secondary: '#2563EB',
  secondaryLight: '#DBEAFE',

  accent: '#D97706',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',

  // Macros — subdued, professional
  protein: '#2563EB',
  proteinLight: '#EFF6FF',
  fat: '#D97706',
  fatLight: '#FFFBEB',
  carbs: '#059669',
  carbsLight: '#ECFDF5',
  calories: '#7C3AED',
  caloriesLight: '#F5F3FF',

  // Neutrals — Apple-like
  white: '#FFFFFF',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F2F7',
  surfaceElevated: '#FFFFFF',
  border: '#E5E5EA',
  borderLight: '#F2F2F7',
  separator: '#C6C6C8',

  // Text — system-like
  text: '#1C1C1E',
  textSecondary: '#6D6D72',
  textTertiary: '#AEAEB2',
  textDisabled: '#C7C7CC',
  textOnPrimary: '#FFFFFF',
  textLink: '#16A34A',

  // Meal type indicators — subtle
  breakfast: '#F59E0B',
  breakfastBg: '#FEF9EE',
  lunch: '#16A34A',
  lunchBg: '#F0FDF4',
  dinner: '#6D28D9',
  dinnerBg: '#F5F3FF',
  snack: '#0891B2',
  snackBg: '#ECFEFF',

  shadow: 'rgba(0, 0, 0, 0.04)',
  shadowMedium: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.45)',
}

export const MealConfig: Record<string, { bg: string; tint: string; time: string; label: string }> = {
  breakfast: { bg: Colors.breakfastBg, tint: Colors.breakfast, time: '07–10', label: 'Завтрак' },
  lunch: { bg: Colors.lunchBg, tint: Colors.lunch, time: '12–14', label: 'Обед' },
  dinner: { bg: Colors.dinnerBg, tint: Colors.dinner, time: '18–20', label: 'Ужин' },
  snack: { bg: Colors.snackBg, tint: Colors.snack, time: 'перекус', label: 'Перекус' },
}

export const MacroColors = {
  calories: { color: Colors.calories, bg: Colors.caloriesLight, label: 'ккал' },
  protein: { color: Colors.protein, bg: Colors.proteinLight, label: 'белки' },
  fat: { color: Colors.fat, bg: Colors.fatLight, label: 'жиры' },
  carbs: { color: Colors.carbs, bg: Colors.carbsLight, label: 'углев.' },
}
