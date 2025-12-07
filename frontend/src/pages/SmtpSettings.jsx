import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  fetchSmtpSettings,
  updateSmtpSettings,
  testSmtpConnection,
  clearError,
} from '../store/slices/smtpSettingsSlice';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, Mail, Save, TestTube } from 'lucide-react';

const SmtpSettings = () => {
  const dispatch = useAppDispatch();
  const { settings, loading, error, testing, testError } = useAppSelector((state) => state.smtpSettings);
  const { success, showError } = useToast();

  const [formData, setFormData] = useState({
    mailer: 'smtp',
    host: '',
    port: 587,
    username: '',
    password: '',
    encryption: 'tls',
    from_address: '',
    from_name: '',
    is_active: false,
  });

  useEffect(() => {
    dispatch(fetchSmtpSettings());
  }, [dispatch]);

  useEffect(() => {
    if (settings) {
      setFormData({
        mailer: settings.mailer || 'smtp',
        host: settings.host || '',
        port: settings.port || 587,
        username: settings.username || '',
        password: settings.password || '',
        encryption: settings.encryption || 'tls',
        from_address: settings.from_address || '',
        from_name: settings.from_name || '',
        is_active: settings.is_active ?? false,
      });
    }
  }, [settings]);

  useEffect(() => {
    if (error) {
      showError(error);
      dispatch(clearError());
    }
  }, [error, showError, dispatch]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(updateSmtpSettings(formData)).unwrap();
      success('SMTP settings saved successfully');
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to save SMTP settings';
      showError(errorMessage);
    }
  };

  const handleTest = async () => {
    try {
      await dispatch(testSmtpConnection(formData)).unwrap();
      success('Test email sent successfully! Please check your inbox.');
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : testError || 'Failed to send test email';
      showError(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SMTP Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your SMTP server settings for sending emails
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            SMTP Configuration
          </CardTitle>
          <CardDescription>
            Enter your SMTP server details to enable email functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !settings ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="host">SMTP Host *</Label>
                  <Input
                    id="host"
                    name="host"
                    type="text"
                    value={formData.host}
                    onChange={handleChange}
                    placeholder="smtp.gmail.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="port">SMTP Port *</Label>
                  <Input
                    id="port"
                    name="port"
                    type="number"
                    value={formData.port}
                    onChange={handleChange}
                    placeholder="587"
                    min="1"
                    max="65535"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="your-email@gmail.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Your SMTP password"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="encryption">Encryption</Label>
                  <select
                    id="encryption"
                    name="encryption"
                    value={formData.encryption}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="from_address">From Email Address *</Label>
                  <Input
                    id="from_address"
                    name="from_address"
                    type="email"
                    value={formData.from_address}
                    onChange={handleChange}
                    placeholder="noreply@example.com"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="from_name">From Name *</Label>
                  <Input
                    id="from_name"
                    name="from_name"
                    type="text"
                    value={formData.from_name}
                    onChange={handleChange}
                    placeholder="LMS System"
                    required
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
                      Activate SMTP settings
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTest}
                  disabled={loading || testing}
                >
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Test Connection
                    </>
                  )}
                </Button>
                <Button type="submit" disabled={loading || testing}>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default SmtpSettings;

