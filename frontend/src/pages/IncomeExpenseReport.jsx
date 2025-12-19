import { useEffect, useState } from 'react';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Drawer } from '../components/ui/drawer';
import {
  Loader2,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter,
  X,
} from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { formatCurrency } from '../utils/currency';
import { cn } from '../utils/cn';

const IncomeExpenseReport = () => {
  const { error: showError } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [profit, setProfit] = useState(0);
  const [filter, setFilter] = useState('this_month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('filter', filter);

      if (dateFrom) {
        params.append('date_from', dateFrom);
      }
      if (dateTo) {
        params.append('date_to', dateTo);
      }

      const response = await apiService.get(`${API_ENDPOINTS.expenses.incomeExpenseReport}?${params.toString()}`);
      setExpenses(response.data.data.expenses || []);
      setVouchers(response.data.data.vouchers || []);
      setTotalExpense(response.data.data.total_expense || 0);
      setTotalIncome(response.data.data.total_income || 0);
      setProfit(response.data.data.profit || 0);
    } catch (err) {
      showError('Failed to load income and expense report');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFilter = (filterType) => {
    setFilter(filterType);
    setDateFrom('');
    setDateTo('');
  };

  const handleApplyFilter = () => {
    setFilter('custom');
    loadReport();
  };

  const handleClearFilter = () => {
    setFilter('this_month');
    setDateFrom('');
    setDateTo('');
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
          <h1 className="text-3xl font-bold">Income & Expense Report</h1>
          <p className="text-muted-foreground mt-1">
            View income from approved vouchers and expenses
          </p>
        </div>
        <Button onClick={() => setShowFilterDrawer(true)} variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Main Report Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses Section */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No expenses found for the selected period.</p>
              </div>
            ) : (
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 500px)' }}>
                <table className="w-full">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Expense Head</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-left p-3 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="border-b hover:bg-accent/50">
                        <td className="p-3">{formatDate(expense.expense_date)}</td>
                        <td className="p-3">{expense.expense_head?.name || 'N/A'}</td>
                        <td className="p-3">{expense.description || '-'}</td>
                        <td className="p-3 font-medium">{formatCurrency(expense.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Income Section */}
        <Card>
          <CardHeader>
            <CardTitle>Income (Approved Vouchers)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : vouchers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No approved vouchers found for the selected period.</p>
              </div>
            ) : (
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 500px)' }}>
                <table className="w-full">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Voucher #</th>
                      <th className="text-left p-3 font-medium">Student Name</th>
                      <th className="text-left p-3 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.map((voucher) => (
                      <tr key={voucher.id} className="border-b hover:bg-accent/50">
                        <td className="p-3">#{voucher.id}</td>
                        <td className="p-3">
                          {voucher.student?.name || 
                           `${voucher.student?.first_name || ''} ${voucher.student?.last_name || ''}`.trim() ||
                           voucher.student?.email ||
                           'N/A'}
                        </td>
                        <td className="p-3 font-medium">{formatCurrency(voucher.fee_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <TrendingDown className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Expense</p>
                <p className="text-2xl font-bold">{formatCurrency(totalExpense)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold">{formatCurrency(totalIncome)}</p>
              </div>
            </div>
            <div className={cn(
              "flex items-center gap-3 p-4 rounded-lg border",
              profit >= 0 
                ? "bg-green-500/10 border-green-500/20" 
                : "bg-red-500/10 border-red-500/20"
            )}>
              <DollarSign className={cn(
                "h-8 w-8",
                profit >= 0 ? "text-green-500" : "text-red-500"
              )} />
              <div>
                <p className="text-sm text-muted-foreground">Profit / Loss</p>
                <p className={cn(
                  "text-2xl font-bold",
                  profit >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {formatCurrency(profit)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Drawer */}
      <Drawer
        isOpen={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        size="md"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Filters</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilterDrawer(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Quick Filters */}
            <div>
              <Label className="mb-3 block text-base font-semibold">Quick Filters</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={filter === 'last_month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    handleQuickFilter('last_month');
                    setShowFilterDrawer(false);
                  }}
                  className="w-full"
                >
                  Last Month
                </Button>
                <Button
                  variant={filter === 'this_month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    handleQuickFilter('this_month');
                    setShowFilterDrawer(false);
                  }}
                  className="w-full"
                >
                  This Month
                </Button>
                <Button
                  variant={filter === 'this_year' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    handleQuickFilter('this_year');
                    setShowFilterDrawer(false);
                  }}
                  className="w-full"
                >
                  This Year
                </Button>
                <Button
                  variant={filter === 'last_year' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    handleQuickFilter('last_year');
                    setShowFilterDrawer(false);
                  }}
                  className="w-full"
                >
                  Last Year
                </Button>
              </div>
            </div>

            {/* Date Range Filters */}
            <div>
              <Label className="mb-3 block text-base font-semibold">Custom Date Range</Label>
              <div className="space-y-4">
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
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={() => {
                  handleApplyFilter();
                  setShowFilterDrawer(false);
                }}
                className="flex-1"
              >
                <Search className="h-4 w-4 mr-2" />
                Apply Filter
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  handleClearFilter();
                  setShowFilterDrawer(false);
                }}
                className="flex-1"
              >
                Clear Filter
              </Button>
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default IncomeExpenseReport;

