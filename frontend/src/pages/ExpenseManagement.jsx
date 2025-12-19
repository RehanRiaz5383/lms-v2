import { useEffect, useState } from 'react';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Drawer } from '../components/ui/drawer';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Wallet,
  Calendar,
  X,
} from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS, buildEndpoint } from '../config/api';
import { formatCurrency } from '../utils/currency';
import { cn } from '../utils/cn';

const ExpenseManagement = () => {
  const { success, error: showError } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [expenseHeads, setExpenseHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [filter, setFilter] = useState('this_month');
  
  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    expense_head_id: '',
    amount: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
  });
  const [submittingExpense, setSubmittingExpense] = useState(false);
  
  // Expense Head drawer state
  const [showExpenseHeadDrawer, setShowExpenseHeadDrawer] = useState(false);
  const [expenseHeadForm, setExpenseHeadForm] = useState({
    name: '',
    description: '',
    is_active: true,
  });
  const [editingExpenseHead, setEditingExpenseHead] = useState(null);
  const [submittingExpenseHead, setSubmittingExpenseHead] = useState(false);

  useEffect(() => {
    loadExpenseHeads();
    loadExpenses();
  }, [filter]);

  const loadExpenseHeads = async () => {
    try {
      const response = await apiService.get(API_ENDPOINTS.expenses.heads.list);
      setExpenseHeads(response.data.data || []);
    } catch (err) {
      showError('Failed to load expense heads');
    }
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('filter', filter);

      const response = await apiService.get(`${API_ENDPOINTS.expenses.list}?${params.toString()}`);
      setExpenses(response.data.data.expenses || []);
      setTotalAmount(response.data.data.total_amount || 0);
    } catch (err) {
      showError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!expenseForm.expense_head_id || !expenseForm.amount || !expenseForm.expense_date) {
      showError('Please fill in all required fields');
      return;
    }

    try {
      setSubmittingExpense(true);
      await apiService.post(API_ENDPOINTS.expenses.create, expenseForm);
      success('Expense created successfully');
      setExpenseForm({
        expense_head_id: '',
        amount: '',
        description: '',
        expense_date: new Date().toISOString().split('T')[0],
      });
      loadExpenses();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create expense');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.expenses.delete, { id });
      await apiService.delete(endpoint);
      success('Expense deleted successfully');
      loadExpenses();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  const handleCreateExpenseHead = async () => {
    if (!expenseHeadForm.name) {
      showError('Please enter expense head name');
      return;
    }

    try {
      setSubmittingExpenseHead(true);
      if (editingExpenseHead) {
        const endpoint = buildEndpoint(API_ENDPOINTS.expenses.heads.update, { id: editingExpenseHead.id });
        await apiService.put(endpoint, expenseHeadForm);
        success('Expense head updated successfully');
        // Close drawer only when editing (updating)
        setShowExpenseHeadDrawer(false);
        setExpenseHeadForm({ name: '', description: '', is_active: true });
        setEditingExpenseHead(null);
      } else {
        await apiService.post(API_ENDPOINTS.expenses.heads.create, expenseHeadForm);
        success('Expense head created successfully');
        // Don't close drawer when creating - just reset the form
        setExpenseHeadForm({ name: '', description: '', is_active: true });
      }
      loadExpenseHeads();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save expense head');
    } finally {
      setSubmittingExpenseHead(false);
    }
  };

  const handleEditExpenseHead = (expenseHead) => {
    setEditingExpenseHead(expenseHead);
    setExpenseHeadForm({
      name: expenseHead.name,
      description: expenseHead.description || '',
      is_active: expenseHead.is_active,
    });
    setShowExpenseHeadDrawer(true);
  };

  const handleDeleteExpenseHead = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense head?')) {
      return;
    }

    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.expenses.heads.delete, { id });
      await apiService.delete(endpoint);
      success('Expense head deleted successfully');
      loadExpenseHeads();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete expense head');
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
          <h1 className="text-3xl font-bold">Expense Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage expenses and expense heads
          </p>
        </div>
        <Button onClick={() => {
          setEditingExpenseHead(null);
          setExpenseHeadForm({ name: '', description: '', is_active: true });
          setShowExpenseHeadDrawer(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Expense Head
        </Button>
      </div>

      {/* Total Expense Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Expense</p>
              <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
            </div>
            <Wallet className="h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === 'weekly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('weekly')}
            >
              Weekly
            </Button>
            <Button
              variant={filter === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('monthly')}
            >
              Monthly
            </Button>
            <Button
              variant={filter === 'last_month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('last_month')}
            >
              Last Month
            </Button>
            <Button
              variant={filter === 'this_month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('this_month')}
            >
              This Month
            </Button>
            <Button
              variant={filter === 'yearly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('yearly')}
            >
              Yearly
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Expense Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="expense_head">Expense Head *</Label>
                <select
                  id="expense_head"
                  value={expenseForm.expense_head_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_head_id: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select Expense Head</option>
                  {expenseHeads
                    .filter(head => head.is_active)
                    .map((head) => (
                      <option key={head.id} value={head.id}>
                        {head.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label htmlFor="amount">Amount (PKR) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label htmlFor="expense_date">Expense Date *</Label>
                <Input
                  id="expense_date"
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <Button 
                onClick={handleCreateExpense} 
                disabled={submittingExpense}
                className="w-full"
              >
                {submittingExpense ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Save Expense
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Expenses List */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No expenses found for the selected filter.</p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                <table className="w-full">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Expense Head</th>
                      <th className="text-left p-3 font-medium">Amount</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-left p-3 font-medium">Created By</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="border-b hover:bg-accent/50">
                        <td className="p-3">{formatDate(expense.expense_date)}</td>
                        <td className="p-3">{expense.expense_head?.name || 'N/A'}</td>
                        <td className="p-3 font-medium">{formatCurrency(expense.amount)}</td>
                        <td className="p-3">{expense.description || '-'}</td>
                        <td className="p-3">
                          {expense.creator?.name || 
                           `${expense.creator?.first_name || ''} ${expense.creator?.last_name || ''}`.trim() ||
                           expense.creator?.email ||
                           'N/A'}
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Expense Head Drawer */}
      <Drawer
        isOpen={showExpenseHeadDrawer}
        onClose={() => {
          setShowExpenseHeadDrawer(false);
          setEditingExpenseHead(null);
          setExpenseHeadForm({ name: '', description: '', is_active: true });
        }}
        size="60%"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {editingExpenseHead ? 'Edit Expense Head' : 'Create Expense Head'}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowExpenseHeadDrawer(false);
                setEditingExpenseHead(null);
                setExpenseHeadForm({ name: '', description: '', is_active: true });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="head_name">Name *</Label>
              <Input
                id="head_name"
                type="text"
                value={expenseHeadForm.name}
                onChange={(e) => setExpenseHeadForm({ ...expenseHeadForm, name: e.target.value })}
                placeholder="Enter expense head name"
              />
            </div>
            <div>
              <Label htmlFor="head_description">Description</Label>
              <Input
                id="head_description"
                type="text"
                value={expenseHeadForm.description}
                onChange={(e) => setExpenseHeadForm({ ...expenseHeadForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="head_active"
                checked={expenseHeadForm.is_active}
                onChange={(e) => setExpenseHeadForm({ ...expenseHeadForm, is_active: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="head_active" className="cursor-pointer">
                Active
              </Label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreateExpenseHead}
                disabled={submittingExpenseHead}
                className="flex-1"
              >
                {submittingExpenseHead ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {editingExpenseHead ? 'Update' : 'Create'}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowExpenseHeadDrawer(false);
                  setEditingExpenseHead(null);
                  setExpenseHeadForm({ name: '', description: '', is_active: true });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>

          {/* Existing Expense Heads List */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Existing Expense Heads</h3>
            {expenseHeads.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No expense heads created yet</p>
            ) : (
              <div className="space-y-2">
                {expenseHeads.map((head) => {
                  const canDelete = (head.expenses_count || 0) === 0;
                  
                  return (
                    <div
                      key={head.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-accent"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{head.name}</p>
                        {head.description && (
                          <p className="text-sm text-muted-foreground">{head.description}</p>
                        )}
                        {!head.is_active && (
                          <span className="text-xs text-muted-foreground">(Inactive)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditExpenseHead(head)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExpenseHead(head.id)}
                          disabled={!canDelete}
                          title={!canDelete ? 'Cannot delete: Has associated expenses' : 'Delete'}
                        >
                          <Trash2 className={cn("h-4 w-4", !canDelete && "text-muted-foreground")} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default ExpenseManagement;

