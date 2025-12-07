import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';

// Initial state
const initialState = {
  settings: null,
  loading: false,
  error: null,
  testing: false,
  testError: null,
};

// Async thunks
export const fetchSmtpSettings = createAsyncThunk(
  'smtpSettings/fetchSmtpSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get(API_ENDPOINTS.smtpSettings.get);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to fetch SMTP settings'
      );
    }
  }
);

export const updateSmtpSettings = createAsyncThunk(
  'smtpSettings/updateSmtpSettings',
  async (settingsData, { rejectWithValue }) => {
    try {
      const response = await apiService.put(API_ENDPOINTS.smtpSettings.update, settingsData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to update SMTP settings'
      );
    }
  }
);

export const testSmtpConnection = createAsyncThunk(
  'smtpSettings/testSmtpConnection',
  async (settingsData, { rejectWithValue }) => {
    try {
      const response = await apiService.post(API_ENDPOINTS.smtpSettings.test, settingsData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to test SMTP connection'
      );
    }
  }
);

// SMTP Settings slice
const smtpSettingsSlice = createSlice({
  name: 'smtpSettings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.testError = null;
    },
    resetSettings: (state) => {
      state.settings = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch SMTP settings
    builder
      .addCase(fetchSmtpSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSmtpSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(fetchSmtpSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update SMTP settings
    builder
      .addCase(updateSmtpSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSmtpSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(updateSmtpSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Test SMTP connection
    builder
      .addCase(testSmtpConnection.pending, (state) => {
        state.testing = true;
        state.testError = null;
      })
      .addCase(testSmtpConnection.fulfilled, (state) => {
        state.testing = false;
        state.testError = null;
      })
      .addCase(testSmtpConnection.rejected, (state, action) => {
        state.testing = false;
        state.testError = action.payload;
      });
  },
});

export const { clearError, resetSettings } = smtpSettingsSlice.actions;
export default smtpSettingsSlice.reducer;

