import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { authService } from './authService';
import { ApiError } from './apiError';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      if (!API_BASE_URL) return config;

      const apiOrigin = new URL(API_BASE_URL).origin;
      const requestUrl = new URL(config.url || '', config.baseURL || API_BASE_URL);
      if (requestUrl.origin !== apiOrigin) {
        throw new ApiError('Refusing to send a backend request to a different origin.', {
          userMessage: 'The API client blocked a request outside the configured backend origin.',
        });
      }

      const token = await authService.getAccessToken();
      if (authService.isConfigured() && !token) {
        throw new ApiError('No backend API access token is available.', {
          status: 401,
          userMessage: 'Sign in with Microsoft Entra ID before accessing the backend.',
        });
      }
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    } catch (error) {
      return Promise.reject(ApiError.fromError(error));
    }
  },
  (error: unknown) => Promise.reject(ApiError.fromError(error))
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(ApiError.fromError(error))
);

export default apiClient;
