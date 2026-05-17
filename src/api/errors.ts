import axios from 'axios';

type ApiErrorPayload = {
  message?: string;
  code?: string;
  detail?: string;
  reason?: string;
};

function readPayload(err: unknown): ApiErrorPayload | undefined {
  if (!axios.isAxiosError(err)) {
    return undefined;
  }
  const data = err.response?.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as ApiErrorPayload;
  }
  return undefined;
}

/** Код ошибки с бэкенда (`FarmingPoolError` и др.), если есть. */
export function getApiErrorCode(err: unknown): string | undefined {
  const code = readPayload(err)?.code;
  return typeof code === 'string' && code.length > 0 ? code : undefined;
}

/** Builds user-visible text from axios/API errors (includes server `detail` when present). */
export function formatApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = readPayload(err);
    if (data) {
      const parts = [data.message, data.detail].filter(Boolean);
      if (parts.length) {
        return parts.join('\n');
      }
    }
    if (!err.response) {
      return err.message || 'Network error';
    }
    return err.message;
  }
  return err instanceof Error ? err.message : String(err);
}
