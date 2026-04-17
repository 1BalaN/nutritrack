export { apiClient, normalizeError } from './client'
export type { ApiError } from './client'
export { setTokenProvider } from './auth-interceptor'
export {
  fsFindByBarcode,
  fsSearchFoods,
  fsGetFood,
  getDailyUsage,
  isFatSecretConfigured,
} from './fatsecret.client'
export type { FatSecretFood, FatSecretServing, FatSecretSearchResult } from './fatsecret.client'
