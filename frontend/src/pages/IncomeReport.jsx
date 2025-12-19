import { useEffect, useState } from 'react';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Loader2,
  Search,
  Calendar,
  Wallet,
} from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { cn } from '../utils/cn';
import { formatCurrency } from '../utils/currency';

const IncomeReport = () => {
  const { error: showError } = useToast();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadIncomeReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadIncomeReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (dateFrom) {
        params.append('date_from', dateFrom);
      }
      if (dateTo) {
        params.append('date_to', dateTo);
      }

      const queryString = params.toString();
      const endpoint = queryString 
        ? `${API_ENDPOINTS.vouchers.incomeReport}?${queryString}`
        : API_ENDPOINTS.vouchers.incomeReport;

      const response = await apiService.get(endpoint);
      setVouchers(response.data.data.vouchers || []);
      setTotalAmount(response.data.data.total_amount || 0);
    } catch (err) {
      showError('Failed to load income report');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFilter = async (filterType) => {
    const today = new Date();
    let fromDate = new Date();
    let toDate = new Date();

    switch (filterType) {
      case 'last_10_days':
        fromDate.setDate(today.getDate() - 10);
        toDate = new Date(today);
        break;
      case 'last_15_days':
        fromDate.setDate(today.getDate() - 15);
        toDate = new Date(today);
        break;
      case 'this_month':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        toDate = new Date(today);
        break;
      case 'last_month':
        fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        toDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'this_year':
        fromDate = new Date(today.getFullYear(), 0, 1);
        toDate = new Date(today);
        break;
      default:
        return;
    }

    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = toDate.toISOString().split('T')[0];
    
    setDateFrom(fromDateStr);
    setDateTo(toDateStr);
    
    // Load report with new dates
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('date_from', fromDateStr);
      params.append('date_to', toDateStr);

      const response = await apiService.get(`${API_ENDPOINTS.vouchers.incomeReport}?${params.toString()}`);
      setVouchers(response.data.data.vouchers || []);
      setTotalAmount(response.data.data.total_amount || 0);
    } catch (err) {
      showError('Failed to load income report');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => {
    loadIncomeReport();
  };

  const handleClearFilter = async () => {
    setDateFrom('');
    setDateTo('');
    
    // Load report without date filters
    try {
      setLoading(true);
      const response = await apiService.get(API_ENDPOINTS.vouchers.incomeReport);
      setVouchers(response.data.data.vouchers || []);
      setTotalAmount(response.data.data.total_amount || 0);
    } catch (err) {
      showError('Failed to load income report');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Income Report</h1>
          <p className="text-muted-foreground mt-1">
            View approved vouchers and total income
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quick Filters */}
            <div>
              <Label className="mb-2 block">Quick Filters</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFilter('last_10_days')}
                >
                  Last 10 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFilter('last_15_days')}
                >
                  Last 15 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFilter('this_month')}
                >
                  This Month
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFilter('last_month')}
                >
                  Last Month
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFilter('this_year')}
                >
                  This Year
                </Button>
              </div>
            </div>

            {/* Date Range Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date_from">From Date</Label>
                <Input
                  id="date_from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="date_to">To Date</Label>
                <Input
                  id="date_to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={handleApplyFilter}>
                <Search className="h-4 w-4 mr-2" />
                Apply Filter
              </Button>
              <Button variant="outline" onClick={handleClearFilter}>
                Clear Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
              <Wallet className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Vouchers</p>
                <p className="text-2xl font-bold">{vouchers.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vouchers List */}
      <Card>
        <CardHeader>
          <CardTitle>Approved Vouchers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : vouchers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No approved vouchers found for the selected date range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Student</th>
                    <th className="text-left p-3 font-medium">Description</th>
                    <th className="text-left p-3 font-medium">Amount</th>
                    <th className="text-left p-3 font-medium">Due Date</th>
                    <th className="text-left p-3 font-medium">Approved Date</th>
                    <th className="text-left p-3 font-medium">Approved By</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((voucher) => (
                    <tr key={voucher.id} className="border-b hover:bg-accent/50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">
                            {voucher.student?.name || 
                             `${voucher.student?.first_name || ''} ${voucher.student?.last_name || ''}`.trim() ||
                             voucher.student?.email ||
                             'N/A'}
                          </p>
                          {voucher.student?.email && (
                            <p className="text-sm text-muted-foreground">{voucher.student.email}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3">{voucher.description || 'Fee Voucher'}</td>
                      <td className="p-3 font-medium">{formatCurrency(voucher.fee_amount)}</td>
                      <td className="p-3">{formatDate(voucher.due_date)}</td>
                      <td className="p-3">{formatDate(voucher.approved_at)}</td>
                      <td className="p-3">
                        {voucher.approver?.name || 
                         `${voucher.approver?.first_name || ''} ${voucher.approver?.last_name || ''}`.trim() ||
                         voucher.approver?.email ||
                         'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IncomeReport;

