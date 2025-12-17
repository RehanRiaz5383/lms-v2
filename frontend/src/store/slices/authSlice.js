import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { API_ENDPOINTS, getStorageUrl, normalizeStorageUrl } from '../../config/api';
import { storage } from '../../utils/storage';

// Initial state
const initialState = {
  user: storage.getUser(),
  token: storage.getToken(),
  isAuthenticated: !!storage.getToken(),
  loading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await apiService.post(API_ENDPOINTS.auth.login, credentials);
      const { data } = response.data;
      
      // Store token and user data
      storage.setToken(data.token);
      storage.setUser(data.user);
      
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Login failed'
      );
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await apiService.post(API_ENDPOINTS.auth.logout);
      storage.clearAuth();
      return null;
    } catch (error) {
      // Clear auth even if API call fails
      storage.clearAuth();
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Logout failed'
      );
    }
  }
);

export const getMe = createAsyncThunk(
  'auth/getMe',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get(API_ENDPOINTS.auth.me);
      const { data } = response.data;
      storage.setUser(data);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to get user data'
      );
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    restoreSession: (state) => {
      // Check sessionStorage first if in iframe (for impersonation), otherwise localStorage
      let token, user;
      if (window.self !== window.top) {
        // We're in an iframe - check sessionStorage first
        try {
          const sessionToken = sessionStorage.getItem('auth_token');
          const sessionUser = sessionStorage.getItem('user_data');
          if (sessionToken && sessionUser) {
            token = JSON.parse(sessionToken);
            user = JSON.parse(sessionUser);
          }
        } catch (err) {
          console.error('Error reading from sessionStorage:', err);
        }
      }
      // Fallback to localStorage if not in iframe or sessionStorage doesn't have data
      if (!token || !user) {
        token = storage.getToken();
        user = storage.getUser();
      }
      // Normalize picture_url if present (in case old data is in localStorage)
      if (user?.picture_url) {
        user.picture_url = normalizeStorageUrl(user.picture_url);
      }
      state.token = token;
      state.user = user;
      state.isAuthenticated = !!token;
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      storage.clearAuth();
    },
    updateUserPicture: (state, action) => {
      if (state.user && action.payload) {
        state.user.picture = action.payload.picture;
        let pictureUrl = action.payload.picture_url || (action.payload.picture ? getStorageUrl(action.payload.picture) : null);
        // Normalize URL to ensure it uses /load-storage/ instead of /storage/
        if (pictureUrl) {
          pictureUrl = normalizeStorageUrl(pictureUrl);
        }
        state.user.picture_url = pictureUrl;
        storage.setUser(state.user);
      }
    },
    setUser: (state, action) => {
      // Merge with existing user to preserve fields like user_type_title and roles
      if (state.user && action.payload) {
        // Normalize picture_url if present
        if (action.payload.picture_url) {
          action.payload.picture_url = normalizeStorageUrl(action.payload.picture_url);
        }
        state.user = {
          ...state.user,
          ...action.payload,
          // Preserve critical fields
          user_type: action.payload.user_type || state.user.user_type,
          user_type_title: action.payload.user_type_title || state.user.user_type_title,
          roles: action.payload.roles || state.user.roles,
          is_admin: action.payload.is_admin !== undefined ? action.payload.is_admin : state.user.is_admin,
        };
      } else {
        // Normalize picture_url if present
        if (action.payload?.picture_url) {
          action.payload.picture_url = normalizeStorageUrl(action.payload.picture_url);
        }
        state.user = action.payload;
      }
      if (action.payload) {
        storage.setUser(state.user);
      }
    },
    impersonateLogin: (state, action) => {
      // Handle impersonation login with token and user data
      const { token, user } = action.payload;
      if (token && user) {
        // Normalize picture_url if present
        if (user.picture_url) {
          user.picture_url = normalizeStorageUrl(user.picture_url);
        }
        state.token = token;
        state.user = user;
        state.isAuthenticated = true;
        state.error = null;
        // Store in sessionStorage if in iframe (impersonation), otherwise localStorage
        // This prevents impersonation token from overwriting admin's localStorage
        if (window.self !== window.top) {
          // We're in an iframe - use sessionStorage for impersonation
          try {
            sessionStorage.setItem('auth_token', JSON.stringify(token));
            sessionStorage.setItem('user_data', JSON.stringify(user));
          } catch (err) {
            console.error('Error storing in sessionStorage:', err);
            // Fallback to localStorage if sessionStorage fails
            storage.setToken(token);
            storage.setUser(user);
          }
        } else {
          // Not in iframe - use localStorage normally
          storage.setToken(token);
          storage.setUser(user);
        }
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        // Normalize picture_url if present
        if (action.payload.user?.picture_url) {
          action.payload.user.picture_url = normalizeStorageUrl(action.payload.user.picture_url);
        }
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Logout
    builder
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = action.payload;
      });

    // Get Me
    builder
      .addCase(getMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        state.loading = false;
        // Normalize picture_url if present
        if (action.payload?.picture_url) {
          action.payload.picture_url = normalizeStorageUrl(action.payload.picture_url);
        }
        state.user = action.payload;
        state.error = null;
      })
      .addCase(getMe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, restoreSession, clearAuth, updateUserPicture, setUser, impersonateLogin } = authSlice.actions;
export default authSlice.reducer;

