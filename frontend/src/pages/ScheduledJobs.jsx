import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog } from '../components/ui/dialog';
import { Tooltip } from '../components/ui/tooltip';
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Clock,
  Play,
  Pause,
  Calendar,
  Settings,
} from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS, buildEndpoint } from '../config/api';

const ScheduledJobs = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { success, error: showError } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    job_class: '',
    schedule_type: 'daily',
    schedule_config: null,
    enabled: true,
    metadata: null,
  });

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(API_ENDPOINTS.scheduledJobs.list);
      setJobs(response.data.data || []);
    } catch (err) {
      showError('Failed to load scheduled jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingJob(null);
    setFormData({
      name: '',
      description: '',
      job_class: '',
      schedule_type: 'daily',
      schedule_config: null,
      enabled: true,
      metadata: null,
    });
    setShowDialog(true);
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      name: job.name || '',
      description: job.description || '',
      job_class: job.job_class || '',
      schedule_type: job.schedule_type || 'daily',
      schedule_config: job.schedule_config || null,
      enabled: job.enabled ?? true,
      metadata: job.metadata || null,
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingJob) {
        const endpoint = buildEndpoint(API_ENDPOINTS.scheduledJobs.update, { id: editingJob.id });
        await apiService.put(endpoint, formData);
        success('Scheduled job updated successfully');
      } else {
        await apiService.post(API_ENDPOINTS.scheduledJobs.create, formData);
        success('Scheduled job created successfully');
      }
      setShowDialog(false);
      loadJobs();
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Operation failed';
      showError(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this scheduled job?')) {
      return;
    }
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.scheduledJobs.delete, { id });
      await apiService.delete(endpoint);
      success('Scheduled job deleted successfully');
      loadJobs();
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to delete';
      showError(errorMessage);
    }
  };

  const handleToggle = async (job) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.scheduledJobs.update, { id: job.id });
      await apiService.put(endpoint, { enabled: !job.enabled });
      success(`Job ${!job.enabled ? 'enabled' : 'disabled'} successfully`);
      loadJobs();
    } catch (err) {
      showError('Failed to toggle job status');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getScheduleTypeLabel = (type) => {
    const labels = {
      hourly: 'Every Hour',
      daily: 'Daily',
      twice_daily: 'Twice Daily (9 AM & 6 PM)',
      weekly: 'Weekly',
      monthly: 'Monthly',
      custom: 'Custom',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Scheduled Jobs</h1>
          <p className="text-muted-foreground mt-2">
            Manage automated scheduled tasks and notifications
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Scheduled Job
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Jobs ({jobs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No scheduled jobs found</p>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${job.enabled ? 'bg-green-500/10' : 'bg-gray-500/10'}`}>
                          <Settings className={`h-5 w-5 ${job.enabled ? 'text-green-500' : 'text-gray-500'}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{job.name}</h3>
                          <p className="text-sm text-muted-foreground">{job.description || 'No description'}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {getScheduleTypeLabel(job.schedule_type)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last: {formatDate(job.last_run_at)}
                            </span>
                            {job.next_run_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Next: {formatDate(job.next_run_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tooltip content={job.enabled ? 'Disable' : 'Enable'}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggle(job)}
                        >
                          {job.enabled ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </Tooltip>
                      <Tooltip content="Edit">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(job)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Delete">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(job.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        title={editingJob ? 'Edit Scheduled Job' : 'Create Scheduled Job'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Job Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Task Reminder 24h"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Describe what this job does..."
            />
          </div>

          <div>
            <Label htmlFor="job_class">Job Class *</Label>
            <Input
              id="job_class"
              value={formData.job_class}
              onChange={(e) => setFormData({ ...formData, job_class: e.target.value })}
              required
              placeholder="e.g., TaskReminderJob"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The class name that handles this job execution
            </p>
          </div>

          <div>
            <Label htmlFor="schedule_type">Schedule Type *</Label>
            <select
              id="schedule_type"
              value={formData.schedule_type}
              onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="hourly">Every Hour</option>
              <option value="daily">Daily</option>
              <option value="twice_daily">Twice Daily (9 AM & 6 PM)</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="enabled" className="cursor-pointer">
              Enabled
            </Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              {editingJob ? 'Update Job' : 'Create Job'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default ScheduledJobs;

