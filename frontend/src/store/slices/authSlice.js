import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { API_ENDPOINTS, getStorageUrl } from '../../config/api';
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
      const token = storage.getToken();
      const user = storage.getUser();
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
        state.user.picture_url = action.payload.picture_url || (action.payload.picture ? getStorageUrl(action.payload.picture) : null);
        storage.setUser(state.user);
      }
    },
    setUser: (state, action) => {
      // Merge with existing user to preserve fields like user_type_title and roles
      if (state.user && action.payload) {
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
        state.user = action.payload;
      }
      if (action.payload) {
        storage.setUser(state.user);
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
        state.user = action.payload;
        state.error = null;
      })
      .addCase(getMe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, restoreSession, clearAuth, updateUserPicture, setUser } = authSlice.actions;
export default authSlice.reducer;

