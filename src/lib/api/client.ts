import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { AxiosError } from 'axios'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? ''
const TIMEOUT_MS = 15_000
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1_000

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])

function shouldRetry(error: AxiosError): boolean {
  if (!error.response) return true
  return RETRYABLE_STATUS_CODES.has(error.response.status)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createApiClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  })

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const meta = config as InternalAxiosRequestConfig & { _retryCount?: number }
    meta._retryCount = meta._retryCount ?? 0
    return config
  })

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as (AxiosRequestConfig & { _retryCount?: number }) | undefined
      if (!config) return Promise.reject(error)

      const retryCount = config._retryCount ?? 0

      if (retryCount < MAX_RETRIES && shouldRetry(error)) {
        config._retryCount = retryCount + 1
        const backoff = RETRY_DELAY_MS * Math.pow(2, retryCount)
        await delay(backoff)
        return instance(config)
      }

      return Promise.reject(normalizeError(error))
    }
  )

  return instance
}

export interface ApiError {
  message: string
  status: number | null
  code: string | null
  isNetworkError: boolean
}

export function normalizeError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    return {
      message: error.response?.data?.message ?? error.message ?? 'Unknown error',
      status: error.response?.status ?? null,
      code: error.code ?? null,
      isNetworkError: !error.response,
    }
  }
  if (error instanceof Error) {
    return { message: error.message, status: null, code: null, isNetworkError: false }
  }
  return { message: 'Unknown error', status: null, code: null, isNetworkError: false }
}

export const apiClient = createApiClient()
