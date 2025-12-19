import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Drawer } from '../components/ui/drawer';
import { Loader2, Save, CheckCircle2, XCircle, Edit, Shield } from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../components/ui/toast';

const InternalIntegrations = () => {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState(null);
  const [settings, setSettings] = useState({
    site_key: '',
    secret_key: '',
    is_enabled: false,
  });

  // Define integrations list
  const integrations = [
    {
      id: 'cloudflare-turnstile',
      name: 'Cloudflare Turnstile',
      description: 'Bot protection for signup forms',
      icon: Shield,
      color: 'bg-orange-500',
    },
    // Add more integrations here in the future
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const response = await apiService.get(API_ENDPOINTS.turnstile.getAdminSettings);
      const data = response.data?.data;
      setSettings({
        site_key: data?.site_key || '',
        secret_key: data?.secret_key || '',
        is_enabled: data?.is_enabled || false,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      showError('Failed to load Cloudflare Turnstile settings');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleEdit = (integration) => {
    setEditingIntegration(integration);
    setShowDrawer(true);
  };

  const handleCloseDrawer = () => {
    setShowDrawer(false);
    setEditingIntegration(null);
  };

  const handleChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiService.put(API_ENDPOINTS.turnstile.updateSettings, settings);
      success('Cloudflare Turnstile settings updated successfully');
      setShowDrawer(false);
      setEditingIntegration(null);
      // Reload settings to get updated values
      await loadSettings();
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to update settings';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Internal Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Manage internal integrations and third-party services
        </p>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const isEnabled = integration.id === 'cloudflare-turnstile' ? settings.is_enabled : false;

          return (
            <Card key={integration.id} className="relative hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className={`${integration.color} p-3 rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isEnabled 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}>
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
                <CardTitle className="text-lg">{integration.name}</CardTitle>
                <CardDescription className="text-sm mt-1">
                  {integration.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleEdit(integration)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Settings
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Drawer */}
      <Drawer
        isOpen={showDrawer}
        onClose={handleCloseDrawer}
        title={editingIntegration ? `Edit ${editingIntegration.name}` : 'Edit Integration'}
        size="lg"
      >
        {editingIntegration && editingIntegration.id === 'cloudflare-turnstile' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_enabled">Enable Turnstile</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, students must complete Turnstile verification during signup
                  </p>
                </div>
                <Switch
                  id="is_enabled"
                  checked={settings.is_enabled}
                  onCheckedChange={(checked) => handleChange('is_enabled', checked)}
                />
              </div>

              {settings.is_enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="site_key">Site Key</Label>
                    <Input
                      id="site_key"
                      type="text"
                      placeholder="Enter your Cloudflare Turnstile site key"
                      value={settings.site_key}
                      onChange={(e) => handleChange('site_key', e.target.value)}
                      required={settings.is_enabled}
                    />
                    <p className="text-sm text-muted-foreground">
                      Your public site key from Cloudflare Turnstile dashboard
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secret_key">Secret Key</Label>
                    <Input
                      id="secret_key"
                      type="password"
                      placeholder="Enter your Cloudflare Turnstile secret key"
                      value={settings.secret_key}
                      onChange={(e) => handleChange('secret_key', e.target.value)}
                      required={settings.is_enabled}
                    />
                    <p className="text-sm text-muted-foreground">
                      Your private secret key from Cloudflare Turnstile dashboard
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">How to get your keys:</p>
                        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1 ml-2">
                          <li>Log in to your Cloudflare dashboard</li>
                          <li>Navigate to Turnstile section</li>
                          <li>Create a new site or select an existing one</li>
                          <li>Copy the Site Key and Secret Key</li>
                          <li>Paste them in the fields above</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {!settings.is_enabled && (
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      Turnstile is currently disabled. Enable it to require bot protection during signup.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDrawer}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
};

export default InternalIntegrations;
