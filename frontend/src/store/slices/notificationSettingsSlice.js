import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';

// Initial state
const initialState = {
  settings: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchNotificationSettings = createAsyncThunk(
  'notificationSettings/fetchNotificationSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get(API_ENDPOINTS.notificationSettings.get);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to fetch notification settings'
      );
    }
  }
);

export const updateNotificationSettings = createAsyncThunk(
  'notificationSettings/updateNotificationSettings',
  async (settingsData, { rejectWithValue }) => {
    try {
      const response = await apiService.put(API_ENDPOINTS.notificationSettings.update, settingsData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to update notification settings'
      );
    }
  }
);

// Notification Settings slice
const notificationSettingsSlice = createSlice({
  name: 'notificationSettings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetSettings: (state) => {
      state.settings = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch notification settings
    builder
      .addCase(fetchNotificationSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotificationSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(fetchNotificationSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update notification settings
    builder
      .addCase(updateNotificationSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateNotificationSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(updateNotificationSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, resetSettings } = notificationSettingsSlice.actions;
export default notificationSettingsSlice.reducer;

