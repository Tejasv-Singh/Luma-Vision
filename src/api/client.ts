import axios, { AxiosError, type AxiosInstance } from 'axios';
import { config } from '@/utils/config';
import type { ApiError } from '@/types';

/**
 * Shared axios instance. Upload calls override the timeout because a 2 GB
 * broadcast file will happily exceed any sane default.
 */
export const http: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.apiTimeoutMs,
  headers: { Accept: 'application/json' },
});

/** Normalises anything thrown by axios (or the mock) into an `ApiError`. */
export function toApiError(error: unknown): ApiError {
  if (axios.isCancel(error)) {
    return { code: 'CANCELLED', message: 'Request was cancelled.' };
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const payload = error.response?.data as { message?: string; detail?: string } | undefined;

    if (error.code === 'ECONNABORTED') {
      return { code: 'TIMEOUT', message: 'The request timed out. Please try again.' };
    }
    if (!error.response) {
      return {
        code: 'NETWORK',
        message: 'Cannot reach the analysis service. Check your connection and try again.',
      };
    }
    if (status === 404) {
      return { code: 'NOT_FOUND', message: 'That analysis no longer exists.', status };
    }
    if (status === 413) {
      return { code: 'TOO_LARGE', message: 'The video exceeds the maximum upload size.', status };
    }
    return {
      code: 'HTTP_ERROR',
      message: payload?.message ?? payload?.detail ?? `Request failed with status ${status}.`,
      status,
    };
  }

  if (error instanceof Error) {
    return { code: 'UNKNOWN', message: error.message };
  }

  return { code: 'UNKNOWN', message: 'Something went wrong. Please try again.' };
}

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);

/** Type guard so `catch` blocks can narrow without casting. */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as ApiError).message === 'string'
  );
}

export function errorMessage(value: unknown): string {
  if (isApiError(value)) return value.message;
  if (value instanceof Error) return value.message;
  return 'Something went wrong. Please try again.';
}
