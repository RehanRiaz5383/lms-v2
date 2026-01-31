import { useEffect, useState } from 'react';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog } from '../components/ui/dialog';
import { Drawer } from '../components/ui/drawer';
import { Tooltip } from '../components/ui/tooltip';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { apiService } from '../services/api';
import { API_ENDPOINTS, buildEndpoint, normalizeUrl } from '../config/api';
import {
  Loader2,
  Download,
  Award,
  Edit,
  FileText,
  Trash2,
  Search,
  X,
  Eye,
} from 'lucide-react';

const AdminTasks = () => {
  const { success, error: showError } = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [showChangeSubmissionDialog, setShowChangeSubmissionDialog] = useState(false);
  const [gradeFormData, setGradeFormData] = useState({
    obtained_marks: '',
    instructor_comments: '',
  });
  const [newSubmissionFile, setNewSubmissionFile] = useState(null);
  const [sortOrder, setSortOrder] = useState('latest'); // 'oldest' or 'latest'
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubmissions, setSelectedSubmissions] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState(null);
  const [showTaskDetailDrawer, setShowTaskDetailDrawer] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    loadUncheckedSubmissions();
  }, [sortOrder, selectedBatch, searchTerm]);

  const loadBatches = async () => {
    try {
      const response = await apiService.get(API_ENDPOINTS.batches.list, {
        params: { per_page: 1000 } // Get all batches
      });
      setBatches(response.data.data?.data || []);
    } catch (err) {
      console.error('Error loading batches:', err);
    }
  };

  const loadUncheckedSubmissions = async () => {
    try {
      setLoading(true);
      const params = { sort: sortOrder };
      if (selectedBatch) {
        params.batch_id = selectedBatch;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      const response = await apiService.get(API_ENDPOINTS.tasks.getUncheckedSubmissions, {
        params
      });
      setSubmissions(response.data.data || []);
      setSelectedSubmissions([]); // Clear selection when data reloads
    } catch (err) {
      showError('Failed to load unchecked task submissions');
      console.error('Error loading unchecked submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeClick = (submission) => {
    setSelectedSubmission(submission);
    setGradeFormData({
      obtained_marks: submission.obtained_marks ?? submission.marks ?? '',
      instructor_comments: submission.instructor_comments ?? submission.teacher_remarks ?? submission.remarks ?? '',
    });
    setShowGradeDialog(true);
  };

  const handleChangeSubmissionClick = (submission) => {
    setSelectedSubmission(submission);
    setNewSubmissionFile(null);
    setShowChangeSubmissionDialog(true);
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.tasks.gradeSubmission, {
        taskId: selectedSubmission.task_id,
        submissionId: selectedSubmission.submission_id,
      });
      await apiService.post(endpoint, {
        obtained_marks: gradeFormData.obtained_marks || null,
        instructor_comments: gradeFormData.instructor_comments || null,
      });
      success('Submission graded successfully');
      setShowGradeDialog(false);
      loadUncheckedSubmissions();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to grade submission');
    }
  };

  const handleChangeSubmissionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubmission || !newSubmissionFile) return;

    try {
      const formData = new FormData();
      formData.append('file', newSubmissionFile);

      const endpoint = buildEndpoint(API_ENDPOINTS.tasks.uploadStudentSubmission, {
        taskId: selectedSubmission.task_id,
      });
      formData.append('student_id', selectedSubmission.student_id);

      await apiService.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      success('Submission file updated successfully');
      setShowChangeSubmissionDialog(false);
      loadUncheckedSubmissions();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update submission file');
    }
  };

  const handleDownloadTaskFile = (submission) => {
    let fileUrl = submission.task_file_url;
    if (!fileUrl && submission.task_files && submission.task_files.length > 0) {
      fileUrl = submission.task_files[0].file_url;
    }
    if (fileUrl) {
      fileUrl = normalizeUrl(fileUrl);
      window.open(fileUrl, '_blank');
    }
  };

  const handleDownloadSubmissionFile = (submission) => {
    if (submission.submission_file_url) {
      const fileUrl = normalizeUrl(submission.submission_file_url);
      window.open(fileUrl, '_blank');
    }
  };

  const handleSelectSubmission = (submissionId) => {
    setSelectedSubmissions(prev => {
      if (prev.includes(submissionId)) {
        return prev.filter(id => id !== submissionId);
      } else {
        return [...prev, submissionId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedSubmissions.length === submissions.length) {
      setSelectedSubmissions([]);
    } else {
      setSelectedSubmissions(submissions.map(s => s.submission_id));
    }
  };

  const handleDeleteClick = (submission) => {
    setSubmissionToDelete(submission);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!submissionToDelete) return;

    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.tasks.deleteSubmission, {
        submissionId: submissionToDelete.submission_id,
      });
      await apiService.delete(endpoint);
      success('Submission deleted successfully');
      setShowDeleteDialog(false);
      setSubmissionToDelete(null);
      loadUncheckedSubmissions();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete submission');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSubmissions.length === 0) {
      showError('Please select at least one submission to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedSubmissions.length} submission(s)?`)) {
      return;
    }

    try {
      await apiService.post(API_ENDPOINTS.tasks.bulkDeleteSubmissions, {
        submission_ids: selectedSubmissions,
      });
      success(`Successfully deleted ${selectedSubmissions.length} submission(s)`);
      setSelectedSubmissions([]);
      loadUncheckedSubmissions();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete submissions');
    }
  };

  const handleClearFilters = () => {
    setSelectedBatch('');
    setSearchTerm('');
    setSortOrder('latest');
  };

  const handleViewTaskDetail = (submission) => {
    setSelectedTaskDetail(submission);
    setShowTaskDetailDrawer(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-2">
            Review and grade unchecked task submissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="sort-order" className="text-sm">Sort by:</Label>
          <select
            id="sort-order"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="oldest">Oldest to Latest</option>
            <option value="latest">Latest to Oldest</option>
          </select>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Batches</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.title}
                  </option>
                ))}
              </select>
            </div>
            {(selectedBatch || searchTerm) && (
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Unchecked Task Submissions ({submissions.length})</CardTitle>
            {selectedSubmissions.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedSubmissions.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No unchecked task submissions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 w-12">
                      <input
                        type="checkbox"
                        checked={selectedSubmissions.length === submissions.length && submissions.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-input cursor-pointer"
                      />
                    </th>
                    <th className="text-left p-4">Student Name</th>
                    <th className="text-left p-4">Batch</th>
                    <th className="text-left p-4">Subject</th>
                    <th className="text-left p-4">Task Title</th>
                    <th className="text-left p-4">Marks</th>
                    <th className="text-left p-4">Due Date</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.submission_id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedSubmissions.includes(submission.submission_id)}
                          onChange={() => handleSelectSubmission(submission.submission_id)}
                          className="h-4 w-4 rounded border-input cursor-pointer"
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{submission.student_name}</div>
                        <div className="text-sm text-muted-foreground">{submission.student_email}</div>
                      </td>
                      <td className="p-4 text-sm">{submission.batch_title || 'N/A'}</td>
                      <td className="p-4 text-sm">{submission.subject_title || 'N/A'}</td>
                      <td className="p-4">
                        <div className="font-medium">{submission.task_title || 'Untitled Task'}</div>
                        {submission.task_description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {submission.task_description}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {submission.task_marks !== null && submission.task_marks !== undefined && submission.task_marks !== '' ? (
                          <span className="font-medium">{submission.task_marks}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {submission.task_due_date ? (
                          <span className="text-sm">
                            {new Date(submission.task_due_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Tooltip content="View Task Details">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewTaskDetail(submission)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                          {(submission.task_file_url || (submission.task_files && submission.task_files.length > 0)) && (
                            <Tooltip content="Download Task File">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadTaskFile(submission)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          )}
                          {submission.submission_file_url && (
                            <Tooltip content="Download Submission">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadSubmissionFile(submission)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          )}
                          <Tooltip content="Change Submission">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleChangeSubmissionClick(submission)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                          <Tooltip content={submission.obtained_marks !== null && submission.obtained_marks !== undefined ? 'Update Grade' : 'Award Grade'}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGradeClick(submission)}
                            >
                              <Award className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                          <Tooltip content="Delete Submission">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(submission)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </Tooltip>
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

      {/* Grade Submission Dialog */}
      <Dialog
        isOpen={showGradeDialog}
        onClose={() => setShowGradeDialog(false)}
        title="Award Grade and Remarks"
      >
        {selectedSubmission && (
          <form onSubmit={handleGradeSubmit} className="space-y-4">
            <div>
              <Label>Student</Label>
              <div className="mt-1 p-2 bg-muted rounded">
                {selectedSubmission.student_name} ({selectedSubmission.student_email})
              </div>
            </div>
            <div>
              <Label>Task</Label>
              <div className="mt-1 p-2 bg-muted rounded">
                {selectedSubmission.task_title}
              </div>
            </div>
            <div>
              <Label htmlFor="obtained_marks">Marks</Label>
              <Input
                id="obtained_marks"
                type="number"
                step="0.01"
                min="0"
                value={gradeFormData.obtained_marks}
                onChange={(e) => setGradeFormData({ ...gradeFormData, obtained_marks: e.target.value })}
                placeholder="Enter marks"
              />
            </div>
            <div>
              <Label htmlFor="instructor_comments">Instructor Comments</Label>
              <textarea
                id="instructor_comments"
                className="w-full min-h-[100px] px-3 py-2 text-sm border border-input rounded-md bg-background"
                value={gradeFormData.instructor_comments}
                onChange={(e) => setGradeFormData({ ...gradeFormData, instructor_comments: e.target.value })}
                placeholder="Enter instructor comments..."
                maxLength={1000}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowGradeDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                <Award className="h-4 w-4 mr-2" />
                Award Grade
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Change Submission Dialog */}
      <Dialog
        isOpen={showChangeSubmissionDialog}
        onClose={() => setShowChangeSubmissionDialog(false)}
        title="Change Submission File"
      >
        {selectedSubmission && (
          <form onSubmit={handleChangeSubmissionSubmit} className="space-y-4">
            <div>
              <Label>Student</Label>
              <div className="mt-1 p-2 bg-muted rounded">
                {selectedSubmission.student_name} ({selectedSubmission.student_email})
              </div>
            </div>
            <div>
              <Label>Task</Label>
              <div className="mt-1 p-2 bg-muted rounded">
                {selectedSubmission.task_title}
              </div>
            </div>
            <div>
              <Label htmlFor="submission_file">New Submission File</Label>
              <Input
                id="submission_file"
                type="file"
                onChange={(e) => setNewSubmissionFile(e.target.files[0])}
                accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowChangeSubmissionDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!newSubmissionFile}>
                <FileText className="h-4 w-4 mr-2" />
                Update Submission
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSubmissionToDelete(null);
        }}
        title="Delete Submission"
      >
        {submissionToDelete && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete the submission from{' '}
              <span className="font-medium">{submissionToDelete.student_name}</span> for task{' '}
              <span className="font-medium">{submissionToDelete.task_title}</span>?
            </p>
            <p className="text-xs text-muted-foreground">
              This action cannot be undone. The submission file will also be deleted.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setSubmissionToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteConfirm}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Task Detail Drawer */}
      <Drawer
        isOpen={showTaskDetailDrawer}
        onClose={() => {
          setShowTaskDetailDrawer(false);
          setSelectedTaskDetail(null);
        }}
        title="Task Details"
        size="40%"
      >
        {selectedTaskDetail && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">Task Title</Label>
                  <div className="mt-1 p-2 bg-muted rounded">
                    {selectedTaskDetail.task_title || 'Untitled Task'}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Description</Label>
                  <div className="mt-1 p-2 bg-muted rounded min-h-[60px]">
                    {selectedTaskDetail.task_description || 'No description provided'}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Total Marks</Label>
                  <div className="mt-1 p-2 bg-muted rounded">
                    {selectedTaskDetail.task_marks !== null && selectedTaskDetail.task_marks !== undefined && selectedTaskDetail.task_marks !== '' ? (
                      <span className="font-medium">{selectedTaskDetail.task_marks}</span>
                    ) : (
                      <span className="text-muted-foreground">Not specified</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Due Date</Label>
                  <div className="mt-1 p-2 bg-muted rounded">
                    {selectedTaskDetail.task_due_date ? (
                      <span>{new Date(selectedTaskDetail.task_due_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</span>
                    ) : (
                      <span className="text-muted-foreground">No due date set</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Attached File</Label>
                  <div className="mt-1">
                    {(selectedTaskDetail.task_file_url || (selectedTaskDetail.task_files && selectedTaskDetail.task_files.length > 0)) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadTaskFile(selectedTaskDetail)}
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Task File
                      </Button>
                    ) : (
                      <div className="p-2 bg-muted rounded text-muted-foreground text-sm">
                        No file attached
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default AdminTasks;

