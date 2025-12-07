import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { API_ENDPOINTS, buildEndpoint } from '../../config/api';

// Initial state
const initialState = {
  users: [],
  userTypes: [],
  currentUser: null,
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
    user_type: null,
    block: 0, // Default to active users only
    date_from: null,
    date_to: null,
  },
};

// Async thunks
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (params = {}, { rejectWithValue }) => {
    try {
      // Clean up params - remove empty strings and null values
      const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      const response = await apiService.get(API_ENDPOINTS.users.list, { params: cleanParams });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to fetch users'
      );
    }
  }
);

export const fetchUser = createAsyncThunk(
  'users/fetchUser',
  async (id, { rejectWithValue }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.users.show, { id });
      const response = await apiService.get(endpoint);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to fetch user'
      );
    }
  }
);

export const createUser = createAsyncThunk(
  'users/createUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await apiService.post(API_ENDPOINTS.users.create, userData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to create user'
      );
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, userData }, { rejectWithValue }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.users.update, { id });
      const response = await apiService.put(endpoint, userData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to update user'
      );
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (id, { rejectWithValue }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.users.delete, { id });
      await apiService.delete(endpoint);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to delete user'
      );
    }
  }
);

export const assignBatches = createAsyncThunk(
  'users/assignBatches',
  async ({ id, batchIds }, { rejectWithValue, dispatch }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.users.assignBatches, { id });
      const response = await apiService.post(endpoint, { batch_ids: batchIds });
      // Refresh users list after assignment
      dispatch(fetchUsers());
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to assign batches'
      );
    }
  }
);

export const fetchAvailableBatches = createAsyncThunk(
  'users/fetchAvailableBatches',
  async ({ id, search = '' }, { rejectWithValue }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.users.availableBatches, { id });
      const params = search ? { search } : {};
      const response = await apiService.get(endpoint, { params });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to fetch available batches'
      );
    }
  }
);

export const assignRoles = createAsyncThunk(
  'users/assignRoles',
  async ({ id, roleIds }, { rejectWithValue, dispatch }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.users.assignRoles, { id });
      const response = await apiService.post(endpoint, { role_ids: roleIds });
      // Refresh users list after assignment
      dispatch(fetchUsers());
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to assign roles'
      );
    }
  }
);

export const fetchAvailableRoles = createAsyncThunk(
  'users/fetchAvailableRoles',
  async ({ id, search = '' }, { rejectWithValue }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.users.availableRoles, { id });
      const params = search ? { search } : {};
      const response = await apiService.get(endpoint, { params });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to fetch available roles'
      );
    }
  }
);

export const blockUser = createAsyncThunk(
  'users/blockUser',
  async ({ id, blockReason }, { rejectWithValue }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.users.block, { id });
      const response = await apiService.post(endpoint, { block_reason: blockReason });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to block user'
      );
    }
  }
);

export const unblockUser = createAsyncThunk(
  'users/unblockUser',
  async (id, { rejectWithValue }) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.users.unblock, { id });
      const response = await apiService.post(endpoint);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to unblock user'
      );
    }
  }
);

export const fetchUserTypes = createAsyncThunk(
  'users/fetchUserTypes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get(API_ENDPOINTS.users.types);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.response?.data?.message || 'Failed to fetch user types'
      );
    }
  }
);

// Users slice
const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      // Clean up filter values - convert empty strings to null
      const cleanedPayload = Object.entries(action.payload).reduce((acc, [key, value]) => {
        acc[key] = value === '' ? null : value;
        return acc;
      }, {});
      state.filters = { ...state.filters, ...cleanedPayload };
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentUser: (state, action) => {
      state.currentUser = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.data;
        state.pagination = {
          current_page: action.payload.current_page,
          last_page: action.payload.last_page,
          per_page: action.payload.per_page,
          total: action.payload.total,
        };
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch user
    builder
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.currentUser = action.payload;
      });

    // Create user
    builder
      .addCase(createUser.fulfilled, (state, action) => {
        state.users.unshift(action.payload);
      });

    // Update user
    builder
      .addCase(updateUser.fulfilled, (state, action) => {
        const index = state.users.findIndex(u => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
        if (state.currentUser?.id === action.payload.id) {
          state.currentUser = action.payload;
        }
      });

    // Delete user
    builder
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter(u => u.id !== action.payload);
      });

    // Block/Unblock user
    builder
      .addCase(blockUser.fulfilled, (state, action) => {
        const index = state.users.findIndex(u => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      })
      .addCase(unblockUser.fulfilled, (state, action) => {
        const index = state.users.findIndex(u => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      });

    // Fetch user types
    builder
      .addCase(fetchUserTypes.fulfilled, (state, action) => {
        state.userTypes = action.payload;
      });
  },
});

export const { setFilters, clearError, setCurrentUser } = usersSlice.actions;
export default usersSlice.reducer;

