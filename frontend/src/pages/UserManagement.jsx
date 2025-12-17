import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  fetchUsers,
  fetchUserTypes,
  createUser,
  updateUser,
  deleteUser,
  blockUser,
  unblockUser,
  assignBatches,
  fetchAvailableBatches,
  assignRoles,
  fetchAvailableRoles,
  setFilters,
} from '../store/slices/usersSlice';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Drawer } from '../components/ui/drawer';
import { Dialog } from '../components/ui/dialog';
import { Tooltip } from '../components/ui/tooltip';
import { DateRangePicker } from '../components/ui/date-range-picker';
import { Select } from '../components/ui/select';
import { cn } from '../utils/cn';
import StudentPerformanceReport from '../components/reports/StudentPerformanceReport';
import ImpersonateModal from '../components/ImpersonateModal';
import { apiService } from '../services/api';
import { API_ENDPOINTS, buildEndpoint } from '../config/api';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  Loader2,
  Layers,
  UserCog,
  FileText,
  LogIn,
  DollarSign,
  Check,
  X,
  Eye,
} from 'lucide-react';
import { debounce } from '../utils/debounce';

const UserManagement = () => {
  const dispatch = useAppDispatch();
  const { users, userTypes, pagination, loading, filters } = useAppSelector((state) => state.users);
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const { success, error: showError } = useToast();

  const [showDrawer, setShowDrawer] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [userToBlock, setUserToBlock] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [showAssignBatchesDialog, setShowAssignBatchesDialog] = useState(false);
  const [userToAssignBatches, setUserToAssignBatches] = useState(null);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [showAssignRolesDialog, setShowAssignRolesDialog] = useState(false);
  const [userToAssignRoles, setUserToAssignRoles] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const rolesLoadedRef = useRef(false);
  const loadingRolesRef = useRef(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPerformanceReport, setShowPerformanceReport] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [userToImpersonate, setUserToImpersonate] = useState(null);
  const [selectAll, setSelectAll] = useState(false);
  const [showSetFeeDrawer, setShowSetFeeDrawer] = useState(false);
  const [studentForFee, setStudentForFee] = useState(null);
  const [feeAmount, setFeeAmount] = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [vouchers, setVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [savingFee, setSavingFee] = useState(false);
  const [manualVoucherAmount, setManualVoucherAmount] = useState('');
  const [manualVoucherDescription, setManualVoucherDescription] = useState('');
  const [manualVoucherDueDate, setManualVoucherDueDate] = useState('');
  const [creatingVoucher, setCreatingVoucher] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    contact_no: '',
    address: '',
    fees: '',
    expected_fee_promise_date: '',
  });
  const [searchValue, setSearchValue] = useState(filters.search || '');

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((value) => {
      dispatch(setFilters({ search: value }));
    }, 500),
    [dispatch]
  );

  useEffect(() => {
    dispatch(fetchUsers(filters));
  }, [dispatch, filters]);

  // Debug: Log user types to console
  useEffect(() => {
    if (users.length > 0) {
      console.log('Users with types:', users.map(u => ({
        name: u.name,
        user_type: u.user_type,
        user_type_title: u.user_type_title
      })));
    }
  }, [users]);

  useEffect(() => {
    dispatch(fetchUserTypes());
  }, [dispatch]);

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    debouncedSearch(value);
  };

  const handleFilter = (key, value) => {
    dispatch(setFilters({ [key]: value }));
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      contact_no: '',
      address: '',
      fees: '',
      expected_fee_promise_date: '',
    });
    setShowDrawer(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      contact_no: user.contact_no || '',
      address: user.address || '',
      fees: user.fees || '',
      expected_fee_promise_date: user.expected_fee_promise_date ? String(user.expected_fee_promise_date) : '',
    });
    setShowDrawer(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!editingUser && !formData.password) {
      showError('Password is required for new users');
      return;
    }

    const submitData = { ...formData };
    if (editingUser && !submitData.password) {
      delete submitData.password;
    }
    
    // Clean up empty string values for optional fields
    if (submitData.fees === '') delete submitData.fees;
    if (submitData.expected_fee_promise_date === '') delete submitData.expected_fee_promise_date;
    if (submitData.contact_no === '') delete submitData.contact_no;
    if (submitData.address === '') delete submitData.address;

    try {
      if (editingUser) {
        await dispatch(updateUser({ id: editingUser.id, userData: submitData })).unwrap();
        success('User updated successfully');
        setShowDrawer(false);
        setEditingUser(null);
        dispatch(fetchUsers(filters));
      } else {
        // For new users, show roles dialog first
        setUserToAssignRoles({ id: null, name: submitData.name || 'New User', email: submitData.email });
        setShowAssignRolesDialog(true);
        // Store form data temporarily
        setFormData(submitData);
        // Load available roles
        setAvailableRoles(userTypes.map(t => ({ id: t.id, title: t.title })));
        setSelectedRoles([]);
      }
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : err?.email?.[0] || 'Operation failed';
      showError(errorMessage);
    }
  };

  const handleCreateUserWithRoles = async () => {
    if (!selectedRoles || selectedRoles.length === 0) {
      showError('Please select at least one role for the user');
      return;
    }

    const submitData = { ...formData };
    submitData.role_ids = selectedRoles;

    try {
      await dispatch(createUser(submitData)).unwrap();
      success('User created successfully');
      setShowDrawer(false);
      setShowAssignRolesDialog(false);
      setUserToAssignRoles(null);
      setSelectedRoles([]);
      dispatch(fetchUsers(filters));
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : err?.email?.[0] || 'Operation failed';
      showError(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await dispatch(deleteUser(id)).unwrap();
        success('User deleted successfully');
        dispatch(fetchUsers(filters));
      } catch (err) {
        const errorMessage = typeof err === 'string' ? err : 'Failed to delete user';
        showError(errorMessage);
      }
    }
  };

  const handleBlockClick = (user) => {
    setUserToBlock(user);
    setBlockReason('');
    setShowBlockDialog(true);
  };

  const handleBlockConfirm = async () => {
    if (!userToBlock) return;

    try {
      await dispatch(blockUser({ id: userToBlock.id, blockReason })).unwrap();
      success('User blocked successfully');
      setShowBlockDialog(false);
      setUserToBlock(null);
      setBlockReason('');
      dispatch(fetchUsers(filters));
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to block user';
      showError(errorMessage);
    }
  };

  const handleUnblock = async (id) => {
    try {
      await dispatch(unblockUser(id)).unwrap();
      success('User unblocked successfully');
      dispatch(fetchUsers(filters));
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to unblock user';
      showError(errorMessage);
    }
  };

  const handlePageChange = (page) => {
    dispatch(setFilters({ page }));
    dispatch(fetchUsers({ ...filters, page }));
    setSelectedUsers([]);
    setSelectAll(false);
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((user) => user.id));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkBlock = async () => {
    if (selectedUsers.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to block ${selectedUsers.length} user(s)?`)) {
      return;
    }

    try {
      const promises = selectedUsers.map((id) => 
        dispatch(blockUser({ id, blockReason: 'Bulk block action' })).unwrap()
      );
      await Promise.all(promises);
      success(`${selectedUsers.length} user(s) blocked successfully`);
      setSelectedUsers([]);
      setSelectAll(false);
      dispatch(fetchUsers(filters));
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to block users';
      showError(errorMessage);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedUsers.length} user(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const promises = selectedUsers.map((id) => 
        dispatch(deleteUser(id)).unwrap()
      );
      await Promise.all(promises);
      success(`${selectedUsers.length} user(s) deleted successfully`);
      setSelectedUsers([]);
      setSelectAll(false);
      dispatch(fetchUsers(filters));
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to delete users';
      showError(errorMessage);
    }
  };

  useEffect(() => {
    // Update selectAll state when selectedUsers changes
    if (users.length > 0) {
      setSelectAll(selectedUsers.length === users.length && users.length > 0);
    }
  }, [selectedUsers, users]);

  const handleAssignBatchesClick = async (user) => {
    setUserToAssignBatches(user);
    setAvailableBatches([]);
    setSelectedBatches([]); // Reset first, will be set from API response
    setShowAssignBatchesDialog(true);
    await loadAvailableBatches(user.id);
  };

  const loadAvailableBatches = async (userId, search = '') => {
    setLoadingBatches(true);
    try {
      const result = await dispatch(fetchAvailableBatches({ id: userId, search })).unwrap();
      if (Array.isArray(result)) {
        setAvailableBatches(result);
      } else {
        setAvailableBatches(result.batches || []);
        // Always set assigned_ids from API response (it's the source of truth)
        if (result.assigned_ids && Array.isArray(result.assigned_ids)) {
          setSelectedBatches(result.assigned_ids);
        }
      }
    } catch (err) {
      showError('Failed to load available batches');
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleBatchSearch = (searchTerm) => {
    if (userToAssignBatches) {
      loadAvailableBatches(userToAssignBatches.id, searchTerm);
    }
  };

  const handleAssignBatchesSubmit = async () => {
    if (!userToAssignBatches) return;
    try {
      await dispatch(assignBatches({ id: userToAssignBatches.id, batchIds: selectedBatches })).unwrap();
      success('Batches assigned successfully');
      setShowAssignBatchesDialog(false);
      setUserToAssignBatches(null);
      setSelectedBatches([]);
      dispatch(fetchUsers(filters));
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to assign batches';
      showError(errorMessage);
    }
  };

  const handleAssignRolesClick = async (user) => {
    setUserToAssignRoles(user);
    // Get assigned role IDs from user.roles or user.user_type (backward compatibility)
    const assignedIds = user.roles?.map(r => r.id) || (user.user_type ? [user.user_type] : []);
    setSelectedRoles(assignedIds);
    // Preserve user's current roles in availableRoles so they show up immediately
    const currentRoles = user.roles?.map(r => ({ id: r.id, title: r.title })) || [];
    setAvailableRoles(currentRoles);
    rolesLoadedRef.current = false;
    loadingRolesRef.current = false;
    setLoadingRoles(false);
    setShowAssignRolesDialog(true);
    // Load all available roles after dialog opens (without showing loading state initially)
    // Use a small delay to let dialog render first, preventing flicker
    setTimeout(() => {
      if (user.id && !loadingRolesRef.current) {
        // Load silently (without showing loading state) to prevent button flicker
        loadAvailableRoles(user.id, '', false);
      }
    }, 100);
  };

  const loadAvailableRoles = async (userId, search = '', showLoading = true) => {
    // Prevent multiple simultaneous calls
    if (loadingRolesRef.current) {
      return;
    }
    
    loadingRolesRef.current = true;
    if (showLoading) {
      setLoadingRoles(true);
    }
    try {
      const result = await dispatch(fetchAvailableRoles({ id: userId, search })).unwrap();
      let newRoles = [];
      let assignedIds = [];
      
      if (Array.isArray(result)) {
        newRoles = result;
      } else {
        newRoles = result.roles || [];
        // Always set assigned_ids from API response (it's the source of truth)
        if (result.assigned_ids && Array.isArray(result.assigned_ids)) {
          assignedIds = result.assigned_ids;
        }
      }
      
      // Merge with existing roles to ensure selected roles are always available
      setAvailableRoles(prevRoles => {
        const existingMap = new Map(prevRoles.map(r => [r.id, r]));
        newRoles.forEach(role => {
          existingMap.set(role.id, role);
        });
        return Array.from(existingMap.values());
      });
      
      // Only update selectedRoles if API provided assigned_ids
      if (assignedIds.length > 0) {
        setSelectedRoles(assignedIds);
      }
      
      rolesLoadedRef.current = true;
    } catch (err) {
      showError('Failed to load available roles');
      console.error('Error loading roles:', err);
    } finally {
      loadingRolesRef.current = false;
      if (showLoading) {
        setLoadingRoles(false);
      }
    }
  };

  const handleRoleSearch = (searchTerm) => {
    // Only search if user is set
    if (!userToAssignRoles) return;
    
    // Skip empty search on initial load (roles already loaded)
    if (!searchTerm && rolesLoadedRef.current) {
      return;
    }
    
    // Only load if not already loading
    // Show loading state for user-initiated searches
    if (!loadingRolesRef.current) {
      loadAvailableRoles(userToAssignRoles.id, searchTerm || '', true);
    }
  };

  const handleAssignRolesSubmit = async () => {
    if (!userToAssignRoles || !userToAssignRoles.id) return;
    try {
      await dispatch(assignRoles({ id: userToAssignRoles.id, roleIds: selectedRoles })).unwrap();
      success('Roles assigned successfully');
      setShowAssignRolesDialog(false);
      setUserToAssignRoles(null);
      setSelectedRoles([]);
      dispatch(fetchUsers(filters));
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to assign roles';
      showError(errorMessage);
    }
  };

  const handleViewPerformanceReport = (user) => {
    setSelectedStudent(user);
    setShowPerformanceReport(true);
  };

  const handleImpersonate = (user) => {
    setUserToImpersonate(user);
    setShowImpersonateModal(true);
  };

  const handleSetFee = async (user) => {
    setStudentForFee(user);
    setFeeAmount(user.fees || '');
    setPromiseDate(user.expected_fee_promise_date || '');
    setShowSetFeeDrawer(true);
    await loadVouchers(user.id);
  };

  const loadVouchers = async (studentId) => {
    setLoadingVouchers(true);
    try {
      const response = await apiService.get(
        API_ENDPOINTS.users.vouchers.replace(':id', studentId)
      );
      setVouchers(response.data.data || []);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to load vouchers');
    } finally {
      setLoadingVouchers(false);
    }
  };

  const handleSaveFee = async () => {
    if (!studentForFee) return;
    
    if (!feeAmount || !promiseDate) {
      showError('Please fill in all fields');
      return;
    }

    setSavingFee(true);
    try {
      await apiService.put(
        API_ENDPOINTS.users.updateFee.replace(':id', studentForFee.id),
        {
          fee_amount: parseFloat(feeAmount),
          promise_date: parseInt(promiseDate),
        }
      );
      success('Fee updated successfully');
      dispatch(fetchUsers(filters));
      await loadVouchers(studentForFee.id);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update fee');
    } finally {
      setSavingFee(false);
    }
  };

  const handleDeleteVoucher = async (voucherId) => {
    if (!confirm('Are you sure you want to delete this voucher? This action cannot be undone.')) {
      return;
    }

    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.vouchers.delete, { id: voucherId });
      await apiService.delete(endpoint);
      success('Voucher deleted successfully');
      // Refresh vouchers list
      if (studentForFee) {
        handleSetFee(studentForFee);
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete voucher');
    }
  };

  const handleApproveVoucher = async (voucherId) => {
    try {
      await apiService.post(
        API_ENDPOINTS.vouchers.approve.replace(':id', voucherId)
      );
      success('Voucher approved successfully');
      await loadVouchers(studentForFee.id);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to approve voucher');
    }
  };

  const handleCreateVoucher = async () => {
    if (!studentForFee) return;
    
    if (!manualVoucherAmount || !manualVoucherDueDate) {
      showError('Please fill in amount and due date');
      return;
    }

    setCreatingVoucher(true);
    try {
      await apiService.post(
        API_ENDPOINTS.users.createVoucher.replace(':id', studentForFee.id),
        {
          fee_amount: parseFloat(manualVoucherAmount),
          description: manualVoucherDescription || 'Fee Voucher',
          due_date: manualVoucherDueDate,
        }
      );
      success('Voucher created successfully');
      setManualVoucherAmount('');
      setManualVoucherDescription('');
      setManualVoucherDueDate('');
      await loadVouchers(studentForFee.id);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create voucher');
    } finally {
      setCreatingVoucher(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage users, block/unblock, and control access
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchValue}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
            <select
              value={filters.user_type || ''}
              onChange={(e) => {
                const value = e.target.value === '' ? null : e.target.value;
                handleFilter('user_type', value);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All User Types</option>
              {userTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.title}
                </option>
              ))}
            </select>
            <select
              value={filters.block !== null && filters.block !== undefined ? String(filters.block) : ''}
              onChange={(e) => {
                const value = e.target.value === '' ? null : e.target.value;
                handleFilter('block', value);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="0">Active</option>
              <option value="1">Blocked</option>
            </select>
            <DateRangePicker
              value={
                filters.date_from || filters.date_to
                  ? { start: filters.date_from || '', end: filters.date_to || '' }
                  : null
              }
              onChange={(dateRange) => {
                if (dateRange) {
                  dispatch(setFilters({
                    date_from: dateRange.start || null,
                    date_to: dateRange.end || null,
                  }));
                } else {
                  dispatch(setFilters({
                    date_from: null,
                    date_to: null,
                  }));
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Users ({pagination.total})</CardTitle>
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedUsers.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkBlock}
                  disabled={loading}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Block Selected
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={loading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 w-12">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          className="h-4 w-4 rounded border-input cursor-pointer"
                        />
                      </th>
                      <th className="text-left p-4">Name</th>
                      <th className="text-left p-4">Email</th>
                      <th className="text-left p-4">User Type</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center p-8 text-muted-foreground">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => {
                        // Check if user is teacher or student
                        // Based on API: 1=Admin, 2=Student, 3=Teacher, 4=CHECKER
                        // Check both user_type and roles
                        const userTypeId = Number(user.user_type);
                        const userRoles = user.roles || [];
                        const roleIds = userRoles.map(r => Number(r.id));
                        const isTeacherOrStudent = 
                          userTypeId === 2 || 
                          userTypeId === 3 || 
                          roleIds.includes(2) || 
                          roleIds.includes(3);
                        
                        // Check if user is a student
                        const isStudent = 
                          userTypeId === 2 || 
                          roleIds.includes(2) ||
                          user.user_type_title?.toLowerCase() === 'student' ||
                          userRoles.some(r => r.title?.toLowerCase() === 'student');
                        
                        const isSelected = selectedUsers.includes(user.id);
                        return (
                        <tr key={user.id} className={cn("border-b hover:bg-muted/50", isSelected && "bg-muted")}>
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectUser(user.id)}
                              className="h-4 w-4 rounded border-input cursor-pointer"
                            />
                          </td>
                          <td className="p-4">{user.name}</td>
                          <td className="p-4">{user.email}</td>
                          <td className="p-4">
                            {user.roles_display || (user.roles_titles && user.roles_titles.join(', ')) || user.user_type_title || 'N/A'}
                          </td>
                          <td className="p-4">
                            {Number(user.block) === 1 ? (
                              <span className="text-destructive">Blocked</span>
                            ) : (
                              <span className="text-green-600">Active</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Tooltip content="Edit User">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(user)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                              {/* Assign Roles button for all users */}
                              <Tooltip content="Assign Roles">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleAssignRolesClick(user)}
                                >
                                  <UserCog className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                              {/* Show Assign Batches button only for teachers and students */}
                              {isTeacherOrStudent && (
                                <Tooltip content="Assign Batches">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleAssignBatchesClick(user)}
                                  >
                                    <Layers className="h-4 w-4" />
                                  </Button>
                                </Tooltip>
                              )}
                              {/* Show Performance Report button only for students */}
                              {isStudent && (
                                <Tooltip content="Student Performance Report">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewPerformanceReport(user)}
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                </Tooltip>
                              )}
                              {/* Show Set Fee button only for students */}
                              {isStudent && (
                                <Tooltip content="Set Fee">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleSetFee(user)}
                                  >
                                    <DollarSign className="h-4 w-4" />
                                  </Button>
                                </Tooltip>
                              )}
                              {/* Login as User button - available for all users except current user */}
                              {user.id !== currentUser?.id && (
                                <Tooltip content="Login as User">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleImpersonate(user)}
                                  >
                                    <LogIn className="h-4 w-4" />
                                  </Button>
                                </Tooltip>
                              )}
                              {Number(user.block) === 1 ? (
                                <Tooltip content="Unblock User">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleUnblock(user.id)}
                                  >
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  </Button>
                                </Tooltip>
                              ) : (
                                <Tooltip content="Block User">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleBlockClick(user)}
                                  >
                                    <Ban className="h-4 w-4 text-destructive" />
                                  </Button>
                                </Tooltip>
                              )}
                              {user.id !== currentUser?.id && (
                                <Tooltip content="Delete User">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(user.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.last_page > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.current_page} of {pagination.last_page}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={pagination.current_page === 1}
                      onClick={() => handlePageChange(pagination.current_page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={pagination.current_page === pagination.last_page}
                      onClick={() => handlePageChange(pagination.current_page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Side Drawer for Create/Edit */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editingUser ? 'Edit User' : 'Create User'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">
              Password {editingUser && '(leave blank to keep current)'}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
            />
          </div>
          <div>
            <Label htmlFor="contact_no">Contact Number</Label>
            <Input
              id="contact_no"
              value={formData.contact_no}
              onChange={(e) => setFormData({ ...formData, contact_no: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          {/* Student-specific fields - only show when user has Student role (ID = 2) */}
          {(() => {
            const isStudent = editingUser && (
              editingUser.roles?.some(r => Number(r.id) === 2) ||
              Number(editingUser.user_type) === 2 ||
              editingUser.user_type_title?.toLowerCase() === 'student'
            );
            
            return isStudent ? (
              <>
                <div>
                  <Label htmlFor="fees">Student Fee</Label>
                  <Input
                    id="fees"
                    type="number"
                    step="0.01"
                    value={formData.fees}
                    onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                    placeholder="Enter student fee"
                  />
                </div>
                <div>
                  <Label htmlFor="expected_fee_promise_date">Expected Fee Promise Date</Label>
                  <select
                    id="expected_fee_promise_date"
                    value={String(formData.expected_fee_promise_date || '')}
                    onChange={(e) => setFormData({ ...formData, expected_fee_promise_date: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select day of month</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                      const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
                      return (
                        <option key={day} value={String(day)}>
                          {day}{suffix} of every month
                        </option>
                      );
                    })}
                  </select>
                </div>
              </>
            ) : null;
          })()}
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingUser ? (
                'Update User'
              ) : (
                'Create User'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDrawer(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Block Reason Dialog */}
      <Dialog
        isOpen={showBlockDialog}
        onClose={() => {
          setShowBlockDialog(false);
          setUserToBlock(null);
          setBlockReason('');
        }}
        title="Block User"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to block <strong>{userToBlock?.name}</strong>?
          </p>
          <div>
            <Label htmlFor="block_reason">Block Reason (Optional)</Label>
            <textarea
              id="block_reason"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Enter reason for blocking this user..."
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleBlockConfirm}
              variant="destructive"
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Blocking...
                </>
              ) : (
                'Block User'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowBlockDialog(false);
                setUserToBlock(null);
                setBlockReason('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Assign Roles Dialog */}
      <Dialog
        isOpen={showAssignRolesDialog}
        onClose={() => {
          setShowAssignRolesDialog(false);
          // Reset refs when dialog closes
          rolesLoadedRef.current = false;
          loadingRolesRef.current = false;
          setLoadingRoles(false);
          if (userToAssignRoles?.id) {
            // Editing existing user - just close
            setUserToAssignRoles(null);
            setSelectedRoles([]);
          } else {
            // Creating new user - cancel creation
            setUserToAssignRoles(null);
            setSelectedRoles([]);
            setShowDrawer(false);
          }
        }}
        title={userToAssignRoles?.id ? `Assign Roles to ${userToAssignRoles?.name || 'User'}` : `Select Roles for New User`}
      >
        <div className="space-y-4">
          <div>
            <Label>Select Roles *</Label>
            <Select
              key={`roles-${userToAssignRoles?.id || 'new'}-${showAssignRolesDialog}`}
              options={availableRoles.map(r => ({ id: r.id, title: r.title }))}
              value={selectedRoles}
              onChange={setSelectedRoles}
              placeholder="Search and select roles..."
              searchable={true}
              onSearch={handleRoleSearch}
              loading={loadingRoles}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {selectedRoles.length} role(s) selected
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={userToAssignRoles?.id ? handleAssignRolesSubmit : handleCreateUserWithRoles}
              className="flex-1"
              disabled={loading || loadingRoles}
            >
              {loading || loadingRoles ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {userToAssignRoles?.id ? 'Assigning...' : 'Creating...'}
                </>
              ) : (
                userToAssignRoles?.id ? 'Assign Roles' : 'Create User'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignRolesDialog(false);
                if (!userToAssignRoles?.id) {
                  setShowDrawer(false);
                }
                setUserToAssignRoles(null);
                setSelectedRoles([]);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Assign Batches Dialog */}
      <Dialog
        isOpen={showAssignBatchesDialog}
        onClose={() => {
          setShowAssignBatchesDialog(false);
          setUserToAssignBatches(null);
          setSelectedBatches([]);
        }}
        title={`Assign Batches to ${userToAssignBatches?.name || 'User'}`}
      >
        <div className="space-y-4">
          <div>
            <Label>Select Batches</Label>
            <Select
              options={availableBatches.map(b => ({ id: b.id, title: b.title }))}
              value={selectedBatches}
              onChange={setSelectedBatches}
              placeholder="Search and select batches..."
              searchable={true}
              onSearch={handleBatchSearch}
              loading={loadingBatches}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {selectedBatches.length} batch(es) selected
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAssignBatchesSubmit}
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Batches'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignBatchesDialog(false);
                setUserToAssignBatches(null);
                setSelectedBatches([]);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Student Performance Report */}
      {showPerformanceReport && selectedStudent && (
        <StudentPerformanceReport
          student={selectedStudent}
          isOpen={showPerformanceReport}
          onClose={() => {
            setShowPerformanceReport(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {/* Impersonate Modal */}
      {showImpersonateModal && userToImpersonate && (
        <ImpersonateModal
          isOpen={showImpersonateModal}
          onClose={() => {
            setShowImpersonateModal(false);
            setUserToImpersonate(null);
          }}
          userId={userToImpersonate.id}
          userName={userToImpersonate.name}
        />
      )}

      {/* Set Fee Drawer */}
      <Drawer
        isOpen={showSetFeeDrawer}
        onClose={() => {
          setShowSetFeeDrawer(false);
          setStudentForFee(null);
          setFeeAmount('');
          setPromiseDate('');
          setVouchers([]);
          setManualVoucherAmount('');
          setManualVoucherDescription('');
          setManualVoucherDueDate('');
        }}
        title={`Set Fee - ${studentForFee?.name || ''}`}
        size="50%"
      >
        <div className="space-y-6">
          {/* Fee Form */}
          <Card>
            <CardHeader>
              <CardTitle>Fee Configuration</CardTitle>
              <CardDescription>Set fee amount and promise date for this student</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="feeAmount">Fee Amount *</Label>
                <Input
                  id="feeAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  placeholder="Enter fee amount"
                />
              </div>
              <div>
                <Label htmlFor="promiseDate">Promise Date (Day of Month) *</Label>
                <Input
                  id="promiseDate"
                  type="number"
                  min="1"
                  max="31"
                  value={promiseDate}
                  onChange={(e) => setPromiseDate(e.target.value)}
                  placeholder="Enter day of month (1-31)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The day of the month when the student promises to pay (e.g., 17 for 17th of every month)
                </p>
              </div>
              <Button
                onClick={handleSaveFee}
                disabled={savingFee || !feeAmount || !promiseDate}
                className="w-full"
              >
                {savingFee ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Manual Voucher Generation */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Voucher</CardTitle>
              <CardDescription>Manually create a voucher for fines or additional transactions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="manualVoucherAmount">Amount (PKR) *</Label>
                <Input
                  id="manualVoucherAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualVoucherAmount}
                  onChange={(e) => setManualVoucherAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label htmlFor="manualVoucherDescription">Description</Label>
                <Input
                  id="manualVoucherDescription"
                  type="text"
                  value={manualVoucherDescription}
                  onChange={(e) => setManualVoucherDescription(e.target.value)}
                  placeholder="Fee Voucher (default)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to use default "Fee Voucher"
                </p>
              </div>
              <div>
                <Label htmlFor="manualVoucherDueDate">Due Date *</Label>
                <Input
                  id="manualVoucherDueDate"
                  type="date"
                  value={manualVoucherDueDate}
                  onChange={(e) => setManualVoucherDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <Button
                onClick={handleCreateVoucher}
                disabled={creatingVoucher || !manualVoucherAmount || !manualVoucherDueDate}
                className="w-full"
                variant="outline"
              >
                {creatingVoucher ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Generate Voucher
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Vouchers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Vouchers</CardTitle>
              <CardDescription>Generated vouchers for this student</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingVouchers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : vouchers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No vouchers found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Description</th>
                        <th className="text-left p-2">Due Date</th>
                        <th className="text-left p-2">Amount</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Submitted</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vouchers.map((voucher) => (
                        <tr key={voucher.id} className="border-b">
                          <td className="p-2">
                            <span className="text-sm font-medium">{voucher.description || 'Fee Voucher'}</span>
                          </td>
                          <td className="p-2">
                            {new Date(voucher.due_date).toLocaleDateString()}
                          </td>
                          <td className="p-2">PKR {parseFloat(voucher.fee_amount).toFixed(2)}</td>
                          <td className="p-2">
                            <span
                              className={cn(
                                'px-2 py-1 rounded text-xs',
                                voucher.status === 'approved'
                                  ? 'bg-green-100 text-green-800'
                                  : voucher.status === 'submitted'
                                  ? 'bg-blue-100 text-blue-800'
                                  : voucher.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              )}
                            >
                              {voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1)}
                            </span>
                          </td>
                          <td className="p-2">
                            {voucher.submission_file ? (
                              <a
                                href={voucher.submission_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                View File
                              </a>
                            ) : (
                              <span className="text-muted-foreground">Not submitted</span>
                            )}
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {voucher.status === 'submitted' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApproveVoucher(voucher.id)}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Approve
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteVoucher(voucher.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Drawer>
    </div>
  );
};

export default UserManagement;
