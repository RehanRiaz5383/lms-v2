import { useEffect, useState } from 'react';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Check,
  X,
  Eye,
  Bell,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS, buildEndpoint } from '../config/api';
import { cn } from '../utils/cn';
import { formatCurrency } from '../utils/currency';

const FeeVouchers = () => {
  const { success, error: showError } = useToast();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending'); // Default to pending
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
    from: 0,
    to: 0,
  });

  useEffect(() => {
    loadVouchers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, pagination.current_page]);

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.current_page.toString(),
        per_page: '15',
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await apiService.get(`${API_ENDPOINTS.vouchers.list}?${params.toString()}`);
      setVouchers(response.data.data.vouchers || []);
      setPagination(response.data.data.pagination || pagination);
    } catch (err) {
      showError('Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (voucherId) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.vouchers.approve, { id: voucherId });
      await apiService.post(endpoint);
      success('Voucher approved successfully');
      loadVouchers();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to approve voucher');
    }
  };

  const handleNotify = async (voucherId) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.vouchers.notify, { id: voucherId });
      await apiService.post(endpoint);
      success('Payment clearance notification sent to student');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to send notification');
    }
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setPagination({ ...pagination, current_page: 1 });
  };

  const handleSearch = () => {
    setPagination({ ...pagination, current_page: 1 });
    loadVouchers();
  };

  const handlePageChange = (page) => {
    setPagination({ ...pagination, current_page: page });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (voucher) => {
    return voucher.status === 'pending' && new Date(voucher.due_date) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fee Vouchers</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track all student fee vouchers
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="paid">Paid (Approved)</option>
                <option value="overdue">Overdue</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <Label htmlFor="search">Search Student</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vouchers Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Vouchers ({pagination.total})
            {statusFilter === 'pending' && ' - Ordered by Most Upcoming'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : vouchers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No vouchers found</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        Student
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        Description
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        Fee Amount
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        Due Date
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        Payment Proof
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.map((voucher) => (
                      <tr
                        key={voucher.id}
                        className={cn(
                          'border-b hover:bg-muted/50 transition-colors',
                          isOverdue(voucher) && 'bg-red-50'
                        )}
                      >
                        <td className="p-4">
                          <div>
                            <div className="font-medium">
                              {voucher.student?.name || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {voucher.student?.email || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">
                            {voucher.description || 'Fee Voucher'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-medium">
                            {formatCurrency(voucher.fee_amount)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div>
                            {new Date(voucher.due_date).toLocaleDateString()}
                            {isOverdue(voucher) && (
                              <span className="ml-2 text-xs text-red-600 font-medium">
                                (Overdue)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={cn(
                              'px-2 py-1 rounded text-xs font-medium',
                              getStatusColor(voucher.status)
                            )}
                          >
                            {voucher.status.charAt(0).toUpperCase() +
                              voucher.status.slice(1)}
                          </span>
                        </td>
                        <td className="p-4">
                          {voucher.submission_file ? (
                            <a
                              href={voucher.submission_file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View File
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Not submitted
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {(voucher.status === 'submitted' ||
                              voucher.status === 'pending') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(voucher.id)}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                            )}
                            {voucher.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleNotify(voucher.id)}
                              >
                                <Bell className="h-3 w-3 mr-1" />
                                Notify
                              </Button>
                            )}
                            {voucher.submission_file && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  window.open(voucher.submission_file_url, '_blank')
                                }
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Proof
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.last_page > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {pagination.from || 0} to {pagination.to || 0} of{' '}
                    {pagination.total} vouchers
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.current_page - 1)}
                      disabled={pagination.current_page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {pagination.current_page} of {pagination.last_page}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.current_page + 1)}
                      disabled={pagination.current_page === pagination.last_page}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeeVouchers;

