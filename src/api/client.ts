import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config';
import {notifyUnauthorized} from './authSession';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});

api.interceptors.request.use(async config => {
  const url = config.url ?? '';
  // Login endpoints must work without (or with stale) JWT — do not attach Bearer.
  if (
    url.includes('/api/auth/telegram/') ||
    url.includes('/api/login/')
  ) {
    return config;
  }
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function isAuthGuestPath(url: string): boolean {
  return (
    url.includes('/api/auth/telegram/') ||
    url.includes('/api/login/')
  );
}

api.interceptors.response.use(
  r => r,
  async error => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const url = error.config?.url ?? '';
      if ((status === 401 || status === 403) && !isAuthGuestPath(url)) {
        notifyUnauthorized();
      }
    }
    return Promise.reject(error);
  },
);
