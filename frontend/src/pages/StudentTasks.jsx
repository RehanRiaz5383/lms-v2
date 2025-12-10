import { useEffect, useState, useRef } from 'react';
import { useAppSelector } from '../hooks/redux';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog } from '../components/ui/dialog';
import { 
  ClipboardList, 
  Upload, 
  FileText, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Download,
  Eye,
  MessageSquare,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS, normalizeStorageUrl, getStorageUrl } from '../config/api';
import { useToast } from '../components/ui/toast';

const StudentTasks = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { success: showSuccess, error: showError } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, submitted
  const [selectedFile, setSelectedFile] = useState(null);
  const [remarks, setRemarks] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') {
        params.status = filter;
      }
      const response = await apiService.get(API_ENDPOINTS.student.tasks.list, { params });
      setTasks(response.data.data || []);
    } catch (err) {
      showError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitClick = (task) => {
    setSelectedTask(task);
    setSelectedFile(null);
    setRemarks('');
    setShowSubmitDialog(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmitTask = async () => {
    if (!selectedFile) {
      showError('Please select a file to submit');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (remarks) {
        formData.append('remarks', remarks);
      }

      const endpoint = API_ENDPOINTS.student.tasks.submit.replace(':id', selectedTask.id);
      await apiService.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showSuccess('Task submitted successfully');
      setShowSubmitDialog(false);
      setSelectedFile(null);
      setRemarks('');
      loadTasks(); // Reload tasks to update submission status
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = async (task) => {
    setSelectedTask(task);
    try {
      const endpoint = API_ENDPOINTS.student.tasks.show.replace(':id', task.id);
      const response = await apiService.get(endpoint);
      setSelectedTask(response.data.data);
      setShowDetailsDialog(true);
    } catch (err) {
      showError('Failed to load task details');
    }
  };

  const handleDownloadSubmission = (submission) => {
    if (submission.file_path) {
      // Use file_url if available (from backend), otherwise construct URL
      const fileUrl = submission.file_url || normalizeStorageUrl(submission.file_path) || getStorageUrl(submission.file_path);
      window.open(fileUrl, '_blank');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getStatusBadge = (task) => {
    if (task.is_submitted) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
          <CheckCircle2 className="h-3 w-3" />
          Submitted
        </span>
      );
    }
    if (isOverdue(task.due_date)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500">
          <AlertCircle className="h-3 w-3" />
          Overdue
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  };

  const pendingTasks = tasks.filter(t => !t.is_submitted);
  const submittedTasks = tasks.filter(t => t.is_submitted);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Task Assigned</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your assigned tasks
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          All Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'pending'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Pending ({pendingTasks.length})
        </button>
        <button
          onClick={() => setFilter('submitted')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'submitted'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Submitted ({submittedTasks.length})
        </button>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tasks assigned</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{task.title || 'Untitled Task'}</CardTitle>
                  {getStatusBadge(task)}
                </div>
                {task.description && (
                  <CardDescription className="line-clamp-2 mt-2">
                    {task.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Batch and Subject */}
                  {(task.batch || task.subject) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {task.batch && (
                        <span className="px-2 py-1 bg-accent rounded">
                          {task.batch.title}
                        </span>
                      )}
                      {task.subject && (
                        <span className="px-2 py-1 bg-accent rounded">
                          {task.subject.title}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Due Date */}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className={isOverdue(task.due_date) && !task.is_submitted ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
                      {formatDate(task.due_date)}
                    </span>
                  </div>

                  {/* Teacher Remarks (if submitted) */}
                  {task.is_submitted && task.submission?.teacher_remarks && (
                    <div className="flex items-start gap-2 text-sm p-2 bg-accent rounded">
                      <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="font-medium">Teacher Remarks:</span>
                        <p className="text-muted-foreground">{task.submission.teacher_remarks}</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(task)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    {task.can_submit && !task.is_submitted && (
                      <Button
                        size="sm"
                        onClick={() => handleSubmitClick(task)}
                        className="flex-1"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Submit
                      </Button>
                    )}
                    {task.is_submitted && task.submission?.file_path && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadSubmission(task.submission)}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Submit Task Dialog */}
      <Dialog
        isOpen={showSubmitDialog}
        onClose={() => {
          setShowSubmitDialog(false);
          setSelectedFile(null);
          setRemarks('');
        }}
        title="Submit Task"
        size="lg"
      >
        {selectedTask && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">{selectedTask.title}</h3>
              {selectedTask.description && (
                <p className="text-sm text-muted-foreground mt-1">{selectedTask.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Due: {formatDate(selectedTask.due_date)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Upload File *</Label>
              <Input
                id="file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,.zip,.rar"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <textarea
                id="remarks"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any additional remarks..."
                maxLength={1000}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSubmitDialog(false);
                  setSelectedFile(null);
                  setRemarks('');
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitTask}
                disabled={submitting || !selectedFile}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Submit Task
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Task Details Dialog */}
      <Dialog
        isOpen={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        title="Task Details"
        size="xl"
      >
        {selectedTask && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">{selectedTask.title}</h3>
              {selectedTask.description && (
                <p className="text-muted-foreground mt-2 whitespace-pre-wrap">{selectedTask.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <Label className="text-muted-foreground">Batch</Label>
                <p className="font-medium">{selectedTask.batch?.title || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Subject</Label>
                <p className="font-medium">{selectedTask.subject?.title || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Due Date</Label>
                <p className={`font-medium ${isOverdue(selectedTask.due_date) && !selectedTask.is_submitted ? 'text-red-500' : ''}`}>
                  {formatDate(selectedTask.due_date)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">
                  {getStatusBadge(selectedTask)}
                </div>
              </div>
              {selectedTask.creator && (
                <div>
                  <Label className="text-muted-foreground">Created By</Label>
                  <p className="font-medium">{selectedTask.creator.name || selectedTask.creator.email}</p>
                </div>
              )}
            </div>

            {/* Submission Details */}
            {selectedTask.is_submitted && selectedTask.submission && (
              <div className="pt-4 border-t border-border space-y-4">
                <h4 className="font-semibold text-foreground">Submission Details</h4>
                <div className="space-y-2">
                  <div>
                    <Label className="text-muted-foreground">Submitted At</Label>
                    <p className="font-medium">{formatDate(selectedTask.submission.submitted_at)}</p>
                  </div>
                  {selectedTask.submission.remarks && (
                    <div>
                      <Label className="text-muted-foreground">Your Remarks</Label>
                      <p className="text-muted-foreground whitespace-pre-wrap">{selectedTask.submission.remarks}</p>
                    </div>
                  )}
                  {selectedTask.submission.teacher_remarks && (
                    <div>
                      <Label className="text-muted-foreground">Teacher Remarks</Label>
                      <p className="text-muted-foreground whitespace-pre-wrap bg-accent p-3 rounded">
                        {selectedTask.submission.teacher_remarks}
                      </p>
                    </div>
                  )}
                  {selectedTask.submission.marks !== null && selectedTask.submission.marks !== undefined && (
                    <div>
                      <Label className="text-muted-foreground">Marks</Label>
                      <p className="font-medium text-lg">{selectedTask.submission.marks}</p>
                    </div>
                  )}
                  {selectedTask.submission.file_path && (
                    <div>
                      <Label className="text-muted-foreground">Submitted File</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadSubmission(selectedTask.submission)}
                        className="mt-2"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download File
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              {selectedTask.can_submit && !selectedTask.is_submitted && (
                <Button onClick={() => {
                  setShowDetailsDialog(false);
                  handleSubmitClick(selectedTask);
                }}>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Task
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default StudentTasks;

