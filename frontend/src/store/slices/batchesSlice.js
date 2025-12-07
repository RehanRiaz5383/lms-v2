import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { API_ENDPOINTS, buildEndpoint } from '../../config/api';

const initialState = {
  batches: [],
  currentBatch: null,
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
    active: null,
    sort_by: 'created_at',
    sort_order: 'desc',
  },
};

export const fetchBatches = createAsyncThunk(
  'batches/fetchBatches',
  async (params = {}, { rejectWithValue }) => {
    try {
      const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      const response = await apiService.get(API_ENDPOINTS.batches.list, { params: cleanParams });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to fetch batches'
      );
    }
  }
);

export const fetchBatch = createAsyncThunk(
  'batches/fetchBatch',
  async (id, { rejectWithValue }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.batches.show, { id });
      const response = await apiService.get(endpoint);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to fetch batch'
      );
    }
  }
);

export const createBatch = createAsyncThunk(
  'batches/createBatch',
  async (batchData, { rejectWithValue }) => {
    try {
      const response = await apiService.post(API_ENDPOINTS.batches.create, batchData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to create batch'
      );
    }
  }
);

export const updateBatch = createAsyncThunk(
  'batches/updateBatch',
  async ({ id, batchData }, { rejectWithValue }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.batches.update, { id });
      const response = await apiService.put(endpoint, batchData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to update batch'
      );
    }
  }
);

export const deleteBatch = createAsyncThunk(
  'batches/deleteBatch',
  async (id, { rejectWithValue }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.batches.delete, { id });
      await apiService.delete(endpoint);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to delete batch'
      );
    }
  }
);

export const assignSubjects = createAsyncThunk(
  'batches/assignSubjects',
  async ({ id, subjectIds }, { rejectWithValue }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.batches.assignSubjects, { id });
      const response = await apiService.post(endpoint, { subject_ids: subjectIds });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to assign subjects'
      );
    }
  }
);

export const fetchAvailableSubjects = createAsyncThunk(
  'batches/fetchAvailableSubjects',
  async ({ id, search = '' }, { rejectWithValue }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.batches.availableSubjects, { id });
      const params = search ? { search } : {};
      const response = await apiService.get(endpoint, { params });
      // Return the full response data (may contain subjects array and assigned_ids)
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to fetch available subjects'
      );
    }
  }
);

const batchesSlice = createSlice({
  name: 'batches',
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
    setCurrentBatch: (state, action) => {
      state.currentBatch = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBatches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBatches.fulfilled, (state, action) => {
        state.loading = false;
        state.batches = action.payload.data;
        state.pagination = {
          current_page: action.payload.current_page,
          last_page: action.payload.last_page,
          per_page: action.payload.per_page,
          total: action.payload.total,
        };
      })
      .addCase(fetchBatches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchBatch.fulfilled, (state, action) => {
        state.currentBatch = action.payload;
      })
      .addCase(createBatch.fulfilled, (state, action) => {
        state.batches.unshift(action.payload);
      })
      .addCase(updateBatch.fulfilled, (state, action) => {
        const index = state.batches.findIndex(b => b.id === action.payload.id);
        if (index !== -1) {
          state.batches[index] = action.payload;
        }
        if (state.currentBatch?.id === action.payload.id) {
          state.currentBatch = action.payload;
        }
      })
      .addCase(deleteBatch.fulfilled, (state, action) => {
        state.batches = state.batches.filter(b => b.id !== action.payload);
      })
      .addCase(assignSubjects.fulfilled, (state, action) => {
        const index = state.batches.findIndex(b => b.id === action.payload.id);
        if (index !== -1) {
          state.batches[index] = action.payload;
        }
        if (state.currentBatch?.id === action.payload.id) {
          state.currentBatch = action.payload;
        }
      });
  },
});

export const { setFilters, clearError, setCurrentBatch } = batchesSlice.actions;
export default batchesSlice.reducer;

