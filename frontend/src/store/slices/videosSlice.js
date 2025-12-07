import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { API_ENDPOINTS, buildEndpoint } from '../../config/api';

const initialState = {
  videos: [],
  currentVideo: null,
  pagination: {
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  },
  loading: false,
  error: null,
  filters: {
    search: '',
    source_type: null,
    date_from: null,
    date_to: null,
    sort_by: 'created_at',
    sort_order: 'desc',
  },
};

export const fetchVideos = createAsyncThunk(
  'videos/fetchVideos',
  async (params = {}, { rejectWithValue }) => {
    try {
      const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      const response = await apiService.get(API_ENDPOINTS.videos.list, { params: cleanParams });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to fetch videos'
      );
    }
  }
);

export const fetchVideo = createAsyncThunk(
  'videos/fetchVideo',
  async (id, { rejectWithValue }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.videos.show, { id });
      const response = await apiService.get(endpoint);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to fetch video'
      );
    }
  }
);

export const createVideo = createAsyncThunk(
  'videos/createVideo',
  async (videoData, { rejectWithValue, dispatch }) => {
    try {
      const formData = new FormData();
      formData.append('title', videoData.title);
      formData.append('source_type', videoData.source_type);
      
      if (videoData.short_description) {
        formData.append('short_description', videoData.short_description);
      }
      
      if (videoData.source_type === 'internal' && videoData.video_file) {
        formData.append('video_file', videoData.video_file);
      } else if (videoData.source_type === 'external' && videoData.external_url) {
        formData.append('external_url', videoData.external_url);
      }

      // Get upload progress callback if provided
      const onUploadProgress = videoData.onUploadProgress;
      
      const response = await apiService.post(API_ENDPOINTS.videos.create, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: onUploadProgress ? (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onUploadProgress(percentCompleted);
        } : undefined,
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to create video'
      );
    }
  }
);

export const updateVideo = createAsyncThunk(
  'videos/updateVideo',
  async ({ id, videoData }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      
      if (videoData.title) {
        formData.append('title', videoData.title);
      }
      if (videoData.short_description !== undefined) {
        formData.append('short_description', videoData.short_description || '');
      }
      if (videoData.source_type) {
        formData.append('source_type', videoData.source_type);
      }
      
      if (videoData.video_file) {
        formData.append('video_file', videoData.video_file);
      }
      if (videoData.external_url !== undefined) {
        formData.append('external_url', videoData.external_url || '');
      }

      // Get upload progress callback if provided
      const onUploadProgress = videoData.onUploadProgress;
      
      const endpoint = buildEndpoint(API_ENDPOINTS.videos.update, { id });
      const response = await apiService.put(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: onUploadProgress ? (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onUploadProgress(percentCompleted);
        } : undefined,
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to update video'
      );
    }
  }
);

export const deleteVideo = createAsyncThunk(
  'videos/deleteVideo',
  async (id, { rejectWithValue }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.videos.delete, { id });
      await apiService.delete(endpoint);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to delete video'
      );
    }
  }
);

const videosSlice = createSlice({
  name: 'videos',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      const cleanedPayload = Object.entries(action.payload).reduce((acc, [key, value]) => {
        acc[key] = value === '' ? null : value;
        return acc;
      }, {});
      state.filters = { ...state.filters, ...cleanedPayload };
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentVideo: (state, action) => {
      state.currentVideo = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVideos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVideos.fulfilled, (state, action) => {
        state.loading = false;
        state.videos = action.payload.data;
        state.pagination = {
          current_page: action.payload.current_page,
          last_page: action.payload.last_page,
          per_page: action.payload.per_page,
          total: action.payload.total,
        };
      })
      .addCase(fetchVideos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchVideo.fulfilled, (state, action) => {
        state.currentVideo = action.payload;
      })
      .addCase(createVideo.fulfilled, (state, action) => {
        state.videos.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(updateVideo.fulfilled, (state, action) => {
        const index = state.videos.findIndex(v => v.id === action.payload.id);
        if (index !== -1) {
          state.videos[index] = action.payload;
        }
        if (state.currentVideo?.id === action.payload.id) {
          state.currentVideo = action.payload;
        }
      })
      .addCase(deleteVideo.fulfilled, (state, action) => {
        state.videos = state.videos.filter(v => v.id !== action.payload);
        state.pagination.total -= 1;
      });
  },
});

export const { setFilters, clearError, setCurrentVideo } = videosSlice.actions;
export default videosSlice.reducer;

