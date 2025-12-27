import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../hooks/redux';
import { fetchBatch } from '../store/slices/batchesSlice';
import { createVideo } from '../store/slices/videosSlice';
import { useAppSelector } from '../hooks/redux';
import { apiService } from '../services/api';
import { API_ENDPOINTS, buildEndpoint, getStorageUrl, normalizeStorageUrl, APP_BASE_URL, normalizeUrl } from '../config/api';
import { useToast } from '../components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Drawer } from '../components/ui/drawer';
import { Dialog } from '../components/ui/dialog';
import { Tooltip } from '../components/ui/tooltip';
import { Loader2, ChevronRight, ChevronDown, Video, ArrowLeft, GripVertical, Plus, Users, Edit, Trash2, Ban, CheckCircle, Search, ClipboardList, Calendar, CheckCircle2, Clock, AlertCircle, Download, MessageSquare, Award, Eye, Upload, FileQuestion } from 'lucide-react';
import { cn } from '../utils/cn';

const BatchExplore = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentBatch } = useAppSelector((state) => state.batches);
  const { success, error: showError } = useToast();
  
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());
  const [videos, setVideos] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [draggedVideo, setDraggedVideo] = useState(null);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showQuizzes, setShowQuizzes] = useState(false);
  const [showCreateTaskDrawer, setShowCreateTaskDrawer] = useState(false);
  const [showEditTaskDrawer, setShowEditTaskDrawer] = useState(false);
  const [showCreateQuizDrawer, setShowCreateQuizDrawer] = useState(false);
  const [showAssignMarksDrawer, setShowAssignMarksDrawer] = useState(false);
  const [showSubmissionsDialog, setShowSubmissionsDialog] = useState(false);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [showUploadSubmissionDrawer, setShowUploadSubmissionDrawer] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [studentFiles, setStudentFiles] = useState({}); // { studentId: File }
  const [uploadingForStudent, setUploadingForStudent] = useState(null);
  const [showStudents, setShowStudents] = useState(false);
  const [showStudentEditDrawer, setShowStudentEditDrawer] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentToBlock, setStudentToBlock] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [videoPreview, setVideoPreview] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentBlockFilter, setStudentBlockFilter] = useState(0); // 0 = unblocked, 1 = blocked, null = all
  const searchTimeoutRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    short_description: '',
    source_type: 'internal',
    video_file: null,
    external_url: '',
  });
  const [studentFormData, setStudentFormData] = useState({
    name: '',
    first_name: '',
    last_name: '',
    email: '',
    contact_no: '',
    emergency_contact_no: '',
    address: '',
    country: '',
    city: '',
    guardian_name: '',
    guardian_email: '',
    guardian_contact_no: '',
    password: '',
    picture: null,
  });
  const [studentPicturePreview, setStudentPicturePreview] = useState(null);
  const [uploadingStudentPicture, setUploadingStudentPicture] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    user_id: '', // Optional: specific student
    marks: '', // Task marks/total marks
  });
  const [taskFile, setTaskFile] = useState(null);
  const taskFileInputRef = useRef(null);
  const [quizFormData, setQuizFormData] = useState({
    title: '',
    quiz_date: '',
    description: '',
    total_marks: '',
  });
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizStudents, setQuizStudents] = useState([]);
  const [quizMarks, setQuizMarks] = useState({}); // { studentId: { obtained_marks, total_marks, remarks } }
  const [gradeFormData, setGradeFormData] = useState({
    obtained_marks: '',
    instructor_comments: '',
  });

  useEffect(() => {
    if (id) {
      loadBatch();
      loadSubjects();
    }
  }, [id]);

  useEffect(() => {
    if (showStudents && id) {
      // Load students with current filter (defaults to unblocked = 0)
      loadStudents(null, studentBlockFilter);
    }
  }, [showStudents, id]);

  const loadBatch = async () => {
    try {
      await dispatch(fetchBatch(id)).unwrap();
    } catch (err) {
      showError('Failed to load batch');
    }
  };

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const endpoint = API_ENDPOINTS.batches.show.replace(':id', id);
      const response = await apiService.get(endpoint);
      const batch = response.data.data;
      setSubjects(batch.subjects || []);
    } catch (err) {
      showError('Failed to load subjects');
      console.error('Error loading subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVideos = async (subjectId) => {
    setLoadingVideos(true);
    try {
      const endpoint = API_ENDPOINTS.videos.getBatchSubjectVideos
        .replace(':batchId', id)
        .replace(':subjectId', subjectId);
      const response = await apiService.get(endpoint);
      setVideos(response.data.data || []);
    } catch (err) {
      showError('Failed to load videos');
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleSubjectClick = (subject) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subject.id)) {
      newExpanded.delete(subject.id);
      if (selectedSubject?.id === subject.id) {
        setSelectedSubject(null);
        setVideos([]);
      }
    } else {
      newExpanded.add(subject.id);
    }
    setExpandedSubjects(newExpanded);
  };

  const handleVideosClick = (subject, e) => {
    e.stopPropagation();
    setSelectedSubject(subject);
    setShowStudents(false);
    setShowTasks(false);
    loadVideos(subject.id);
  };

  const handleTasksClick = async (subject, e) => {
    e.stopPropagation();
    setSelectedSubject(subject);
    setShowStudents(false);
    setShowTasks(true);
    // Load students for task assignment dropdown
    if (students.length === 0) {
      await loadStudents();
    }
    loadTasks(subject.id);
  };

  const handleStudentsClick = (e) => {
    e.stopPropagation();
    setSelectedSubject(null);
    setShowStudents(true);
    setShowTasks(false);
    loadStudents();
  };

  const loadTasks = async (subjectId) => {
    setLoadingTasks(true);
    try {
      const params = {
        batch_id: id,
        subject_id: subjectId,
      };
      const response = await apiService.get(API_ENDPOINTS.tasks.list, { params });
      setTasks(response.data.data || []);
    } catch (err) {
      showError('Failed to load tasks');
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleCreateTask = () => {
    setTaskFormData({
      title: '',
      description: '',
      due_date: '',
      user_id: '',
      marks: '',
    });
    setTaskFile(null);
    setEditingTask(null);
    setShowCreateTaskDrawer(true);
  };

  const handleEditTask = async (task) => {
    setEditingTask(task);
    // Format due_date for date input (YYYY-MM-DD)
    let formattedDueDate = '';
    if (task.due_date) {
      const date = new Date(task.due_date);
      // Format as YYYY-MM-DD for date input
      formattedDueDate = date.toISOString().split('T')[0];
    }
    setTaskFormData({
      title: task.title || '',
      description: task.description || '',
      due_date: formattedDueDate,
      user_id: task.user_id || '',
      marks: task.marks || task.total_marks || '',
    });
    setTaskFile(null);
    setShowEditTaskDrawer(true);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', taskFormData.title);
      if (taskFormData.description) {
        formData.append('description', taskFormData.description);
      }
      formData.append('batch_id', id);
      formData.append('subject_id', selectedSubject.id);
      // Always append due_date if it exists (required field)
      if (taskFormData.due_date) {
        formData.append('due_date', taskFormData.due_date);
      } else {
        // If empty but required, send empty string to trigger validation error
        formData.append('due_date', '');
      }
      if (taskFormData.user_id) {
        formData.append('user_id', taskFormData.user_id);
      }
      if (taskFormData.marks) {
        formData.append('marks', taskFormData.marks);
      }
      if (taskFile) {
        formData.append('task_file', taskFile);
      }

      if (editingTask) {
        // Update existing task
        const endpoint = API_ENDPOINTS.tasks.update.replace(':id', editingTask.id);
        await apiService.put(endpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        success('Task updated successfully');
        setShowEditTaskDrawer(false);
      } else {
        // Create new task
        await apiService.post(API_ENDPOINTS.tasks.create, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        success('Task created successfully');
        setShowCreateTaskDrawer(false);
      }
      setTaskFile(null);
      setEditingTask(null);
      await loadTasks(selectedSubject.id);
    } catch (err) {
      showError(err.response?.data?.message || (editingTask ? 'Failed to update task' : 'Failed to create task'));
    }
  };

  const handleViewSubmissions = async (task) => {
    setSelectedTask(task);
    try {
      const endpoint = API_ENDPOINTS.tasks.getSubmissions.replace(':id', task.id);
      const response = await apiService.get(endpoint);
      setSubmissions(response.data.data || []);
      setShowSubmissionsDialog(true);
    } catch (err) {
      showError('Failed to load submissions');
    }
  };

  const handleGradeSubmission = (submission) => {
    setSelectedSubmission(submission);
    setGradeFormData({
      obtained_marks: submission.obtained_marks ?? submission.marks ?? '',
      instructor_comments: submission.instructor_comments ?? submission.teacher_remarks ?? '',
    });
    setShowGradeDialog(true);
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = API_ENDPOINTS.tasks.gradeSubmission
        .replace(':taskId', selectedTask.id)
        .replace(':submissionId', selectedSubmission.id);
      await apiService.post(endpoint, gradeFormData);
      success('Submission graded successfully');
      setShowGradeDialog(false);
      // Reload submissions
      const submissionsEndpoint = API_ENDPOINTS.tasks.getSubmissions.replace(':id', selectedTask.id);
      const response = await apiService.get(submissionsEndpoint);
      setSubmissions(response.data.data || []);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to grade submission');
    }
  };

  const handleUploadStudentSubmission = async (task) => {
    setSelectedTask(task);
    setShowUploadSubmissionDrawer(true);
    setStudentFiles({});
    // Load students if not already loaded
    if (students.length === 0) {
      await loadStudents();
    }
  };

  const handleStudentFileChange = (studentId, file) => {
    setStudentFiles(prev => ({
      ...prev,
      [studentId]: file,
    }));
  };

  const handleUploadSubmissionForStudent = async (studentId) => {
    const file = studentFiles[studentId];
    if (!file) {
      showError('Please select a file to upload');
      return;
    }

    try {
      setUploadingForStudent(studentId);
      const formData = new FormData();
      formData.append('student_id', studentId);
      formData.append('file', file);

      const endpoint = API_ENDPOINTS.tasks.uploadStudentSubmission.replace(':taskId', selectedTask.id);
      await apiService.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      success(`Task submission uploaded successfully for ${students.find(s => s.id === studentId)?.name || 'student'}`);
      
      // Remove file from state
      setStudentFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[studentId];
        return newFiles;
      });
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to upload submission');
    } finally {
      setUploadingForStudent(null);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task? All submissions will also be deleted.')) {
      return;
    }
    try {
      const endpoint = API_ENDPOINTS.tasks.delete.replace(':id', taskId);
      await apiService.delete(endpoint);
      success('Task deleted successfully');
      await loadTasks(selectedSubject.id);
    } catch (err) {
      showError('Failed to delete task');
    }
  };

  // Quiz handlers
  const handleQuizzesClick = async (subject, e) => {
    if (e) e.stopPropagation();
    setSelectedSubject(subject);
    setShowStudents(false);
    setShowTasks(false);
    setShowQuizzes(true);
    await loadQuizzes(subject?.id);
  };

  const handleBatchQuizzesClick = async () => {
    setSelectedSubject(null);
    setShowStudents(false);
    setShowTasks(false);
    setShowQuizzes(true);
    await loadQuizzes(null); // null means batch-level quiz
  };

  const loadQuizzes = async (subjectId) => {
    setLoadingQuizzes(true);
    try {
      const params = {
        batch_id: id,
      };
      if (subjectId !== null && subjectId !== undefined) {
        params.subject_id = subjectId;
      } else {
        params.subject_id = 'null'; // For batch-level quizzes
      }
      const response = await apiService.get(API_ENDPOINTS.quizzes.list, { params });
      setQuizzes(response.data.data || []);
    } catch (err) {
      showError('Failed to load quizzes');
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const handleCreateQuiz = () => {
    setQuizFormData({
      title: '',
      quiz_date: new Date().toISOString().split('T')[0], // Default to today
      description: '',
      total_marks: '',
    });
    setSelectedQuiz(null);
    setShowCreateQuizDrawer(true);
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        title: quizFormData.title,
        batch_id: id,
        subject_id: selectedSubject?.id || null,
        quiz_date: quizFormData.quiz_date,
        description: quizFormData.description || null,
        total_marks: quizFormData.total_marks || null,
      };
      await apiService.post(API_ENDPOINTS.quizzes.create, data);
      success('Quiz created successfully');
      setShowCreateQuizDrawer(false);
      await loadQuizzes(selectedSubject?.id);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create quiz');
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz? All marks will also be deleted.')) {
      return;
    }
    try {
      const endpoint = API_ENDPOINTS.quizzes.delete.replace(':id', quizId);
      await apiService.delete(endpoint);
      success('Quiz deleted successfully');
      await loadQuizzes(selectedSubject?.id);
    } catch (err) {
      showError('Failed to delete quiz');
    }
  };

  const handleAssignMarks = async (quiz) => {
    setSelectedQuiz(quiz);
    try {
      const endpoint = API_ENDPOINTS.quizzes.getStudents.replace(':id', quiz.id);
      const response = await apiService.get(endpoint);
      const data = response.data.data;
      setQuizStudents(data.students || []);
      
      // Initialize marks state with existing marks
      const marksState = {};
      data.students?.forEach(student => {
        marksState[student.id] = {
          obtained_marks: student.obtained_marks || '',
          total_marks: student.total_marks || quiz.total_marks || '',
          remarks: student.remarks || '',
        };
      });
      setQuizMarks(marksState);
      setShowAssignMarksDrawer(true);
    } catch (err) {
      showError('Failed to load students for quiz');
    }
  };

  const handleMarksSubmit = async (e) => {
    e.preventDefault();
    try {
      const marks = Object.entries(quizMarks).map(([studentId, markData]) => ({
        student_id: parseInt(studentId),
        obtained_marks: parseFloat(markData.obtained_marks) || 0,
        total_marks: markData.total_marks ? parseFloat(markData.total_marks) : null,
        remarks: markData.remarks || null,
      }));

      const endpoint = API_ENDPOINTS.quizzes.assignMarks.replace(':id', selectedQuiz.id);
      await apiService.post(endpoint, { marks });
      success('Marks assigned successfully');
      setShowAssignMarksDrawer(false);
      setSelectedQuiz(null);
      setQuizMarks({});
      await loadQuizzes(selectedSubject?.id);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to assign marks');
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

  const loadStudents = async (searchTerm = null, blockFilter = null) => {
    setLoadingStudents(true);
    try {
      const endpoint = API_ENDPOINTS.batches.getStudents.replace(':id', id);
      const params = {};
      const search = searchTerm !== null ? searchTerm : studentSearch;
      if (search) {
        params.search = search;
      }
      const block = blockFilter !== null ? blockFilter : studentBlockFilter;
      if (block !== null && block !== undefined && block !== '') {
        params.block = block;
      }
      const response = await apiService.get(endpoint, { params });
      setStudents(response.data.data.data || []);
    } catch (err) {
      showError('Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Check if user is admin
  const isAdmin = () => {
    if (!currentUser) return false;
    if (currentUser.roles && Array.isArray(currentUser.roles)) {
      return currentUser.roles.some(role => role.title?.toLowerCase() === 'admin');
    }
    return currentUser.user_type === 1 || currentUser.user_type_title?.toLowerCase() === 'admin';
  };

  // Check if user is teacher or CR
  const isTeacherOrCR = () => {
    if (!currentUser) return false;
    if (currentUser.roles && Array.isArray(currentUser.roles)) {
      const hasTeacher = currentUser.roles.some(role => {
        const title = role.title?.toLowerCase();
        return title === 'teacher' || title === 'class representative (cr)';
      });
      const hasAdmin = currentUser.roles.some(role => role.title?.toLowerCase() === 'admin');
      return hasTeacher && !hasAdmin;
    }
    return false;
  };

  // Check if user is teacher (not CR)
  const isTeacher = () => {
    if (!currentUser) return false;
    if (currentUser.roles && Array.isArray(currentUser.roles)) {
      const hasTeacher = currentUser.roles.some(role => {
        const title = role.title?.toLowerCase();
        return title === 'teacher';
      });
      const hasAdmin = currentUser.roles.some(role => role.title?.toLowerCase() === 'admin');
      return hasTeacher && !hasAdmin;
    }
    return false;
  };

  const hasEditAccess = isAdmin() || isTeacherOrCR();
  const hasFullAccess = isAdmin();
  const hasTaskAccess = isAdmin() || isTeacher(); // Only Admin and Teacher, not CR

  const handleDragStart = (e, video) => {
    setDraggedVideo(video);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetVideo) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedVideo || draggedVideo.id === targetVideo.id || !selectedSubject) {
      setDraggedVideo(null);
      return;
    }

    const draggedIndex = videos.findIndex(v => v.id === draggedVideo.id);
    const targetIndex = videos.findIndex(v => v.id === targetVideo.id);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      setDraggedVideo(null);
      return;
    }

    // Reorder videos array
    const newVideos = [...videos];
    const [removed] = newVideos.splice(draggedIndex, 1);
    newVideos.splice(targetIndex, 0, removed);

    // Update sort_order values - assign new indices
    const videoIds = newVideos.map(v => v.id);
    
    // Optimistically update UI
    const updatedVideos = newVideos.map((video, index) => ({
      ...video,
      sort_order: index
    }));
    setVideos(updatedVideos);

    // Save new order to backend
    try {
      const endpoint = API_ENDPOINTS.videos.reorderBatchSubjectVideos
        .replace(':batchId', id)
        .replace(':subjectId', selectedSubject.id);
      await apiService.post(endpoint, { video_ids: videoIds });
      success('Video order updated successfully');
    } catch (err) {
      showError('Failed to update video order');
      // Revert on error
      loadVideos(selectedSubject.id);
    }

    setDraggedVideo(null);
  };

  const handleDragEnd = () => {
    setDraggedVideo(null);
  };

  const handleCreateVideo = () => {
    setFormData({
      title: '',
      short_description: '',
      source_type: 'internal',
      video_file: null,
      external_url: '',
    });
    setVideoPreview(null);
    setShowCreateDrawer(true);
  };

  const handleVideoSubmit = async (e) => {
    e.preventDefault();
    
    const submitData = {
      title: formData.title,
      short_description: formData.short_description,
      source_type: formData.source_type,
    };

    if (formData.source_type === 'internal') {
      if (!formData.video_file) {
        showError('Please select a video file');
        return;
      }
      submitData.video_file = formData.video_file;
    } else {
      if (!formData.external_url) {
        showError('Please enter an external video URL');
        return;
      }
      submitData.external_url = formData.external_url;
    }

    // Check if we need to show upload progress (internal video with file upload)
    const hasFileUpload = formData.source_type === 'internal' && formData.video_file;
    
    if (hasFileUpload) {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Add progress callback
      submitData.onUploadProgress = (progress) => {
        setUploadProgress(progress);
      };
    }

    try {
      // Create the video
      const createdVideo = await dispatch(createVideo(submitData)).unwrap();
      success('Video created successfully');
      
      // Automatically assign to current batch and subject
      if (id && selectedSubject) {
        try {
          await apiService.post(
            buildEndpoint(API_ENDPOINTS.videos.assignToBatchSubject, { id: createdVideo.id }),
            {
              batch_id: Number(id),
              subject_id: selectedSubject.id,
            }
          );
          success('Video created and assigned to batch and subject');
          
          // Reload videos to show the new one
          await loadVideos(selectedSubject.id);
        } catch (assignErr) {
          showError('Video created but failed to assign to batch and subject');
          console.error('Assignment error:', assignErr);
        }
      }
      
      setIsUploading(false);
      setUploadProgress(0);
      setShowCreateDrawer(false);
      setFormData({
        title: '',
        short_description: '',
        source_type: 'internal',
        video_file: null,
        external_url: '',
      });
      setVideoPreview(null);
    } catch (err) {
      setIsUploading(false);
      setUploadProgress(0);
      const errorMessage = typeof err === 'string' ? err : err?.title?.[0] || 'Operation failed';
      showError(errorMessage);
    }
  };

  // Cleanup video preview URL on unmount
  useEffect(() => {
    return () => {
      if (videoPreview && videoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreview);
      }
      if (studentPicturePreview && studentPicturePreview.startsWith('blob:')) {
        URL.revokeObjectURL(studentPicturePreview);
      }
    };
  }, [videoPreview, studentPicturePreview]);

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setStudentFormData({
      name: student.name || '',
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      email: student.email || '',
      contact_no: student.contact_no || '',
      emergency_contact_no: student.emergency_contact_no || '',
      address: student.address || '',
      country: student.country || '',
      city: student.city || '',
      guardian_name: student.guardian_name || '',
      guardian_email: student.guardian_email || '',
      guardian_contact_no: student.guardian_contact_no || '',
      password: '',
      picture: null,
    });
    if (student.picture_url || student.picture) {
      let pictureUrl = student.picture_url || (student.picture ? getStorageUrl(student.picture) : null);
      if (pictureUrl) {
        pictureUrl = normalizeStorageUrl(pictureUrl);
      }
      setStudentPicturePreview(pictureUrl);
    } else {
      setStudentPicturePreview(null);
    }
    setShowStudentEditDrawer(true);
  };

  const handleStudentPictureChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please select a valid image file');
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showError('Image size should be less than 2MB');
      e.target.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setStudentPicturePreview(previewUrl);
    setStudentFormData({ ...studentFormData, picture: file });
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();

    const submitData = { ...studentFormData };
    if (!submitData.password) {
      delete submitData.password;
    }

    // Clean up empty strings
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === '') {
        delete submitData[key];
      }
    });

    try {
      const formDataToSend = new FormData();
      Object.keys(submitData).forEach(key => {
        if (key === 'picture' && submitData[key]) {
          formDataToSend.append('picture', submitData[key]);
        } else if (key !== 'picture') {
          formDataToSend.append(key, submitData[key]);
        }
      });

      // Use updateStudent endpoint for CR/Teacher, update for Admin
      const endpoint = hasFullAccess 
        ? buildEndpoint(API_ENDPOINTS.users.update, { id: editingStudent.id })
        : buildEndpoint(API_ENDPOINTS.users.updateStudent, { id: editingStudent.id });
      
      await apiService.put(endpoint, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      success('Student updated successfully');
      setShowStudentEditDrawer(false);
      setEditingStudent(null);
      await loadStudents();
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : err?.email?.[0] || 'Operation failed';
      showError(errorMessage);
    }
  };

  const handleBlockStudent = (student) => {
    setStudentToBlock(student);
    setBlockReason('');
    setShowBlockDialog(true);
  };

  const handleBlockConfirm = async () => {
    if (!studentToBlock) return;

    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.users.block, { id: studentToBlock.id });
      await apiService.post(endpoint, { block_reason: blockReason });
      success('Student blocked successfully');
      setShowBlockDialog(false);
      setStudentToBlock(null);
      setBlockReason('');
      await loadStudents();
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to block student';
      showError(errorMessage);
    }
  };

  const handleUnblockStudent = async (studentId) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.users.unblock, { id: studentId });
      await apiService.post(endpoint);
      success('Student unblocked successfully');
      await loadStudents();
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to unblock student';
      showError(errorMessage);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student?')) {
      return;
    }

    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.users.delete, { id: studentId });
      await apiService.delete(endpoint);
      success('Student deleted successfully');
      await loadStudents();
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to delete student';
      showError(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Left Sidebar - Subjects */}
      <div className="w-64 border-r border-border bg-card overflow-y-auto">
        <div className="p-4 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/batches')}
            className="w-full justify-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Batches
          </Button>
        </div>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-4">Subjects</h3>
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subjects assigned</p>
          ) : (
            <div className="space-y-1">
              {subjects.map((subject) => (
                <div key={subject.id}>
                  <button
                    onClick={() => handleSubjectClick(subject)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                      expandedSubjects.has(subject.id)
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50 text-foreground"
                    )}
                  >
                    <span className="flex-1 text-left">{subject.title}</span>
                    {expandedSubjects.has(subject.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {expandedSubjects.has(subject.id) && (
                    <div className="ml-4 mt-1">
                      <button
                        onClick={(e) => handleVideosClick(subject, e)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                          selectedSubject?.id === subject.id && !showStudents && !showTasks
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent/50 text-muted-foreground"
                        )}
                      >
                        <Video className="h-4 w-4" />
                        Videos
                      </button>
                      {hasTaskAccess && (
                        <button
                          onClick={(e) => handleTasksClick(subject, e)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                            selectedSubject?.id === subject.id && showTasks
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-accent/50 text-muted-foreground"
                          )}
                        >
                          <ClipboardList className="h-4 w-4" />
                          Tasks
                        </button>
                      )}
                      {hasTaskAccess && (
                        <button
                          onClick={(e) => handleQuizzesClick(subject, e)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                            selectedSubject?.id === subject.id && showQuizzes
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-accent/50 text-muted-foreground"
                          )}
                        >
                          <FileQuestion className="h-4 w-4" />
                          Quiz
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Students Section */}
          {hasEditAccess && (
            <div className="mt-6 pt-6 border-t border-border space-y-1">
              <button
                onClick={handleStudentsClick}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  showStudents
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent/50 text-foreground"
                )}
              >
                <Users className="h-4 w-4" />
                Students
              </button>
              {hasTaskAccess && (
                <button
                  onClick={handleBatchQuizzesClick}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    showQuizzes && !selectedSubject
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent/50 text-foreground"
                  )}
                >
                  <FileQuestion className="h-4 w-4" />
                  Quiz
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Batch Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {currentBatch?.title || 'Batch Details'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {currentBatch?.active ? (
                <span className="text-green-500">Active</span>
              ) : (
                <span className="text-muted-foreground">Inactive</span>
              )}
            </p>
          </div>

          {/* Students Content */}
          {showStudents ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>Students</CardTitle>
                  <div className="flex items-center gap-4">
                    <select
                      value={studentBlockFilter === null ? '' : studentBlockFilter}
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        const filterValue = selectedValue === '' ? null : Number(selectedValue);
                        // Update state: use null for "All", otherwise use the number value
                        setStudentBlockFilter(filterValue === null ? null : filterValue);
                        // Load students with the filter value (null = all, 0 = unblocked, 1 = blocked)
                        loadStudents(null, filterValue);
                      }}
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="0">Unblocked</option>
                      <option value="1">Blocked</option>
                      <option value="">All</option>
                    </select>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students..."
                        value={studentSearch}
                        onChange={(e) => {
                          const value = e.target.value;
                          setStudentSearch(value);
                          // Clear previous timeout
                          if (searchTimeoutRef.current) {
                            clearTimeout(searchTimeoutRef.current);
                          }
                          // Debounce search
                          searchTimeoutRef.current = setTimeout(() => {
                            loadStudents();
                          }, 500);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (searchTimeoutRef.current) {
                              clearTimeout(searchTimeoutRef.current);
                            }
                            loadStudents();
                          }
                        }}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingStudents ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No students assigned to this batch</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent/50"
                      >
                        <div className="flex-shrink-0">
                          {student.picture_url || student.picture ? (
                            <img
                              src={normalizeStorageUrl(student.picture_url || getStorageUrl(student.picture))}
                              alt={student.name}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                              <Users className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground truncate">
                              {student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'No Name'}
                            </h3>
                            {Number(student.block) === 1 && (
                              <span className="text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded">
                                Blocked
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                          {student.contact_no && (
                            <p className="text-xs text-muted-foreground">Contact: {student.contact_no}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {hasEditAccess && (
                            <Tooltip content="Edit Student">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditStudent(student)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          )}
                          {hasEditAccess && (
                            <Tooltip content={Number(student.block) === 1 ? "Unblock Student" : "Block Student"}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (Number(student.block) === 1) {
                                    handleUnblockStudent(student.id);
                                  } else {
                                    handleBlockStudent(student);
                                  }
                                }}
                              >
                                {Number(student.block) === 1 ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Ban className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </Tooltip>
                          )}
                          {hasFullAccess && (
                            <Tooltip content="Delete Student">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteStudent(student.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (selectedSubject && showQuizzes) || (!selectedSubject && showQuizzes) ? (
            /* Quizzes Content */
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {selectedSubject ? `Quizzes - ${selectedSubject.title}` : 'Batch Quizzes'}
                  </CardTitle>
                  {hasTaskAccess && (
                    <Button onClick={handleCreateQuiz} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Quiz
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingQuizzes ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : quizzes.length === 0 ? (
                  <div className="text-center py-12">
                    <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No quizzes found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {quizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">
                              {quiz.title}
                            </h3>
                            {quiz.subject && (
                              <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded">
                                {quiz.subject.title}
                              </span>
                            )}
                            {!quiz.subject && (
                              <span className="text-xs bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded">
                                Batch Level
                              </span>
                            )}
                          </div>
                          {quiz.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {quiz.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(quiz.quiz_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            {quiz.total_marks && (
                              <span className="flex items-center gap-1">
                                <Award className="h-3 w-3" />
                                Total: {quiz.total_marks} marks
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {quiz.marks_count || 0} students marked
                            </span>
                          </div>
                        </div>
                        {hasTaskAccess && (
                          <div className="flex gap-2">
                            <Tooltip content="Assign Marks">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAssignMarks(quiz)}
                              >
                                <Award className="h-4 w-4 mr-2" />
                                Assign Marks
                              </Button>
                            </Tooltip>
                            <Tooltip content="Delete Quiz">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteQuiz(quiz.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : selectedSubject && showTasks ? (
            /* Tasks Content */
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Tasks - {selectedSubject.title}
                  </CardTitle>
                  <Button onClick={handleCreateTask} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingTasks ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No tasks assigned to this subject</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-accent/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-sm font-semibold text-foreground">
                              {task.title}
                            </h3>
                            {isOverdue(task.due_date) && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500">
                                <AlertCircle className="h-3 w-3" />
                                Overdue
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          {/* Task Attachment Files */}
                          {task.attachment_files && task.attachment_files.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Attachments:</p>
                              <div className="flex flex-wrap gap-1">
                                {task.attachment_files.map((file, idx) => (
                                  <Button
                                    key={idx}
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-xs px-2"
                                    onClick={() => {
                                      if (file.file_url) {
                                        window.open(file.file_url, '_blank');
                                      }
                                    }}
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    {file.name || file.file_path?.split('/').pop() || `File ${idx + 1}`}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Due: {formatDate(task.due_date)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>{task.submissions_count || 0} submissions</span>
                            </div>
                            {task.graded_count > 0 && (
                              <div className="flex items-center gap-1">
                                <Award className="h-3 w-3" />
                                <span>{task.graded_count} graded</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {task.file_path || task.file_url ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Use file_url from backend if available, otherwise construct it
                                let fileUrl = task.file_url;
                                if (!fileUrl && task.file_path) {
                                  // Construct URL using API base URL
                                  const cleanPath = task.file_path.startsWith('/') 
                                    ? task.file_path.slice(1) 
                                    : task.file_path;
                                  fileUrl = `${APP_BASE_URL}/load-storage/${cleanPath}`;
                                }
                                if (fileUrl) {
                                  // Normalize URL to fix localhost:8000 issues
                                  const normalizedUrl = normalizeUrl(fileUrl);
                                  window.open(normalizedUrl, '_blank');
                                }
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              View File
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTask(task)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSubmissions(task)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Submissions
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUploadStudentSubmission(task)}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Student Submission
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : selectedSubject ? (
            /* Videos Content */
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Videos - {selectedSubject.title}
                  </CardTitle>
                  <Button onClick={handleCreateVideo} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Video
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingVideos ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : videos.length === 0 ? (
                  <div className="text-center py-12">
                    <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No videos assigned to this subject</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {videos.map((video, index) => (
                      <div
                        key={video.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, video)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, video)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "flex items-center gap-4 p-4 border border-border rounded-lg cursor-move transition-colors",
                          draggedVideo?.id === video.id
                            ? "opacity-50 bg-muted"
                            : "hover:bg-accent/50"
                        )}
                      >
                        <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              #{index + 1}
                            </span>
                            <h3 className="text-sm font-semibold text-foreground">
                              {video.title}
                            </h3>
                            {video.source_type === 'internal' ? (
                              <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded">
                                Internal
                              </span>
                            ) : (
                              <span className="text-xs bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded">
                                External
                              </span>
                            )}
                          </div>
                          {video.short_description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {video.short_description}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Sort Order: {video.sort_order ?? 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    {hasEditAccess 
                      ? 'Select a subject from the sidebar and click "Videos" to view and manage videos, or click "Students" to manage students'
                      : 'Select a subject from the sidebar and click "Videos" to view and manage videos'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Video Drawer */}
      <Drawer
        isOpen={showCreateDrawer}
        onClose={() => {
          if (!isUploading) {
            setShowCreateDrawer(false);
            // Clean up video preview URL if it's an object URL
            if (videoPreview && videoPreview.startsWith('blob:')) {
              URL.revokeObjectURL(videoPreview);
            }
            setVideoPreview(null);
            setIsUploading(false);
            setUploadProgress(0);
          }
        }}
        title="Create New Video"
      >
        <form onSubmit={handleVideoSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="short_description">Short Description (Keywords for search)</Label>
            <textarea
              id="short_description"
              value={formData.short_description}
              onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Enter keywords or short description for search..."
            />
          </div>

          <div>
            <Label>Video Source *</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="source_type"
                  value="internal"
                  checked={formData.source_type === 'internal'}
                  onChange={(e) => {
                    setFormData({ ...formData, source_type: e.target.value, external_url: '' });
                    setVideoPreview(null);
                  }}
                  className="h-4 w-4"
                />
                <span>Internal Server</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="source_type"
                  value="external"
                  checked={formData.source_type === 'external'}
                  onChange={(e) => {
                    setFormData({ ...formData, source_type: e.target.value, video_file: null });
                    setVideoPreview(null);
                  }}
                  className="h-4 w-4"
                />
                <span>External Link</span>
              </label>
            </div>
          </div>

          {formData.source_type === 'internal' ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="video_file">Upload Video *</Label>
                <Input
                  id="video_file"
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setFormData({ ...formData, video_file: file });
                    // Create preview for new file
                    if (file) {
                      const previewUrl = URL.createObjectURL(file);
                      setVideoPreview(previewUrl);
                    } else {
                      setVideoPreview(null);
                    }
                  }}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: MP4, AVI, MOV, WMV, FLV, WEBM (Max 100MB)
                </p>
              </div>
              
              {/* Video Preview */}
              {videoPreview && (
                <div>
                  <Label>Video Preview</Label>
                  <div className="mt-2 rounded-md border border-input overflow-hidden bg-muted">
                    <video
                      src={videoPreview}
                      controls
                      className="w-full max-h-64"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <Label htmlFor="external_url">External Video URL *</Label>
              <Input
                id="external_url"
                type="url"
                value={formData.external_url}
                onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                placeholder="https://example.com/video.mp4"
                required
              />
            </div>
          )}

          {/* Upload Progress Bar - Show only for internal video uploads */}
          {isUploading && formData.source_type === 'internal' && formData.video_file && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploading video...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              {formData.video_file && (
                <p className="text-xs text-muted-foreground truncate">
                  {formData.video_file.name}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading... {uploadProgress}%
                </>
              ) : (
                'Create Video'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateDrawer(false);
                setIsUploading(false);
                setUploadProgress(0);
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Edit Student Drawer */}
      <Drawer
        isOpen={showStudentEditDrawer}
        onClose={() => {
          setShowStudentEditDrawer(false);
          setEditingStudent(null);
          if (studentPicturePreview && studentPicturePreview.startsWith('blob:')) {
            URL.revokeObjectURL(studentPicturePreview);
          }
          setStudentPicturePreview(null);
          setStudentFormData({
            name: '',
            first_name: '',
            last_name: '',
            email: '',
            contact_no: '',
            emergency_contact_no: '',
            address: '',
            country: '',
            city: '',
            guardian_name: '',
            guardian_email: '',
            guardian_contact_no: '',
            password: '',
            picture: null,
          });
        }}
        title="Edit Student"
      >
        <form onSubmit={handleStudentSubmit} className="space-y-4">
          <div>
            <Label htmlFor="student_name">Name *</Label>
            <Input
              id="student_name"
              value={studentFormData.name}
              onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={studentFormData.first_name}
                onChange={(e) => setStudentFormData({ ...studentFormData, first_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={studentFormData.last_name}
                onChange={(e) => setStudentFormData({ ...studentFormData, last_name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="student_email">Email *</Label>
            <Input
              id="student_email"
              type="email"
              value={studentFormData.email}
              onChange={(e) => setStudentFormData({ ...studentFormData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="student_password">Password {editingStudent ? '(Leave empty to keep current)' : '*'}</Label>
            <Input
              id="student_password"
              type="password"
              value={studentFormData.password}
              onChange={(e) => setStudentFormData({ ...studentFormData, password: e.target.value })}
              required={!editingStudent}
              minLength={8}
            />
            <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_no">Contact No</Label>
              <Input
                id="contact_no"
                value={studentFormData.contact_no}
                onChange={(e) => setStudentFormData({ ...studentFormData, contact_no: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="emergency_contact_no">Emergency Contact</Label>
              <Input
                id="emergency_contact_no"
                value={studentFormData.emergency_contact_no}
                onChange={(e) => setStudentFormData({ ...studentFormData, emergency_contact_no: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <textarea
              id="address"
              value={studentFormData.address}
              onChange={(e) => setStudentFormData({ ...studentFormData, address: e.target.value })}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={studentFormData.country}
                onChange={(e) => setStudentFormData({ ...studentFormData, country: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={studentFormData.city}
                onChange={(e) => setStudentFormData({ ...studentFormData, city: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="guardian_name">Guardian Name</Label>
            <Input
              id="guardian_name"
              value={studentFormData.guardian_name}
              onChange={(e) => setStudentFormData({ ...studentFormData, guardian_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="guardian_email">Guardian Email</Label>
              <Input
                id="guardian_email"
                type="email"
                value={studentFormData.guardian_email}
                onChange={(e) => setStudentFormData({ ...studentFormData, guardian_email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="guardian_contact_no">Guardian Contact</Label>
              <Input
                id="guardian_contact_no"
                value={studentFormData.guardian_contact_no}
                onChange={(e) => setStudentFormData({ ...studentFormData, guardian_contact_no: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="student_picture">Profile Picture</Label>
            <Input
              id="student_picture"
              type="file"
              accept="image/*"
              onChange={handleStudentPictureChange}
            />
            <p className="text-xs text-muted-foreground mt-1">Max 2MB (JPEG, PNG, JPG, GIF)</p>
            {studentPicturePreview && (
              <div className="mt-2">
                <img
                  src={studentPicturePreview}
                  alt="Preview"
                  className="h-24 w-24 rounded-full object-cover border border-border"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={uploadingStudentPicture}>
              {uploadingStudentPicture ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Update Student'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowStudentEditDrawer(false);
                setEditingStudent(null);
              }}
              disabled={uploadingStudentPicture}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Block Student Dialog */}
      <Dialog
        isOpen={showBlockDialog}
        onClose={() => {
          setShowBlockDialog(false);
          setStudentToBlock(null);
          setBlockReason('');
        }}
        title="Block Student"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to block {studentToBlock?.name || studentToBlock?.email}?
          </p>
          <div>
            <Label htmlFor="block_reason">Block Reason (Optional)</Label>
            <textarea
              id="block_reason"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
              placeholder="Enter reason for blocking..."
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleBlockConfirm}
              className="flex-1"
              variant="destructive"
            >
              Block Student
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowBlockDialog(false);
                setStudentToBlock(null);
                setBlockReason('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Create Task Drawer */}
      <Drawer
        isOpen={showCreateTaskDrawer}
        onClose={() => {
          setShowCreateTaskDrawer(false);
          setTaskFormData({
            title: '',
            description: '',
            due_date: '',
            user_id: '',
            marks: '',
          });
          setTaskFile(null);
          if (taskFileInputRef.current) {
            taskFileInputRef.current.value = '';
          }
        }}
        title="Create Task"
      >
        <form onSubmit={handleTaskSubmit} className="space-y-4">
          <div>
            <Label htmlFor="task_title">Task Title *</Label>
            <Input
              id="task_title"
              value={taskFormData.title}
              onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
              placeholder="Enter task title"
              required
            />
          </div>
          <div>
            <Label htmlFor="task_description">Description</Label>
            <textarea
              id="task_description"
              value={taskFormData.description}
              onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Enter task description"
            />
          </div>
          <div>
            <Label htmlFor="task_due_date">Due Date *</Label>
            <Input
              id="task_due_date"
              type="date"
              value={taskFormData.due_date}
              onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="task_marks">Marks (Optional)</Label>
            <Input
              id="task_marks"
              type="number"
              min="0"
              step="0.01"
              value={taskFormData.marks}
              onChange={(e) => setTaskFormData({ ...taskFormData, marks: e.target.value })}
              placeholder="Enter total marks for this task"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Total marks for this task (e.g., 100)
            </p>
          </div>
          <div>
            <Label htmlFor="task_file">Task File (Optional)</Label>
            <Input
              id="task_file"
              type="file"
              ref={taskFileInputRef}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  // Check file size (10MB max)
                  if (file.size > 10 * 1024 * 1024) {
                    showError('File size must be less than 10MB');
                    e.target.value = '';
                    return;
                  }
                  setTaskFile(file);
                }
              }}
              accept=".pdf,.doc,.docx,.txt,.zip,.rar,.jpg,.jpeg,.png"
            />
            {taskFile && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected: {taskFile.name} ({(taskFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="task_user_id">Assign to Specific Student (Optional)</Label>
            <select
              id="task_user_id"
              value={taskFormData.user_id}
              onChange={(e) => setTaskFormData({ ...taskFormData, user_id: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All students in batch</option>
              {students.length > 0 ? (
                students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email}
                  </option>
                ))
              ) : (
                <option value="" disabled>Loading students...</option>
              )}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to assign to all students in the batch
            </p>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              {editingTask ? 'Update Task' : 'Create Task'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateTaskDrawer(false);
                setTaskFormData({
                  title: '',
                  description: '',
                  due_date: '',
                  user_id: '',
                  marks: '',
                });
                setTaskFile(null);
                if (taskFileInputRef.current) {
                  taskFileInputRef.current.value = '';
                }
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Edit Task Drawer */}
      <Drawer
        isOpen={showEditTaskDrawer}
        onClose={() => {
          setShowEditTaskDrawer(false);
          setTaskFormData({
            title: '',
            description: '',
            due_date: '',
            user_id: '',
            marks: '',
          });
          setTaskFile(null);
          setEditingTask(null);
          if (taskFileInputRef.current) {
            taskFileInputRef.current.value = '';
          }
        }}
        title="Edit Task"
      >
        <form onSubmit={handleTaskSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit_task_title">Task Title *</Label>
            <Input
              id="edit_task_title"
              value={taskFormData.title}
              onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
              placeholder="Enter task title"
              required
            />
          </div>
          <div>
            <Label htmlFor="edit_task_description">Description</Label>
            <textarea
              id="edit_task_description"
              value={taskFormData.description}
              onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Enter task description"
            />
          </div>
          <div>
            <Label htmlFor="edit_task_due_date">Due Date *</Label>
            <Input
              id="edit_task_due_date"
              type="date"
              value={taskFormData.due_date}
              onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="edit_task_marks">Marks (Optional)</Label>
            <Input
              id="edit_task_marks"
              type="number"
              min="0"
              step="0.01"
              value={taskFormData.marks}
              onChange={(e) => setTaskFormData({ ...taskFormData, marks: e.target.value })}
              placeholder="Enter total marks for this task"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Total marks for this task (e.g., 100)
            </p>
          </div>
          <div>
            <Label htmlFor="edit_task_file">Task File (Optional)</Label>
            <Input
              id="edit_task_file"
              type="file"
              ref={taskFileInputRef}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  // Check file size (10MB max)
                  if (file.size > 10 * 1024 * 1024) {
                    showError('File size must be less than 10MB');
                    e.target.value = '';
                    return;
                  }
                  setTaskFile(file);
                }
              }}
              accept=".pdf,.doc,.docx,.txt,.zip,.rar,.jpg,.jpeg,.png"
            />
            {editingTask && (editingTask.file_path || editingTask.file_url) && !taskFile && (
              <p className="text-sm text-muted-foreground mt-1">
                Current file: <button
                  type="button"
                  onClick={() => {
                    // Use file_url from backend if available, otherwise construct it
                    let fileUrl = editingTask.file_url;
                    if (!fileUrl && editingTask.file_path) {
                      // Construct URL using API base URL
                      const cleanPath = editingTask.file_path.startsWith('/') 
                        ? editingTask.file_path.slice(1) 
                        : editingTask.file_path;
                      fileUrl = `${APP_BASE_URL}/load-storage/${cleanPath}`;
                    }
                    if (fileUrl) {
                      // Normalize URL to fix localhost:8000 issues
                      const normalizedUrl = normalizeUrl(fileUrl);
                      window.open(normalizedUrl, '_blank');
                    }
                  }}
                  className="text-primary hover:underline"
                >
                  View current file
                </button>
              </p>
            )}
            {taskFile && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected: {taskFile.name} ({(taskFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
          {/* Task Attachment Files from files table */}
          {editingTask && editingTask.attachment_files && editingTask.attachment_files.length > 0 && (
            <div>
              <Label>Task Attachments</Label>
              <div className="space-y-2 mt-2">
                {editingTask.attachment_files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm text-muted-foreground">
                      {file.name || file.file_path?.split('/').pop() || `Attachment ${idx + 1}`}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => {
                        if (file.file_url) {
                          window.open(file.file_url, '_blank');
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="edit_task_user_id">Assign to Specific Student (Optional)</Label>
            <select
              id="edit_task_user_id"
              value={taskFormData.user_id}
              onChange={(e) => setTaskFormData({ ...taskFormData, user_id: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All students in batch</option>
              {students.length > 0 ? (
                students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email}
                  </option>
                ))
              ) : (
                <option value="" disabled>Loading students...</option>
              )}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to assign to all students in the batch
            </p>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              Update Task
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditTaskDrawer(false);
                setTaskFormData({
                  title: '',
                  description: '',
                  due_date: '',
                  user_id: '',
                  marks: '',
                });
                setTaskFile(null);
                setEditingTask(null);
                if (taskFileInputRef.current) {
                  taskFileInputRef.current.value = '';
                }
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Submissions Dialog */}
      <Dialog
        isOpen={showSubmissionsDialog}
        onClose={() => {
          setShowSubmissionsDialog(false);
          setSelectedTask(null);
          setSubmissions([]);
        }}
        title={`Submissions - ${selectedTask?.title || ''}`}
        size="xl"
      >
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No submissions yet</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="p-4 border border-border rounded-lg hover:bg-accent/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">
                        {submission.user_name || submission.user?.name || `${submission.user?.first_name || ''} ${submission.user?.last_name || ''}`.trim() || submission.user?.email || 'Unknown Student'}
                      </h4>
                      {submission.user_email || submission.user?.email ? (
                        <p className="text-xs text-muted-foreground">
                          {submission.user_email || submission.user?.email}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        Submitted: {formatDate(submission.submitted_at || submission.created_at)}
                      </p>
                      {(submission.answer_file || submission.file_path) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          File: {(submission.answer_file || submission.file_path)?.split('/').pop() || (submission.answer_file || submission.file_path)}
                        </p>
                      )}
                    </div>
                    {submission.graded_at ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                        <CheckCircle2 className="h-3 w-3" />
                        Graded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500">
                        <Clock className="h-3 w-3" />
                        Pending
                      </span>
                    )}
                  </div>
                  {submission.remarks && (
                    <p className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">Student Remarks:</span> {submission.remarks}
                    </p>
                  )}
                  {submission.teacher_remarks && (
                    <div className="p-2 bg-accent rounded mb-2">
                      <p className="text-sm">
                        <span className="font-medium">Teacher Remarks:</span> {submission.teacher_remarks}
                      </p>
                    </div>
                  )}
                  {submission.marks !== null && submission.marks !== undefined && (
                    <p className="text-sm font-semibold mb-2">
                      Marks: {submission.marks}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    {(submission.answer_file || submission.file_path) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Use file_url from backend if available, otherwise construct it
                          let fileUrl = submission.file_url;
                          const filePath = submission.answer_file || submission.file_path;
                          if (!fileUrl && filePath) {
                            // Construct URL using API base URL
                            const cleanPath = filePath.startsWith('/') 
                              ? filePath.slice(1) 
                              : filePath;
                            fileUrl = `${APP_BASE_URL}/load-storage/${cleanPath}`;
                          }
                          if (fileUrl) {
                            window.open(fileUrl, '_blank');
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download File
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleGradeSubmission(submission)}
                    >
                      <Award className="h-4 w-4 mr-2" />
                      {submission.graded_at ? 'Update Grade' : 'Grade'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog>

      {/* Grade Submission Dialog */}
      <Dialog
        isOpen={showGradeDialog}
        onClose={() => {
          setShowGradeDialog(false);
          setSelectedSubmission(null);
          setGradeFormData({
            obtained_marks: '',
            instructor_comments: '',
          });
        }}
        title="Grade Submission"
        size="lg"
      >
        {selectedSubmission && (
          <form onSubmit={handleGradeSubmit} className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Grading submission for: <span className="font-medium text-foreground">
                  {selectedSubmission.user?.name || `${selectedSubmission.user?.first_name || ''} ${selectedSubmission.user?.last_name || ''}`.trim() || selectedSubmission.user?.email}
                </span>
              </p>
            </div>
            <div>
              <Label htmlFor="obtained_marks">Marks</Label>
              <Input
                id="obtained_marks"
                type="number"
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
                value={gradeFormData.instructor_comments}
                onChange={(e) => setGradeFormData({ ...gradeFormData, instructor_comments: e.target.value })}
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Enter instructor comments..."
                maxLength={1000}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                <Award className="h-4 w-4 mr-2" />
                Save Grade
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowGradeDialog(false);
                  setSelectedSubmission(null);
                  setGradeFormData({
                    obtained_marks: '',
                    instructor_comments: '',
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Upload Student Submission Drawer */}
      <Drawer
        isOpen={showUploadSubmissionDrawer}
        onClose={() => {
          setShowUploadSubmissionDrawer(false);
          setSelectedTask(null);
          setStudentFiles({});
          setUploadingForStudent(null);
        }}
        title={selectedTask ? `Upload Submission - ${selectedTask.title}` : 'Upload Student Submission'}
        size="lg"
      >
        {selectedTask && (
          <div className="space-y-4">
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Upload task files on behalf of students. This is useful when the expiry date has passed and students request admin assistance.
              </p>
            </div>

            {loadingStudents ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No students found in this batch</p>
              </div>
            ) : (
              <div className="space-y-3">
                {students
                  .filter(student => {
                    // Filter by search term if provided
                    if (studentSearch) {
                      const searchLower = studentSearch.toLowerCase();
                      return (
                        student.name?.toLowerCase().includes(searchLower) ||
                        student.email?.toLowerCase().includes(searchLower) ||
                        student.first_name?.toLowerCase().includes(searchLower) ||
                        student.last_name?.toLowerCase().includes(searchLower)
                      );
                    }
                    // Filter by block status
                    if (studentBlockFilter !== null && studentBlockFilter !== undefined) {
                      return Number(student.block) === studentBlockFilter;
                    }
                    return true;
                  })
                  .map((student) => (
                    <div
                      key={student.id}
                      className="p-4 border border-border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {student.picture_url && (
                            <img
                              src={normalizeStorageUrl(student.picture_url)}
                              alt={student.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium text-foreground">
                              {student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email}
                            </p>
                            <p className="text-xs text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="*/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleStudentFileChange(student.id, file);
                            }
                          }}
                          className="flex-1"
                          disabled={uploadingForStudent === student.id}
                        />
                        <Button
                          onClick={() => handleUploadSubmissionForStudent(student.id)}
                          disabled={!studentFiles[student.id] || uploadingForStudent === student.id}
                          size="sm"
                        >
                          {uploadingForStudent === student.id ? (
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
                      {studentFiles[student.id] && (
                        <p className="text-xs text-muted-foreground">
                          Selected: {studentFiles[student.id].name}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Create Quiz Drawer */}
      <Drawer
        isOpen={showCreateQuizDrawer}
        onClose={() => {
          setShowCreateQuizDrawer(false);
          setQuizFormData({
            title: '',
            quiz_date: new Date().toISOString().split('T')[0],
            description: '',
            total_marks: '',
          });
        }}
        title="Add Quiz"
      >
        <form onSubmit={handleQuizSubmit} className="space-y-4">
          <div>
            <Label htmlFor="quiz_title">Quiz Title *</Label>
            <Input
              id="quiz_title"
              value={quizFormData.title}
              onChange={(e) => setQuizFormData({ ...quizFormData, title: e.target.value })}
              placeholder="Enter quiz title"
              required
            />
          </div>
          <div>
            <Label htmlFor="quiz_date">Quiz Date *</Label>
            <Input
              id="quiz_date"
              type="date"
              value={quizFormData.quiz_date}
              onChange={(e) => setQuizFormData({ ...quizFormData, quiz_date: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              You can set past, current, or future dates
            </p>
          </div>
          <div>
            <Label htmlFor="quiz_description">Description</Label>
            <textarea
              id="quiz_description"
              value={quizFormData.description}
              onChange={(e) => setQuizFormData({ ...quizFormData, description: e.target.value })}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Enter quiz description (optional)"
            />
          </div>
          <div>
            <Label htmlFor="quiz_total_marks">Total Marks (Optional)</Label>
            <Input
              id="quiz_total_marks"
              type="number"
              step="0.01"
              min="0"
              value={quizFormData.total_marks}
              onChange={(e) => setQuizFormData({ ...quizFormData, total_marks: e.target.value })}
              placeholder="Enter total marks"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              Create Quiz
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateQuizDrawer(false);
                setQuizFormData({
                  title: '',
                  quiz_date: new Date().toISOString().split('T')[0],
                  description: '',
                  total_marks: '',
                });
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Assign Marks Drawer */}
      <Drawer
        isOpen={showAssignMarksDrawer}
        onClose={() => {
          setShowAssignMarksDrawer(false);
          setSelectedQuiz(null);
          setQuizStudents([]);
          setQuizMarks({});
        }}
        title={`Assign Marks - ${selectedQuiz?.title || 'Quiz'}`}
        size="80%"
      >
        <form onSubmit={handleMarksSubmit} className="space-y-4">
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {quizStudents.map((student) => (
              <div
                key={student.id}
                className="p-4 border border-border rounded-lg space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <h4 className="font-medium">{student.full_name || student.name || student.email}</h4>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                  </div>
                  {student.has_mark && (
                    <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">
                      Marked
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`obtained_marks_${student.id}`}>
                      Obtained Marks *
                    </Label>
                    <Input
                      id={`obtained_marks_${student.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={quizMarks[student.id]?.obtained_marks || ''}
                      onChange={(e) => {
                        setQuizMarks({
                          ...quizMarks,
                          [student.id]: {
                            ...quizMarks[student.id],
                            obtained_marks: e.target.value,
                          },
                        });
                      }}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`total_marks_${student.id}`}>
                      Total Marks
                    </Label>
                    <Input
                      id={`total_marks_${student.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={quizMarks[student.id]?.total_marks || selectedQuiz?.total_marks || ''}
                      onChange={(e) => {
                        setQuizMarks({
                          ...quizMarks,
                          [student.id]: {
                            ...quizMarks[student.id],
                            total_marks: e.target.value,
                          },
                        });
                      }}
                      placeholder={selectedQuiz?.total_marks ? `Default: ${selectedQuiz.total_marks}` : 'Enter total marks'}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor={`remarks_${student.id}`}>Remarks (Optional)</Label>
                  <textarea
                    id={`remarks_${student.id}`}
                    value={quizMarks[student.id]?.remarks || ''}
                    onChange={(e) => {
                      setQuizMarks({
                        ...quizMarks,
                        [student.id]: {
                          ...quizMarks[student.id],
                          remarks: e.target.value,
                        },
                      });
                    }}
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Enter remarks (optional)"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-4 border-t">
            <Button type="submit" className="flex-1">
              Save Marks
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAssignMarksDrawer(false);
                setSelectedQuiz(null);
                setQuizStudents([]);
                setQuizMarks({});
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default BatchExplore;

