import { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  fetchSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  setFilters,
} from '../store/slices/subjectsSlice';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Drawer } from '../components/ui/drawer';
import { Tooltip } from '../components/ui/tooltip';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
import { debounce } from '../utils/debounce';

const SubjectsManagement = () => {
  const dispatch = useAppDispatch();
  const { subjects, pagination, loading, filters } = useAppSelector((state) => state.subjects);
  const { success, error: showError } = useToast();

  const [showDrawer, setShowDrawer] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
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
    dispatch(fetchSubjects(filters));
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
    setEditingSubject(null);
    setFormData({ title: '', active: true });
    setShowDrawer(true);
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setFormData({
      title: subject.title || '',
      active: subject.active ?? true,
    });
    setShowDrawer(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await dispatch(updateSubject({ id: editingSubject.id, subjectData: formData })).unwrap();
        success('Subject updated successfully');
      } else {
        await dispatch(createSubject(formData)).unwrap();
        success('Subject created successfully');
      }
      setShowDrawer(false);
      dispatch(fetchSubjects(filters));
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : err?.title?.[0] || 'Operation failed';
      showError(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await dispatch(deleteSubject(id)).unwrap();
        success('Subject deleted successfully');
        dispatch(fetchSubjects(filters));
      } catch (err) {
        const errorMessage = typeof err === 'string' ? err : 'Failed to delete subject';
        showError(errorMessage);
      }
    }
  };

  const handlePageChange = (page) => {
    dispatch(setFilters({ page }));
    dispatch(fetchSubjects({ ...filters, page }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subjects Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage subjects and their details
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Subject
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subjects..."
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

      {/* Subjects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subjects ({pagination.total})</CardTitle>
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
                      <th className="text-left p-4">Created At</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center p-8 text-muted-foreground">
                          No subjects found
                        </td>
                      </tr>
                    ) : (
                      subjects.map((subject) => (
                        <tr key={subject.id} className="border-b hover:bg-muted/50">
                          <td className="p-4">{subject.title}</td>
                          <td className="p-4">
                            {subject.active ? (
                              <span className="text-green-600">Active</span>
                            ) : (
                              <span className="text-muted-foreground">Inactive</span>
                            )}
                          </td>
                          <td className="p-4">
                            {new Date(subject.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Tooltip content="Edit Subject">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(subject)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                              <Tooltip content="Delete Subject">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(subject.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </Tooltip>
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
        title={editingSubject ? 'Edit Subject' : 'Create Subject'}
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
              ) : editingSubject ? (
                'Update Subject'
              ) : (
                'Create Subject'
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
    </div>
  );
};

export default SubjectsManagement;

