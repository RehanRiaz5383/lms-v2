import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../components/ui/toast';
import RichTextEditor from '../components/RichTextEditor';

export default function DepositAccountInformation() {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contentHtml, setContentHtml] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiService.get(API_ENDPOINTS.depositAccountInformation.get);
      setContentHtml(res?.data?.data?.content_html ?? '');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to load deposit account information');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiService.put(API_ENDPOINTS.depositAccountInformation.update, {
        content_html: contentHtml,
      });
      success('Saved successfully');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Deposit Account information</CardTitle>
          <CardDescription>
            This content is shown to students in Account Book under “How to deposit fee”.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <RichTextEditor value={contentHtml} onChange={setContentHtml} placeholder="Add deposit instructions..." />
          )}

          <div className="flex justify-end">
            <Button type="button" onClick={save} disabled={loading || saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

