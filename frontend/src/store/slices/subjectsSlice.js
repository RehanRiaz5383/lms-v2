import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { API_ENDPOINTS, buildEndpoint } from '../../config/api';

const initialState = {
  subjects: [],
  currentSubject: null,
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

export const fetchSubjects = createAsyncThunk(
  'subjects/fetchSubjects',
  async (params = {}, { rejectWithValue }) => {
    try {
      const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      const response = await apiService.get(API_ENDPOINTS.subjects.list, { params: cleanParams });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to fetch subjects'
      );
    }
  }
);

export const fetchSubject = createAsyncThunk(
  'subjects/fetchSubject',
  async (id, { rejectWithValue }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.subjects.show, { id });
      const response = await apiService.get(endpoint);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to fetch subject'
      );
    }
  }
);

export const createSubject = createAsyncThunk(
  'subjects/createSubject',
  async (subjectData, { rejectWithValue }) => {
    try {
      const response = await apiService.post(API_ENDPOINTS.subjects.create, subjectData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to create subject'
      );
    }
  }
);

export const updateSubject = createAsyncThunk(
  'subjects/updateSubject',
  async ({ id, subjectData }, { rejectWithValue }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.subjects.update, { id });
      const response = await apiService.put(endpoint, subjectData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to update subject'
      );
    }
  }
);

export const deleteSubject = createAsyncThunk(
  'subjects/deleteSubject',
  async (id, { rejectWithValue }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.subjects.delete, { id });
      await apiService.delete(endpoint);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to delete subject'
      );
    }
  }
);

const subjectsSlice = createSlice({
  name: 'subjects',
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
    setCurrentSubject: (state, action) => {
      state.currentSubject = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubjects.fulfilled, (state, action) => {
        state.loading = false;
        state.subjects = action.payload.data;
        state.pagination = {
          current_page: action.payload.current_page,
          last_page: action.payload.last_page,
          per_page: action.payload.per_page,
          total: action.payload.total,
        };
      })
      .addCase(fetchSubjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchSubject.fulfilled, (state, action) => {
        state.currentSubject = action.payload;
      })
      .addCase(createSubject.fulfilled, (state, action) => {
        state.subjects.unshift(action.payload);
      })
      .addCase(updateSubject.fulfilled, (state, action) => {
        const index = state.subjects.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.subjects[index] = action.payload;
        }
        if (state.currentSubject?.id === action.payload.id) {
          state.currentSubject = action.payload;
        }
      })
      .addCase(deleteSubject.fulfilled, (state, action) => {
        state.subjects = state.subjects.filter(s => s.id !== action.payload);
      });
  },
});

export const { setFilters, clearError, setCurrentSubject } = subjectsSlice.actions;
export default subjectsSlice.reducer;

