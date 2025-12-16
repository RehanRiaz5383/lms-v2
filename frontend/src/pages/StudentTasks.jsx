import { useEffect, useState, useRef } from 'react';
import { useAppSelector } from '../hooks/redux';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog } from '../components/ui/dialog';
import { Drawer } from '../components/ui/drawer';
import { Tooltip } from '../components/ui/tooltip';
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
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
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
  }, [filter, selectedBatch, selectedSubject]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') {
        params.status = filter;
      }
      if (selectedBatch) params.batch_id = selectedBatch;
      if (selectedSubject) params.subject_id = selectedSubject;

      const response = await apiService.get(API_ENDPOINTS.student.tasks.list, { params });
      const data = response.data.data || {};
      setTasks(data.tasks || []);
      setBatches(data.batches || []);
      setSubjects(data.subjects || []);
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
      // Remarks not needed - removed as per database schema

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
    const filePath = submission.answer_file || submission.file_path;
    if (filePath) {
      // Use file_url if available (from backend), otherwise construct URL
      const fileUrl = submission.file_url || normalizeStorageUrl(filePath) || getStorageUrl(filePath);
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
    // Set timezone to Asia/Karachi for comparison
    const now = new Date();
    const due = new Date(dueDate);
    // Set due date to end of day (23:59:59) in Asia/Karachi
    due.setHours(23, 59, 59, 999);
    return now > due;
  };

  // Countdown timer component
  const CountdownTimer = ({ dueDate }) => {
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
      if (!dueDate) {
        setTimeLeft(null);
        return;
      }

      const updateTimer = () => {
        const now = new Date();
        // Parse due date and set to end of day (23:59:59) in Asia/Karachi timezone
        const due = new Date(dueDate);
        due.setHours(23, 59, 59, 999);
        
        const diff = due - now;

        // If expired, don't show countdown (status badge will show "Overdue")
        if (diff <= 0) {
          setTimeLeft(null);
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
    }, [dueDate]);

    // Don't show countdown if expired or no time left
    if (!timeLeft) return null;

    return (
      <div className="flex items-center gap-1 text-xs">
        {timeLeft.days > 0 && (
          <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded font-medium">
            {timeLeft.days}d
          </span>
        )}
        <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-600 rounded font-medium">
          {String(timeLeft.hours).padStart(2, '0')}h
        </span>
        <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 rounded font-medium">
          {String(timeLeft.minutes).padStart(2, '0')}m
        </span>
        <span className="px-1.5 py-0.5 bg-green-500/10 text-green-600 rounded font-medium">
          {String(timeLeft.seconds).padStart(2, '0')}s
        </span>
      </div>
    );
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

      {/* Batch and Subject Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="batch">Batch Selection</Label>
              <select
                id="batch"
                value={selectedBatch}
                onChange={(e) => {
                  setSelectedBatch(e.target.value);
                  setSelectedSubject(''); // Reset subject when batch changes
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
              >
                <option value="">All Batches</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="subject">Subject Selection</Label>
              <select
                id="subject"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

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
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">#</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Title</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Batch</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Subject</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Due Date</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, index) => (
                    <tr key={task.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                      <td className="p-4 text-sm text-muted-foreground">{index + 1}</td>
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{task.title || 'Untitled Task'}</p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {task.batch?.title || 'N/A'}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {task.subject?.title || 'N/A'}
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className={`text-sm ${isOverdue(task.due_date) && !task.is_submitted ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                            {formatDate(task.due_date)}
                          </span>
                          {task.can_submit && task.due_date && (
                            <CountdownTimer dueDate={task.due_date} />
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(task)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {(task.task_file_url || (task.attachment_files && task.attachment_files.length > 0)) && (
                            <Tooltip content="Download Task File">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (task.task_file_url) {
                                    window.open(task.task_file_url, '_blank');
                                  } else if (task.attachment_files && task.attachment_files.length > 0 && task.attachment_files[0].file_url) {
                                    window.open(task.attachment_files[0].file_url, '_blank');
                                  }
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          )}
                          <Tooltip content="View Details">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(task)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                          {task.can_submit && (
                            <Tooltip content={task.is_submitted ? "Update Submission" : "Submit Task"}>
                              <Button
                                size="sm"
                                onClick={() => handleSubmitClick(task)}
                                variant={task.is_submitted ? "outline" : "default"}
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          )}
                          {task.is_submitted && (task.submission?.answer_file || task.submission?.file_path) && (
                            <Tooltip content="Download My Submission">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadSubmission(task.submission)}
                                className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Task Dialog */}
      <Dialog
        isOpen={showSubmitDialog}
        onClose={() => {
          setShowSubmitDialog(false);
          setSelectedFile(null);
          setRemarks('');
        }}
        title={selectedTask?.is_submitted ? "Update Submission" : "Submit Task"}
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
                    {selectedTask?.is_submitted ? "Updating..." : "Submitting..."}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {selectedTask?.is_submitted ? "Update Submission" : "Submit Task"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Task Details Drawer */}
      <Drawer
        isOpen={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        title="Task Details"
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

            {/* Task File (from tasks.file_path) */}
            {selectedTask.task_file_url && (
              <div className="pt-4 border-t border-border">
                <Label className="text-muted-foreground mb-2 block">Task File</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    if (selectedTask.task_file_url) {
                      window.open(selectedTask.task_file_url, '_blank');
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {selectedTask.file_path?.split('/').pop() || 'Download Task File'}
                </Button>
              </div>
            )}

            {/* Task Attachment Files (from files table) */}
            {selectedTask.attachment_files && selectedTask.attachment_files.length > 0 && (
              <div className="pt-4 border-t border-border">
                <Label className="text-muted-foreground mb-2 block">Task Attachments</Label>
                <div className="space-y-2">
                  {selectedTask.attachment_files.map((file, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        if (file.file_url) {
                          window.open(file.file_url, '_blank');
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {file.name || file.file_path?.split('/').pop() || `Attachment ${idx + 1}`}
                    </Button>
                  ))}
                </div>
              </div>
            )}

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
                  {selectedTask.submission.instructor_comments && (
                    <div>
                      <Label className="text-muted-foreground">Instructor Comments</Label>
                      <p className="text-muted-foreground whitespace-pre-wrap bg-accent p-3 rounded">
                        {selectedTask.submission.instructor_comments}
                      </p>
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
                  {selectedTask.submission.obtained_marks !== null && selectedTask.submission.obtained_marks !== undefined && (
                    <div>
                      <Label className="text-muted-foreground">Marks</Label>
                      <p className="font-medium text-lg">{selectedTask.submission.obtained_marks}</p>
                    </div>
                  )}
                  {selectedTask.submission.marks !== null && selectedTask.submission.marks !== undefined && (
                    <div>
                      <Label className="text-muted-foreground">Marks</Label>
                      <p className="font-medium text-lg">{selectedTask.submission.marks}</p>
                    </div>
                  )}
                  {(selectedTask.submission.answer_file || selectedTask.submission.file_path) && (
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
              {selectedTask.can_submit && (
                <Button onClick={() => {
                  setShowDetailsDialog(false);
                  handleSubmitClick(selectedTask);
                }}>
                  <Upload className="h-4 w-4 mr-2" />
                  {selectedTask.is_submitted ? "Update Submission" : "Submit Task"}
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default StudentTasks;

