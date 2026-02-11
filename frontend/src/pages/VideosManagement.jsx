import { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  fetchVideos,
  createVideo,
  updateVideo,
  deleteVideo,
  setFilters,
} from '../store/slices/videosSlice';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Drawer } from '../components/ui/drawer';
import { Dialog } from '../components/ui/dialog';
import { Tooltip } from '../components/ui/tooltip';
import { DateRangePicker } from '../components/ui/date-range-picker';
import { getStorageUrl } from '../config/api';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Video as VideoIcon,
  Link2,
  GripVertical,
  X,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { debounce } from '../utils/debounce';
import { apiService } from '../services/api';
import { API_ENDPOINTS, buildEndpoint } from '../config/api';

const VideosManagement = () => {
  const dispatch = useAppDispatch();
  const { videos, pagination, loading, filters } = useAppSelector((state) => state.videos);
  const { success, error: showError } = useToast();

  const [showDrawer, setShowDrawer] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showAssignDrawer, setShowAssignDrawer] = useState(false);
  const [assigningVideo, setAssigningVideo] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [batchSubjectVideos, setBatchSubjectVideos] = useState([]);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    short_description: '',
    source_type: 'internal',
    video_file: null,
    external_url: '',
  });
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [videoPreview, setVideoPreview] = useState(null);
  const [showBackfillDialog, setShowBackfillDialog] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);

  const debouncedSearch = useCallback(
    debounce((value) => {
      dispatch(setFilters({ search: value }));
    }, 500),
    [dispatch]
  );

  useEffect(() => {
    dispatch(fetchVideos(filters));
  }, [dispatch, filters]);

  // Cleanup video preview URL on unmount
  useEffect(() => {
    return () => {
      if (videoPreview && videoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    debouncedSearch(value);
  };

  const handleFilter = (key, value) => {
    dispatch(setFilters({ [key]: value }));
  };

  const handleDateRangeChange = (range) => {
    if (range === null) {
      // All Time selected
      dispatch(setFilters({ date_from: null, date_to: null }));
    } else {
      dispatch(setFilters({
        date_from: range?.start || null,
        date_to: range?.end || null,
      }));
    }
  };

  const handleCreate = () => {
    setEditingVideo(null);
    setFormData({
      title: '',
      short_description: '',
      source_type: 'internal',
      video_file: null,
      external_url: '',
    });
    setVideoPreview(null);
    setShowDrawer(true);
  };

  const handleEdit = (video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title || '',
      short_description: video.short_description || '',
      source_type: video.source_type || 'internal',
      video_file: null, // Don't pre-fill file
      external_url: video.external_url || '',
    });
    // Set preview for internal videos - use video_url (direct download) if available, otherwise fallback to path
    if (video.source_type === 'internal') {
      // If video has a direct download URL (from video_url accessor), use it
      if (video.video_url) {
        setVideoPreview(video.video_url);
      } else {
        // Fallback to generating URL from path
        const videoPath = video.path || video.internal_path;
        if (videoPath) {
          setVideoPreview(getStorageUrl(videoPath));
        } else {
          setVideoPreview(null);
        }
      }
    } else {
      setVideoPreview(null);
    }
    setShowDrawer(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const submitData = {
      title: formData.title,
      short_description: formData.short_description,
      source_type: formData.source_type,
    };

    if (formData.source_type === 'internal') {
      if (!formData.video_file && !editingVideo) {
        showError('Please select a video file');
        return;
      }
      if (formData.video_file) {
        submitData.video_file = formData.video_file;
      }
    } else {
      if (!formData.external_url && !editingVideo) {
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
      if (editingVideo) {
        await dispatch(updateVideo({ id: editingVideo.id, videoData: submitData })).unwrap();
        success('Video updated successfully');
      } else {
        await dispatch(createVideo(submitData)).unwrap();
        success('Video created successfully');
      }
      
      setIsUploading(false);
      setUploadProgress(0);
      setShowDrawer(false);
      setEditingVideo(null);
      setFormData({
        title: '',
        short_description: '',
        source_type: 'internal',
        video_file: null,
        external_url: '',
      });
      setVideoPreview(null);
      dispatch(fetchVideos(filters));
    } catch (err) {
      setIsUploading(false);
      setUploadProgress(0);
      const errorMessage = typeof err === 'string' ? err : err?.title?.[0] || 'Operation failed';
      showError(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      try {
        await dispatch(deleteVideo(id)).unwrap();
        success('Video deleted successfully');
        dispatch(fetchVideos(filters));
      } catch (err) {
        const errorMessage = typeof err === 'string' ? err : 'Failed to delete video';
        showError(errorMessage);
      }
    }
  };

  const handlePageChange = (page) => {
    dispatch(setFilters({ page }));
    dispatch(fetchVideos({ ...filters, page }));
  };

  const handleAssignVideo = async (video) => {
    setAssigningVideo(video);
    setShowAssignDrawer(true);
    setSelectedBatch(null);
    setSelectedSubject(null);
    setBatchSubjectVideos([]);
    await loadBatches();
  };

  const loadBatches = async () => {
    setLoadingBatches(true);
    try {
      const response = await apiService.get(API_ENDPOINTS.batches.list);
      setBatches(response.data.data.data || []);
    } catch (err) {
      showError('Failed to load batches');
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleBatchChange = async (batchId) => {
    const batch = batches.find(b => b.id === Number(batchId));
    setSelectedBatch(batch);
    setSelectedSubject(null);
    setBatchSubjectVideos([]);
    
    if (batch) {
      await loadSubjects(batch.id);
    }
  };

  const loadSubjects = async (batchId) => {
    setLoadingSubjects(true);
    try {
      const response = await apiService.get(
        buildEndpoint(API_ENDPOINTS.batches.availableSubjects, { id: batchId })
      );
      setSubjects(response.data.data.subjects || []);
    } catch (err) {
      showError('Failed to load subjects');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleSubjectChange = async (subjectId) => {
    const subject = subjects.find(s => s.id === Number(subjectId));
    setSelectedSubject(subject);
    
    if (selectedBatch && subject) {
      await loadBatchSubjectVideos(selectedBatch.id, subject.id);
    }
  };

  const loadBatchSubjectVideos = async (batchId, subjectId) => {
    setLoadingVideos(true);
    try {
      const response = await apiService.get(
        buildEndpoint(API_ENDPOINTS.videos.getBatchSubjectVideos, { batchId, subjectId })
      );
      setBatchSubjectVideos(response.data.data || []);
    } catch (err) {
      showError('Failed to load videos');
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleAssignVideoToBatchSubject = async () => {
    if (!selectedBatch || !selectedSubject || !assigningVideo) {
      showError('Please select both batch and subject');
      return;
    }

    try {
      const response = await apiService.post(
        buildEndpoint(API_ENDPOINTS.videos.assignToBatchSubject, { id: assigningVideo.id }),
        {
          batch_id: selectedBatch.id,
          subject_id: selectedSubject.id,
        }
      );
      setBatchSubjectVideos(response.data.data || []);
      success('Video assigned successfully');
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : err?.response?.data?.error || 'Failed to assign video';
      showError(errorMessage);
    }
  };

  const handleRemoveVideo = async (videoId) => {
    if (!selectedBatch || !selectedSubject) return;

    try {
      const endpoint = `${buildEndpoint(API_ENDPOINTS.videos.removeFromBatchSubject, { id: videoId })}?batch_id=${selectedBatch.id}&subject_id=${selectedSubject.id}`;
      await apiService.delete(endpoint);
      await loadBatchSubjectVideos(selectedBatch.id, selectedSubject.id);
      success('Video removed successfully');
    } catch (err) {
      showError('Failed to remove video');
    }
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newVideos = [...batchSubjectVideos];
    const draggedItem = newVideos[draggedIndex];
    newVideos.splice(draggedIndex, 1);
    newVideos.splice(index, 0, draggedItem);
    setBatchSubjectVideos(newVideos);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null || !selectedBatch || !selectedSubject) {
      setDraggedIndex(null);
      return;
    }

    try {
      const videoIds = batchSubjectVideos.map(v => v.id);
      await apiService.post(
        buildEndpoint(API_ENDPOINTS.videos.reorderBatchSubjectVideos, {
          batchId: selectedBatch.id,
          subjectId: selectedSubject.id,
        }),
        { video_ids: videoIds }
      );
      success('Videos reordered successfully');
    } catch (err) {
      showError('Failed to reorder videos');
      // Reload videos to restore original order
      await loadBatchSubjectVideos(selectedBatch.id, selectedSubject.id);
    } finally {
      setDraggedIndex(null);
    }
  };

  const getVideoUrl = (video) => {
    if (video.source_type === 'internal') {
      // If video has a direct download URL (from video_url accessor), use it
      if (video.video_url) {
        return video.video_url;
      }
      // Fallback to generating URL from path
      const videoPath = video.path || video.internal_path;
      if (videoPath) {
        return getStorageUrl(videoPath);
      }
    }
    return video.external_url;
  };

  const handleBackfillGoogleDriveIds = async () => {
    if (!window.confirm('This will update Google Drive file IDs for all videos that are missing them. Continue?')) {
      return;
    }

    setBackfilling(true);
    setBackfillResult(null);

    try {
      const response = await apiService.post(API_ENDPOINTS.videos.backfillGoogleDriveIds, {
        dry_run: false,
      });

      if (response.data.success) {
        setBackfillResult(response.data.data);
        setShowBackfillDialog(true);
        success('Google Drive file IDs backfilled successfully');
        // Refresh videos list
        dispatch(fetchVideos(filters));
      } else {
        showError(response.data.message || 'Backfill failed');
      }
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to run backfill';
      showError(errorMessage);
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Videos Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage videos - upload internal videos or add external links
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleBackfillGoogleDriveIds}
            disabled={backfilling}
          >
            {backfilling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Backfill Google Drive File IDs
              </>
            )}
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Video
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                value={searchValue}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
            <select
              value={filters.source_type || ''}
              onChange={(e) => {
                const value = e.target.value === '' ? null : e.target.value;
                handleFilter('source_type', value);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              <option value="internal">Internal Server</option>
              <option value="external">External Link</option>
            </select>
            <DateRangePicker
              value={
                filters.date_from || filters.date_to
                  ? {
                      start: filters.date_from || null,
                      end: filters.date_to || null,
                    }
                  : null
              }
              onChange={handleDateRangeChange}
            />
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

      {/* Videos Table */}
      <Card>
        <CardHeader>
          <CardTitle>Videos ({pagination.total})</CardTitle>
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
                      <th className="text-left p-4">Type</th>
                      <th className="text-left p-4">Description</th>
                      <th className="text-left p-4">Created At</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center p-8 text-muted-foreground">
                          No videos found
                        </td>
                      </tr>
                    ) : (
                      videos.map((video) => (
                        <tr key={video.id} className="border-b hover:bg-muted/50">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <VideoIcon className="h-4 w-4 text-muted-foreground" />
                              {video.title}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              video.source_type === 'internal'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {video.source_type === 'internal' ? 'Internal' : 'External'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-muted-foreground">
                              {video.short_description || 'No description'}
                            </span>
                          </td>
                          <td className="p-4">
                            {new Date(video.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Tooltip content="Assign to Batch & Subject">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleAssignVideo(video)}
                                >
                                  <Link2 className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                              <Tooltip content="Edit Video">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(video)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                              <Tooltip content="Delete Video">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(video.id)}
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
        onClose={() => {
          if (!isUploading) {
            setShowDrawer(false);
            // Clean up video preview URL if it's an object URL
            if (videoPreview && videoPreview.startsWith('blob:')) {
              URL.revokeObjectURL(videoPreview);
            }
            setVideoPreview(null);
            setIsUploading(false);
            setUploadProgress(0);
          }
        }}
        title={editingVideo ? 'Edit Video' : 'Create New Video'}
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
                    // Restore preview if editing internal video - use path column first
                    if (editingVideo && editingVideo.source_type === 'internal') {
                      const videoPath = editingVideo.path || editingVideo.internal_path;
                      if (videoPath) {
                        setVideoPreview(getStorageUrl(videoPath));
                      } else {
                        setVideoPreview(null);
                      }
                    } else {
                      setVideoPreview(null);
                    }
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
                      // If no new file, show existing video if editing
                      if (editingVideo && (editingVideo.path || editingVideo.internal_path)) {
                        const videoPath = editingVideo.path || editingVideo.internal_path;
                        setVideoPreview(getStorageUrl(videoPath));
                      } else {
                        setVideoPreview(null);
                      }
                    }
                  }}
                  required={!editingVideo}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: MP4, AVI, MOV, WMV, FLV, WEBM (Max 100MB)
                </p>
                {editingVideo && (editingVideo.path || editingVideo.internal_path) && !formData.video_file && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current: {editingVideo.path || editingVideo.internal_path}
                  </p>
                )}
              </div>
              
              {/* Video Preview */}
              {videoPreview && (
                <div>
                  <Label>Video Preview</Label>
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (videoPreview.startsWith('blob:')) {
                          // For blob URLs (newly uploaded files), create a temporary page
                          const newWindow = window.open('', '_blank');
                          if (newWindow) {
                            newWindow.document.write(`
                              <!DOCTYPE html>
                              <html>
                                <head>
                                  <title>Video Preview</title>
                                  <style>
                                    body {
                                      margin: 0;
                                      padding: 20px;
                                      display: flex;
                                      justify-content: center;
                                      align-items: center;
                                      min-height: 100vh;
                                      background: #000;
                                    }
                                    video {
                                      max-width: 100%;
                                      max-height: 90vh;
                                    }
                                  </style>
                                </head>
                                <body>
                                  <video src="${videoPreview}" controls autoplay></video>
                                </body>
                              </html>
                            `);
                            newWindow.document.close();
                          }
                        } else {
                          // For storage URLs (existing videos), open directly
                          window.open(videoPreview, '_blank');
                        }
                      }}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Video in New Tab
                    </Button>
                    {videoPreview.startsWith('blob:') && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Note: This is a preview of the newly selected file. After saving, you can open the uploaded video.
                      </p>
                    )}
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
                required={!editingVideo}
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
            <Button type="submit" className="flex-1" disabled={loading || isUploading}>
              {loading || isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploading ? `Uploading... ${uploadProgress}%` : 'Saving...'}
                </>
              ) : editingVideo ? (
                'Update Video'
              ) : (
                'Create Video'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDrawer(false);
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

      {/* Assign Video to Batch & Subject Drawer */}
      <Drawer
        isOpen={showAssignDrawer}
        onClose={() => {
          setShowAssignDrawer(false);
          setAssigningVideo(null);
          setSelectedBatch(null);
          setSelectedSubject(null);
          setBatchSubjectVideos([]);
        }}
        title="Assign Video to Batch & Subject"
      >
        <div className="space-y-6">
          {assigningVideo && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Video:</p>
              <p className="text-sm text-muted-foreground">{assigningVideo.title}</p>
            </div>
          )}

          {/* Batch Selection */}
          <div>
            <Label htmlFor="batch">Select Batch *</Label>
            <select
              id="batch"
              value={selectedBatch?.id || ''}
              onChange={(e) => handleBatchChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={loadingBatches}
            >
              <option value="">Select a batch...</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.title}
                </option>
              ))}
            </select>
            {loadingBatches && (
              <p className="text-xs text-muted-foreground mt-1">Loading batches...</p>
            )}
          </div>

          {/* Subject Selection - Only show if batch is selected */}
          {selectedBatch && (
            <div>
              <Label htmlFor="subject">Select Subject *</Label>
              <select
                id="subject"
                value={selectedSubject?.id || ''}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={loadingSubjects || !selectedBatch}
              >
                <option value="">Select a subject...</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.title}
                  </option>
                ))}
              </select>
              {loadingSubjects && (
                <p className="text-xs text-muted-foreground mt-1">Loading subjects...</p>
              )}
            </div>
          )}

          {/* Assign Button */}
          {selectedBatch && selectedSubject && (
            <Button
              onClick={handleAssignVideoToBatchSubject}
              className="w-full"
              disabled={!assigningVideo}
            >
              Assign Video
            </Button>
          )}

          {/* Videos List - Only show if batch and subject are selected */}
          {selectedBatch && selectedSubject && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Videos in {selectedBatch.title} - {selectedSubject.title}</Label>
                {loadingVideos && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {loadingVideos ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Loading videos...
                </p>
              ) : batchSubjectVideos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No videos assigned yet
                </p>
              ) : (
                <div className="space-y-2">
                  {batchSubjectVideos.map((video, index) => (
                    <div
                      key={video.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 p-3 border rounded-lg bg-card cursor-move ${
                        draggedIndex === index ? 'opacity-50' : ''
                      }`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{video.title}</p>
                        {video.short_description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {video.short_description}
                          </p>
                        )}
                      </div>
                      {video.id === assigningVideo?.id && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                          Current
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveVideo(video.id)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Drag and drop videos to reorder them
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Drawer>

      {/* Backfill Results Dialog */}
      <Dialog
        isOpen={showBackfillDialog}
        onClose={() => {
          setShowBackfillDialog(false);
          setBackfillResult(null);
        }}
        title="Backfill Results"
        size="lg"
      >
        {backfillResult && (
          <div className="space-y-4">

            {backfillResult.summary && (
              <div>
                <Label className="text-base font-semibold mb-3 block">Summary</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        Successfully Updated
                      </p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {backfillResult.summary.successfully_updated || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                        Not Found
                      </p>
                      <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                        {backfillResult.summary.not_found || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="text-sm font-medium text-red-900 dark:text-red-100">
                        Failed
                      </p>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                        {backfillResult.summary.failed || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Total Processed
                      </p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {backfillResult.summary.total_processed || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {backfillResult.output && (
              <div>
                <Label className="text-base font-semibold mb-2 block">Output</Label>
                <div className="bg-muted rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono">
                    {backfillResult.output}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBackfillDialog(false);
                  setBackfillResult(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default VideosManagement;

