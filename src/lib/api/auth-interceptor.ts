import type { InternalAxiosRequestConfig } from 'axios'
import { apiClient } from './client'

type TokenProvider = () => Promise<string | null>

let tokenProvider: TokenProvider | null = null

export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider
}

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (tokenProvider) {
    const token = await tokenProvider()
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }
  }
  return config
})
