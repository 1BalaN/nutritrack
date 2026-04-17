export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (search: string) => ['products', 'list', search] as const,
    byId: (id: string) => ['products', 'by-id', id] as const,
  },
  mealEntries: {
    all: ['meal-entries'] as const,
    byDate: (date: string) => ['meal-entries', 'by-date', date] as const,
    summaryByDate: (date: string) => ['meal-entries', 'summary-by-date', date] as const,
  },
  recipes: {
    all: ['recipes'] as const,
    list: (search: string) => ['recipes', 'list', search] as const,
    byId: (id: string) => ['recipes', 'by-id', id] as const,
  },
} as const
