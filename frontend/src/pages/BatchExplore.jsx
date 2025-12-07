import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../hooks/redux';
import { fetchBatch } from '../store/slices/batchesSlice';
import { useAppSelector } from '../hooks/redux';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, ChevronRight, ChevronDown, Video, ArrowLeft, GripVertical } from 'lucide-react';
import { cn } from '../utils/cn';

const BatchExplore = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentBatch } = useAppSelector((state) => state.batches);
  const { success, error: showError } = useToast();
  
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [draggedVideo, setDraggedVideo] = useState(null);

  useEffect(() => {
    if (id) {
      loadBatch();
      loadSubjects();
    }
  }, [id]);

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
    loadVideos(subject.id);
  };

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
                          selectedSubject?.id === subject.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent/50 text-muted-foreground"
                        )}
                      >
                        <Video className="h-4 w-4" />
                        Videos
                      </button>
                    </div>
                  )}
                </div>
              ))}
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

          {/* Videos Content */}
          {selectedSubject ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  Videos - {selectedSubject.title}
                </CardTitle>
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
                    Select a subject from the sidebar and click "Videos" to view and manage videos
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchExplore;

