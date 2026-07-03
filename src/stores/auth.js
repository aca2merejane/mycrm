import { defineStore } from 'pinia';
import { api } from '../api';

export const useAuthStore = defineStore('auth', {
  state: () => {
    let user = null;
    try {
      const storedUser = localStorage.getItem('user');
      user = storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
      localStorage.removeItem('user');
    }

    return {
      token: localStorage.getItem('token') || null,
      user: user,
      loading: false,
    };
  },

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 1 || state.user?.role === '1' || state.user?.priv_admin === 'Y',
  },

  actions: {
    async login(email, password) {
      this.loading = true;
      try {
        const response = await api.post('/login', { email, password });
        const { token, user } = response.data;

        this.token = token;
        this.user = user;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        return true;
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
    },

    async verifyReset(username, email) {
      try {
        const response = await api.post('/verify-reset', { username, email });
        return { success: true, message: response.data.message };
      } catch (error) {
        return { 
          success: false, 
          message: error.response?.data?.message || 'Verification failed.' 
        };
      }
    },

    async resetPassword(username, email, newPassword) {
      try {
        const response = await api.post('/perform-reset', { 
          username, 
          email, 
          newPassword 
        });
        return { success: true, message: response.data.message };
      } catch (error) {
        return { 
          success: false, 
          message: error.response?.data?.message || 'Reset failed.' 
        };
      }
    },

    initAuth() {
      if (this.token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
      }
    },
  },
});
