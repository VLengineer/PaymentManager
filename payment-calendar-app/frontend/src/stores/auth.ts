import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('access_token'));

  const isAuthenticated = computed(() => !!token.value);
  const isFinDirector = computed(() => user.value?.role === 'FIN_DIRECTOR');
  const isAdmin = computed(() => user.value?.role === 'ADMIN');
  const isRP = computed(() => user.value?.role === 'RP');

  function setUser(newUser: User | null) {
    user.value = newUser;
  }

  function setToken(newToken: string | null) {
    token.value = newToken;
    if (newToken) {
      localStorage.setItem('access_token', newToken);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
  }

  return {
    user,
    token,
    isAuthenticated,
    isFinDirector,
    isAdmin,
    isRP,
    setUser,
    setToken,
    logout,
  };
});
