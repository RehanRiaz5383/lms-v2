import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  ClipboardList, 
  Bell, 
  Upload, 
  Loader2, 
  Search,
  AlertCircle,
  Mail,
  Calendar,
  ArrowLeft,
} from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../components/ui/toast';

const PendingTaskSubmissions = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifyingStudentId, setNotifyingStudentId] = useState(null);
  const [uploadingForStudent, setUploadingForStudent] = useState(null);
  const [studentFiles, setStudentFiles] = useState({}); // { submissionId: File }
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPendingTaskSubmissions();
  }, []);

  const loadPendingTaskSubmissions = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(API_ENDPOINTS.dashboard.pendingTaskSubmissions);
      setPendingSubmissions(response.data.data || []);
    } catch (err) {
      console.error('Failed to load pending task submissions:', err);
      showError('Failed to load pending task submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyStudent = async (studentId, taskId) => {
    try {
      setNotifyingStudentId(studentId);
      await apiService.post(API_ENDPOINTS.dashboard.notifyStudentOverdue, {
        student_id: studentId,
        task_id: taskId,
      });
      success('Notification sent successfully to student');
    } catch (err) {
      console.error('Failed to notify student:', err);
      showError('Failed to send notification to student');
    } finally {
      setNotifyingStudentId(null);
    }
  };

  const handleStudentFileChange = (submissionId, file) => {
    setStudentFiles(prev => ({
      ...prev,
      [submissionId]: file,
    }));
  };

  const handleUploadSubmissionForStudent = async (submission) => {
    const file = studentFiles[submission.id];
    if (!file) {
      showError('Please select a file to upload');
      return;
    }

    try {
      setUploadingForStudent(submission.id);
      const formData = new FormData();
      formData.append('student_id', submission.student_id);
      formData.append('file', file);

      const endpoint = API_ENDPOINTS.tasks.uploadStudentSubmission.replace(':taskId', submission.task_id);
      await apiService.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      success(`Task submission uploaded successfully for ${submission.student_name}`);
      
      // Remove the file from state
      setStudentFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[submission.id];
        return newFiles;
      });

      // Reload pending submissions
      await loadPendingTaskSubmissions();
    } catch (err) {
      console.error('Failed to upload submission:', err);
      showError(err.response?.data?.message || 'Failed to upload task submission');
    } finally {
      setUploadingForStudent(null);
    }
  };

  // Filter submissions based on search term
  const filteredSubmissions = pendingSubmissions.filter(submission => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      submission.student_name?.toLowerCase().includes(search) ||
      submission.student_email?.toLowerCase().includes(search) ||
      submission.task_title?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              Overdue Task Submissions
            </h1>
            <p className="text-muted-foreground mt-2">
              View and manage students with tasks past their due date
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name, email, or task title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pending Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Overdue Submissions ({filteredSubmissions.length})
          </CardTitle>
          <CardDescription>
            Students with tasks past their due date
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>No overdue task submissions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="p-4 rounded-lg border transition-colors bg-red-500/10 border-red-500/20 hover:bg-red-500/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {submission.student_name}
                        </h3>
                        <span className="px-2 py-1 text-xs bg-red-500/20 text-red-600 rounded font-medium flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Overdue
                        </span>
                      </div>
                      
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{submission.student_email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <ClipboardList className="h-4 w-4" />
                          <span>Task: {submission.task_title}</span>
                        </div>
                        {submission.task_expiry_date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Due: {new Date(submission.task_expiry_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* File Upload Section */}
                      <div className="mt-4 p-3 bg-background rounded-md border border-border">
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Upload Late Submission (if student provided file manually):
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="*/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleStudentFileChange(submission.id, file);
                              }
                            }}
                            className="flex-1"
                            disabled={uploadingForStudent === submission.id}
                          />
                          <Button
                            onClick={() => handleUploadSubmissionForStudent(submission)}
                            disabled={!studentFiles[submission.id] || uploadingForStudent === submission.id}
                            size="sm"
                            variant="outline"
                          >
                            {uploadingForStudent === submission.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload
                              </>
                            )}
                          </Button>
                        </div>
                        {studentFiles[submission.id] && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Selected: {studentFiles[submission.id].name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleNotifyStudent(submission.student_id, submission.task_id)}
                        disabled={notifyingStudentId === submission.student_id}
                      >
                        {notifyingStudentId === submission.student_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                        <span className="ml-2">Notify</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingTaskSubmissions;

