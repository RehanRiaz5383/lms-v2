import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';

// Initial state
const initialState = {
  profile: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchProfile = createAsyncThunk(
  'profile/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get(API_ENDPOINTS.profile.get);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to fetch profile'
      );
    }
  }
);

export const updateProfile = createAsyncThunk(
  'profile/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      let data = profileData;
      let config = {};
      
      // Check if profileData is an object with formData and onUploadProgress
      if (profileData && typeof profileData === 'object' && !(profileData instanceof FormData) && profileData.formData) {
        data = profileData.formData;
        // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
        if (profileData.onUploadProgress) {
          config.onUploadProgress = profileData.onUploadProgress;
        }
        
        // Debug: Log FormData
        console.log('Sending FormData:', {
          hasPicture: data.has('picture'),
          entries: Array.from(data.entries()).map(([key, value]) => ({
            key,
            value: value instanceof File ? { name: value.name, size: value.size, type: value.type } : value
          }))
        });
      } else if (profileData instanceof FormData) {
        data = profileData;
        // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
      }
      
      const response = await apiService.put(API_ENDPOINTS.profile.update, data, config);
      return response.data.data;
    } catch (error) {
      console.error('Profile update error:', error);
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to update profile'
      );
    }
  }
);

export const changePassword = createAsyncThunk(
  'profile/changePassword',
  async (passwordData, { rejectWithValue }) => {
    try {
      await apiService.post(API_ENDPOINTS.profile.changePassword, passwordData);
      return true;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to change password'
      );
    }
  }
);

// Profile slice
const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch profile
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Change password
    builder
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError } = profileSlice.actions;
export default profileSlice.reducer;

