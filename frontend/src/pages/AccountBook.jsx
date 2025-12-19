import { useEffect, useState, useRef } from 'react';
import { useAppSelector } from '../hooks/redux';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog } from '../components/ui/dialog';
import { Tooltip } from '../components/ui/tooltip';
import { 
  DollarSign, 
  Upload, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Eye,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../components/ui/toast';
import { cn } from '../utils/cn';
import { formatCurrency } from '../utils/currency';

const AccountBook = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { success: showSuccess, error: showError } = useToast();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      loadVouchers();
    }
  }, [user]);

  const loadVouchers = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const response = await apiService.get(API_ENDPOINTS.student.vouchers.list);
      setVouchers(response.data.data || []);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitClick = (voucher) => {
    setSelectedVoucher(voucher);
    setSelectedFile(null);
    setShowSubmitDialog(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedFile) {
      showError('Please select a payment proof file');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      await apiService.post(
        API_ENDPOINTS.student.vouchers.submitPayment.replace(':id', selectedVoucher.id),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      showSuccess('Payment proof submitted successfully');
      setShowSubmitDialog(false);
      setSelectedVoucher(null);
      setSelectedFile(null);
      await loadVouchers();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit payment proof');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'submitted':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const pendingVouchers = vouchers.filter(v => v.status === 'pending');
  const submittedVouchers = vouchers.filter(v => v.status === 'submitted');
  const approvedVouchers = vouchers.filter(v => v.status === 'approved');
  const rejectedVouchers = vouchers.filter(v => v.status === 'rejected');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Account Book</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your fee vouchers
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingVouchers.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="text-2xl font-bold">{submittedVouchers.length}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{approvedVouchers.length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(vouchers.reduce((sum, v) => sum + parseFloat(v.fee_amount || 0), 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vouchers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vouchers</CardTitle>
          <CardDescription>All your fee vouchers and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : vouchers.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No vouchers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Description</th>
                    <th className="text-left p-4">Due Date</th>
                    <th className="text-left p-4">Amount</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Submitted At</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((voucher) => (
                    <tr key={voucher.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <span className="text-sm font-medium">{voucher.description || 'Fee Voucher'}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(voucher.due_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-lg">
                          {formatCurrency(voucher.fee_amount)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border',
                            getStatusColor(voucher.status)
                          )}
                        >
                          {getStatusIcon(voucher.status)}
                          {voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1)}
                        </span>
                      </td>
                      <td className="p-4">
                        {voucher.submitted_at ? (
                          <span className="text-sm text-muted-foreground">
                            {new Date(voucher.submitted_at).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {voucher.status === 'pending' && (
                            <Tooltip content="Submit Payment Proof">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSubmitClick(voucher)}
                              >
                                <Upload className="h-4 w-4 mr-1" />
                                Submit
                              </Button>
                            </Tooltip>
                          )}
                          {voucher.submission_file && (
                            <Tooltip content="View Submission">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(voucher.submission_file_url, '_blank')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          )}
                          {voucher.remarks && (
                            <Tooltip content={voucher.remarks}>
                              <Button
                                size="sm"
                                variant="ghost"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Payment Dialog */}
      <Dialog
        isOpen={showSubmitDialog}
        onClose={() => {
          setShowSubmitDialog(false);
          setSelectedVoucher(null);
          setSelectedFile(null);
        }}
        title="Submit Payment Proof"
      >
        <div className="space-y-4">
          {selectedVoucher && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Voucher Details</p>
              <p className="font-semibold">
                Amount: {formatCurrency(selectedVoucher.fee_amount)}
              </p>
              <p className="text-sm text-muted-foreground">
                Due Date: {new Date(selectedVoucher.due_date).toLocaleDateString()}
              </p>
            </div>
          )}
          <div>
            <Label htmlFor="paymentFile">Payment Proof File *</Label>
            <Input
              id="paymentFile"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Accepted formats: PDF, JPG, PNG, WebP (Max 10MB)
            </p>
            {selectedFile && (
              <p className="text-sm text-green-600 mt-2">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSubmitPayment}
              disabled={!selectedFile || submitting}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowSubmitDialog(false);
                setSelectedVoucher(null);
                setSelectedFile(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default AccountBook;

