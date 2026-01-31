import { useEffect, useState } from 'react';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog } from '../components/ui/dialog';
import { Loader2, FolderOpen, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS, buildEndpoint } from '../config/api';

const GoogleDriveFolders = () => {
  const { success, error: showError } = useToast();
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    directory_path: '',
    folder_id: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(API_ENDPOINTS.googleDriveFolders.list);
      setFolders(response.data.data || []);
    } catch (err) {
      showError('Failed to load Google Drive folders');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (folder = null) => {
    if (folder) {
      setEditingFolder(folder);
      setFormData({
        name: folder.name,
        display_name: folder.display_name,
        directory_path: folder.directory_path,
        folder_id: folder.folder_id || '',
        description: folder.description || '',
        is_active: folder.is_active ?? true,
      });
    } else {
      setEditingFolder(null);
      setFormData({
        name: '',
        display_name: '',
        directory_path: '',
        folder_id: '',
        description: '',
        is_active: true,
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingFolder(null);
    setFormData({
      name: '',
      display_name: '',
      directory_path: '',
      folder_id: '',
      description: '',
      is_active: true,
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFolder) {
        const endpoint = buildEndpoint(API_ENDPOINTS.googleDriveFolders.update, { id: editingFolder.id });
        await apiService.put(endpoint, formData);
        success('Google Drive folder updated successfully');
      } else {
        await apiService.post(API_ENDPOINTS.googleDriveFolders.create, formData);
        success('Google Drive folder created successfully');
      }
      handleCloseDialog();
      loadFolders();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save Google Drive folder');
    }
  };

  const handleDelete = async (folder) => {
    if (!window.confirm(`Are you sure you want to delete "${folder.display_name}"?`)) {
      return;
    }

    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.googleDriveFolders.delete, { id: folder.id });
      await apiService.delete(endpoint);
      success('Google Drive folder deleted successfully');
      loadFolders();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete Google Drive folder');
    }
  };

  const getFolderIdFromUrl = (url) => {
    // Extract folder ID from Google Drive URL
    // Format: https://drive.google.com/drive/folders/FOLDER_ID
    const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : '';
  };

  const handlePasteFolderId = (e) => {
    const pastedText = e.clipboardData.getData('text');
    const folderId = getFolderIdFromUrl(pastedText) || pastedText.trim();
    if (folderId) {
      setFormData((prev) => ({ ...prev, folder_id: folderId }));
      e.preventDefault();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Google Drive Folders</h1>
          <p className="text-muted-foreground mt-2">
            Manage Google Drive folder configurations for file storage
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Folder
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Configured Folders
          </CardTitle>
          <CardDescription>
            Configure Google Drive folder IDs for different file types
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : folders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No folders configured. Click "Add Folder" to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{folder.display_name}</h3>
                      {!folder.is_active && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                      {!folder.folder_id && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                          Folder ID Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium">Name:</span> {folder.name} |{' '}
                      <span className="font-medium">Path:</span> {folder.directory_path}
                    </p>
                    {folder.description && (
                      <p className="text-sm text-muted-foreground mt-1">{folder.description}</p>
                    )}
                    {folder.folder_id && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        Folder ID: {folder.folder_id}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(folder)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(folder)}
                      className="text-destructive hover:text-destructive"
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

      <Dialog
        isOpen={showDialog}
        onClose={handleCloseDialog}
        title={editingFolder ? 'Edit Folder' : 'Add Folder'}
        size="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name (Internal) *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="task_files"
                    required
                    disabled={!!editingFolder}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Unique identifier (lowercase, underscores)
                  </p>
                </div>

                <div>
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    name="display_name"
                    value={formData.display_name}
                    onChange={handleChange}
                    placeholder="Task Files"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="directory_path">Directory Path *</Label>
                  <Input
                    id="directory_path"
                    name="directory_path"
                    value={formData.directory_path}
                    onChange={handleChange}
                    placeholder="lms/Task_Files"
                    required
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Path where files will be stored
                  </p>
                </div>

                <div>
                  <Label htmlFor="folder_id">Google Drive Folder ID *</Label>
                  <Input
                    id="folder_id"
                    name="folder_id"
                    value={formData.folder_id}
                    onChange={handleChange}
                    onPaste={handlePasteFolderId}
                    placeholder="1vKLAY4Yc3LSs8a9Mcn7DWn2gVGCuxbjF"
                    required
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste the folder URL or ID from Google Drive
                  </p>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Folder for storing task files..."
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="is_active" className="cursor-pointer">
                      Active (folder is available for use)
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingFolder ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
      </Dialog>
    </div>
  );
};

export default GoogleDriveFolders;

