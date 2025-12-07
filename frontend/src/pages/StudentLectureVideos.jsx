import { useEffect, useState } from 'react';
import { useAppSelector } from '../hooks/redux';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Dialog } from '../components/ui/dialog';
import { Tooltip } from '../components/ui/tooltip';
import { Video, Eye, Download, ExternalLink, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS, getStorageUrl, API_BASE_URL } from '../config/api';
import { useToast } from '../components/ui/toast';
import { storage } from '../utils/storage';

const StudentLectureVideos = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { error: showError } = useToast();
  const [videos, setVideos] = useState([]);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

  useEffect(() => {
    loadVideos();
  }, [selectedBatch, selectedSubject]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedBatch) params.batch_id = selectedBatch;
      if (selectedSubject) params.subject_id = selectedSubject;

      const response = await apiService.get(API_ENDPOINTS.student.videos.list, { params });
      setVideos(response.data.data.videos || []);
      setBatches(response.data.data.batches || []);
      setSubjects(response.data.data.subjects || []);
    } catch (err) {
      showError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleViewVideo = (video) => {
    setSelectedVideo(video);
    if (video.source_type === 'internal') {
      setShowVideoModal(true);
    } else {
      // Open external video in new tab
      window.open(video.external_url, '_blank');
    }
  };

  const handleDownload = async () => {
    if (!selectedVideo || selectedVideo.source_type !== 'internal') {
      showError('Only internal videos can be downloaded');
      return;
    }

    try {
      // Get download URL from API endpoint
      const downloadEndpoint = API_ENDPOINTS.student.videos.download.replace(':id', selectedVideo.id);
      const downloadUrl = `${API_BASE_URL}${downloadEndpoint}`;
      
      // Get auth token
      const token = storage.getToken();
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = selectedVideo.title || 'video';
      
      // Add auth token to headers via fetch, then create blob URL
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/octet-stream',
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get blob from response
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create temporary link and trigger download
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download error:', err);
      showError('Failed to download video. Please try again.');
    }
  };

  const getVideoUrl = (video) => {
    if (video.source_type === 'internal') {
      const videoPath = video.path || video.internal_path;
      if (videoPath) {
        return getStorageUrl(videoPath);
      }
    }
    return video.external_url;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Lecture Videos</h1>
        <p className="text-muted-foreground mt-2">
          Access your assigned lecture videos
        </p>
      </div>

      {/* Filters */}
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

      {/* Videos Table */}
      <Card>
        <CardHeader>
          <CardTitle>Videos ({videos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No videos assigned yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">#</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Title</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Batch</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Subject</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((video, index) => (
                    <tr key={video.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                      <td className="p-4 text-sm text-muted-foreground">{index + 1}</td>
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{video.title}</p>
                          {video.short_description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {video.short_description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {video.batch_title || 'N/A'}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {video.subject_title || 'N/A'}
                      </td>
                      <td className="p-4">
                        {video.source_type === 'internal' ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded">
                            <Video className="h-3 w-3" />
                            Internal
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-orange-500/10 text-orange-500 px-2 py-1 rounded">
                            <ExternalLink className="h-3 w-3" />
                            External
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <Tooltip content="View Video">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewVideo(video)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Preview Modal */}
      <Dialog
        isOpen={showVideoModal}
        onClose={() => {
          setShowVideoModal(false);
          setSelectedVideo(null);
        }}
        title={selectedVideo?.title || 'Video Preview'}
        size="4xl"
      >
        {selectedVideo && selectedVideo.source_type === 'internal' && (
          <div className="space-y-4">
            {selectedVideo.short_description && (
              <p className="text-sm text-muted-foreground">
                {selectedVideo.short_description}
              </p>
            )}
            <div className="rounded-lg border border-input overflow-hidden bg-muted">
              <video
                src={getVideoUrl(selectedVideo)}
                controls
                className="w-full"
                style={{ maxHeight: '70vh' }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowVideoModal(false);
                  setSelectedVideo(null);
                }}
              >
                Close
              </Button>
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default StudentLectureVideos;

