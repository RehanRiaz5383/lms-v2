import { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  fetchBatches,
  fetchBatch,
  createBatch,
  updateBatch,
  deleteBatch,
  assignSubjects,
  fetchAvailableSubjects,
  setFilters,
} from '../store/slices/batchesSlice';
import { fetchSubjects } from '../store/slices/subjectsSlice';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Drawer } from '../components/ui/drawer';
import { Dialog } from '../components/ui/dialog';
import { Tooltip } from '../components/ui/tooltip';
import { Select } from '../components/ui/select';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  BookOpen,
  X,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { debounce } from '../utils/debounce';

const BatchManagement = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { batches, pagination, loading, filters, currentBatch } = useAppSelector((state) => state.batches);
  const { user } = useAppSelector((state) => state.auth);
  const { success, error: showError } = useToast();

  // Check if user is admin (has admin role)
  const isAdmin = () => {
    if (!user) return false;
    // Check roles array (primary method)
    if (user.roles && Array.isArray(user.roles)) {
      return user.roles.some(role => role.title?.toLowerCase() === 'admin');
    }
    // Fallback to user_type (backward compatibility)
    return user.user_type === 1 || user.user_type_title?.toLowerCase() === 'admin';
  };

  // Check if user is teacher or CR (has teacher/CR role but not admin)
  const isTeacherOrCR = () => {
    if (!user) return false;
    // Check roles array (primary method)
    if (user.roles && Array.isArray(user.roles)) {
      const hasTeacher = user.roles.some(role => {
        const title = role.title?.toLowerCase();
        return title === 'teacher' || title === 'class representative (cr)';
      });
      const hasAdmin = user.roles.some(role => role.title?.toLowerCase() === 'admin');
      return hasTeacher && !hasAdmin;
    }
    return false; // Don't use user_type for teacher/CR
  };

  const hasAdminAccess = isAdmin();
  const isTeacherCR = isTeacherOrCR();

  const [showDrawer, setShowDrawer] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    active: true,
  });
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const debouncedSearch = useCallback(
    debounce((value) => {
      dispatch(setFilters({ search: value }));
    }, 500),
    [dispatch]
  );

  useEffect(() => {
    dispatch(fetchBatches(filters));
  }, [dispatch, filters]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    debouncedSearch(value);
  };

  const handleFilter = (key, value) => {
    dispatch(setFilters({ [key]: value }));
  };

  const handleCreate = () => {
    setEditingBatch(null);
    setFormData({ title: '', active: true });
    setShowDrawer(true);
  };

  const handleEdit = (batch) => {
    setEditingBatch(batch);
    setFormData({
      title: batch.title || '',
      active: batch.active ?? true,
    });
    setShowDrawer(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBatch) {
        await dispatch(updateBatch({ id: editingBatch.id, batchData: formData })).unwrap();
        success('Batch updated successfully');
      } else {
        await dispatch(createBatch(formData)).unwrap();
        success('Batch created successfully');
      }
      setShowDrawer(false);
      dispatch(fetchBatches(filters));
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : err?.title?.[0] || 'Operation failed';
      showError(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this batch?')) {
      try {
        await dispatch(deleteBatch(id)).unwrap();
        success('Batch deleted successfully');
        dispatch(fetchBatches(filters));
      } catch (err) {
        const errorMessage = typeof err === 'string' ? err : 'Failed to delete batch';
        showError(errorMessage);
      }
    }
  };

  const handleAssignClick = async (batch) => {
    setEditingBatch(batch);
    const assignedIds = batch.subjects?.map(s => s.id) || [];
    setSelectedSubjects(assignedIds);
    setAvailableSubjects([]);
    setShowAssignDialog(true);
    await loadAvailableSubjects(batch.id);
  };

  const loadAvailableSubjects = async (batchId, search = '') => {
    setLoadingSubjects(true);
    try {
      const result = await dispatch(fetchAvailableSubjects({ id: batchId, search })).unwrap();
      // Handle both old format (array) and new format (object with subjects and assigned_ids)
      if (Array.isArray(result)) {
        setAvailableSubjects(result);
      } else {
        setAvailableSubjects(result.subjects || []);
      }
    } catch (err) {
      showError('Failed to load available subjects');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleSubjectSearch = (searchTerm) => {
    if (editingBatch) {
      loadAvailableSubjects(editingBatch.id, searchTerm);
    }
  };

  const handleAssignSubmit = async () => {
    if (!editingBatch) return;
    try {
      await dispatch(assignSubjects({ id: editingBatch.id, subjectIds: selectedSubjects })).unwrap();
      success('Subjects assigned successfully');
      setShowAssignDialog(false);
      dispatch(fetchBatches(filters));
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to assign subjects';
      showError(errorMessage);
    }
  };

  const handlePageChange = (page) => {
    dispatch(setFilters({ page }));
    dispatch(fetchBatches({ ...filters, page }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Batch Management</h1>
          <p className="text-muted-foreground mt-2">
            {hasAdminAccess ? 'Manage batches and assign subjects' : (isTeacherCR ? 'View your assigned batches' : 'Manage batches and assign subjects')}
          </p>
        </div>
        {hasAdminAccess && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Batch
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search batches..."
                value={searchValue}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
            <select
              value={filters.active !== null && filters.active !== undefined ? filters.active : ''}
              onChange={(e) => {
                const value = e.target.value === '' ? null : e.target.value === '1';
                handleFilter('active', value);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
            <select
              value={filters.sort_by || 'created_at'}
              onChange={(e) => handleFilter('sort_by', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="created_at">Sort by Date</option>
              <option value="title">Sort by Title</option>
            </select>
            <select
              value={filters.sort_order || 'desc'}
              onChange={(e) => handleFilter('sort_order', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="desc">Latest to Oldest</option>
              <option value="asc">Oldest to Latest</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Batches ({pagination.total})</CardTitle>
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
                      <th className="text-left p-4">Title</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Subjects</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center p-8 text-muted-foreground">
                          No batches found
                        </td>
                      </tr>
                    ) : (
                      batches.map((batch) => (
                        <tr key={batch.id} className="border-b hover:bg-muted/50">
                          <td className="p-4">{batch.title}</td>
                          <td className="p-4">
                            {batch.active ? (
                              <span className="text-green-600">Active</span>
                            ) : (
                              <span className="text-muted-foreground">Inactive</span>
                            )}
                          </td>
                          <td className="p-4">
                            {batch.subjects?.length || 0} subject(s)
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Tooltip content="Explore Batch">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/dashboard/batches/${batch.id}/explore`)}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                              {hasAdminAccess && (
                                <>
                                  <Tooltip content="Edit Batch">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEdit(batch)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </Tooltip>
                                  <Tooltip content="Assign Subjects">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleAssignClick(batch)}
                                    >
                                      <BookOpen className="h-4 w-4" />
                                    </Button>
                                  </Tooltip>
                                  <Tooltip content="Delete Batch">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDelete(batch.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
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

      {/* Create/Edit Drawer */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editingBatch ? 'Edit Batch' : 'Create Batch'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="active" className="cursor-pointer">
              Active
            </Label>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingBatch ? (
                'Update Batch'
              ) : (
                'Create Batch'
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

      {/* Assign Subjects Dialog */}
      <Dialog
        isOpen={showAssignDialog}
        onClose={() => {
          setShowAssignDialog(false);
          setEditingBatch(null);
          setSelectedSubjects([]);
        }}
        title={`Assign Subjects to ${editingBatch?.title || 'Batch'}`}
      >
        <div className="space-y-4">
          <div>
            <Label>Select Subjects</Label>
            <Select
              options={availableSubjects.map(s => ({ id: s.id, title: s.title }))}
              value={selectedSubjects}
              onChange={setSelectedSubjects}
              placeholder="Search and select subjects..."
              searchable={true}
              onSearch={handleSubjectSearch}
              loading={loadingSubjects}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {selectedSubjects.length} subject(s) selected
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAssignSubmit}
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Subjects'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignDialog(false);
                setEditingBatch(null);
                setSelectedSubjects([]);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default BatchManagement;

