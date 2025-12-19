import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  fetchNotificationSettings,
  updateNotificationSettings,
  clearError,
} from '../store/slices/notificationSettingsSlice';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, Bell } from 'lucide-react';

const NotificationSettings = () => {
  const dispatch = useAppDispatch();
  const { settings, loading, error } = useAppSelector((state) => state.notificationSettings);
  const { success, showError } = useToast();

  const [formData, setFormData] = useState({
    new_student_registration: false,
    block_student_registration: false,
    user_update: false,
    user_login_logout: false,
    notify_on_new_signup: false,
    notify_on_payment_proof_submission: false,
  });

  useEffect(() => {
    dispatch(fetchNotificationSettings());
  }, [dispatch]);

  useEffect(() => {
    if (settings) {
      setFormData({
        new_student_registration: settings.new_student_registration ?? false,
        block_student_registration: settings.block_student_registration ?? false,
        user_update: settings.user_update ?? false,
        user_login_logout: settings.user_login_logout ?? false,
        notify_on_new_signup: settings.notify_on_new_signup ?? false,
        notify_on_payment_proof_submission: settings.notify_on_payment_proof_submission ?? false,
      });
    }
  }, [settings]);

  useEffect(() => {
    if (error) {
      showError(error);
      dispatch(clearError());
    }
  }, [error, showError, dispatch]);

  const handleToggle = (field) => {
    setFormData((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(updateNotificationSettings(formData)).unwrap();
      success('Notification settings saved successfully');
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to save notification settings';
      showError(errorMessage);
    }
  };

  const notificationOptions = [
    {
      key: 'new_student_registration',
      label: 'New Student Registration Notification',
      description: 'Receive email notifications when a new student registers',
    },
    {
      key: 'block_student_registration',
      label: 'Block Student Registration Notification',
      description: 'Receive email notifications when a student is blocked',
    },
    {
      key: 'user_update',
      label: 'User Update Notification',
      description: 'Users will receive email notifications when their account information is updated',
    },
    {
      key: 'user_login_logout',
      label: 'User Login and Logout Notification',
      description: 'Receive email notifications when users login or logout',
    },
    {
      key: 'notify_on_new_signup',
      label: 'Notify on New Signup',
      description: 'Receive email notifications when a new student signs up',
    },
    {
      key: 'notify_on_payment_proof_submission',
      label: 'Notify on Payment Proof Submission',
      description: 'Receive email notifications when a student submits payment proof for a voucher',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Configure which notifications you want to receive via email
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Toggle notifications on or off. When enabled, admins will receive email notifications for the selected events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !settings ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {notificationOptions.map((option) => (
                  <div
                    key={option.key}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 mr-4">
                      <h3 className="font-medium text-sm mb-1">{option.label}</h3>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData[option.key]}
                        onChange={() => handleToggle(option.key)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Settings'
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

export default NotificationSettings;

