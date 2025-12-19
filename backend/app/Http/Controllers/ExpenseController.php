<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\ExpenseHead;
use App\Models\Voucher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class ExpenseController extends ApiController
{
    /**
     * Get all expense heads
     */
    public function getExpenseHeads(): JsonResponse
    {
        try {
            $expenseHeads = ExpenseHead::withCount('expenses')
                ->orderBy('name')
                ->get();
            return $this->success($expenseHeads, 'Expense heads retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 'Failed to retrieve expense heads', 500);
        }
    }

    /**
     * Create a new expense head
     */
    public function createExpenseHead(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'is_active' => 'sometimes|boolean',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            $expenseHead = ExpenseHead::create([
                'name' => $request->input('name'),
                'description' => $request->input('description'),
                'is_active' => $request->input('is_active', true),
            ]);

            return $this->success($expenseHead, 'Expense head created successfully', 201);
        } catch (\Exception $e) {
            Log::error('Failed to create expense head: ' . $e->getMessage());
            return $this->error($e->getMessage(), 'Failed to create expense head', 500);
        }
    }

    /**
     * Update an expense head
     */
    public function updateExpenseHead(Request $request, int $id): JsonResponse
    {
        try {
            $expenseHead = ExpenseHead::find($id);
            if (!$expenseHead) {
                return $this->notFound('Expense head not found');
            }

            $validator = Validator::make($request->all(), [
                'name' => 'sometimes|required|string|max:255',
                'description' => 'nullable|string',
                'is_active' => 'sometimes|boolean',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            $expenseHead->update($request->only(['name', 'description', 'is_active']));

            return $this->success($expenseHead, 'Expense head updated successfully');
        } catch (\Exception $e) {
            Log::error('Failed to update expense head: ' . $e->getMessage());
            return $this->error($e->getMessage(), 'Failed to update expense head', 500);
        }
    }

    /**
     * Delete an expense head (only if no expenses exist)
     */
    public function deleteExpenseHead(int $id): JsonResponse
    {
        try {
            $expenseHead = ExpenseHead::find($id);
            if (!$expenseHead) {
                return $this->notFound('Expense head not found');
            }

            if (!$expenseHead->canBeDeleted()) {
                return $this->error('Cannot delete expense head. It has associated expenses.', 'Deletion not allowed', 400);
            }

            $expenseHead->delete();

            return $this->success(null, 'Expense head deleted successfully');
        } catch (\Exception $e) {
            Log::error('Failed to delete expense head: ' . $e->getMessage());
            return $this->error($e->getMessage(), 'Failed to delete expense head', 500);
        }
    }

    /**
     * Get all expenses with filters
     */
    public function getExpenses(Request $request): JsonResponse
    {
        try {
            $query = Expense::with(['expenseHead', 'creator'])
                ->orderBy('expense_date', 'desc')
                ->orderBy('created_at', 'desc');

            // Apply date filters
            $filterType = $request->get('filter', 'this_month');
            $now = Carbon::now()->setTimezone('Asia/Karachi');

            switch ($filterType) {
                case 'weekly':
                    $query->whereBetween('expense_date', [
                        $now->copy()->startOfWeek(),
                        $now->copy()->endOfWeek()
                    ]);
                    break;
                case 'monthly':
                    $query->whereBetween('expense_date', [
                        $now->copy()->startOfMonth(),
                        $now->copy()->endOfMonth()
                    ]);
                    break;
                case 'last_month':
                    $query->whereBetween('expense_date', [
                        $now->copy()->subMonth()->startOfMonth(),
                        $now->copy()->subMonth()->endOfMonth()
                    ]);
                    break;
                case 'this_month':
                    $query->whereBetween('expense_date', [
                        $now->copy()->startOfMonth(),
                        $now->copy()->endOfMonth()
                    ]);
                    break;
                case 'yearly':
                    $query->whereBetween('expense_date', [
                        $now->copy()->startOfYear(),
                        $now->copy()->endOfYear()
                    ]);
                    break;
                default:
                    // Default to this month
                    $query->whereBetween('expense_date', [
                        $now->copy()->startOfMonth(),
                        $now->copy()->endOfMonth()
                    ]);
            }

            // Custom date range
            if ($request->has('date_from') && !empty($request->get('date_from'))) {
                $query->whereDate('expense_date', '>=', $request->get('date_from'));
            }
            if ($request->has('date_to') && !empty($request->get('date_to'))) {
                $query->whereDate('expense_date', '<=', $request->get('date_to'));
            }

            $expenses = $query->get();

            // Calculate total
            $totalAmount = $expenses->sum('amount');

            return $this->success([
                'expenses' => $expenses,
                'total_amount' => (float) $totalAmount,
                'count' => $expenses->count(),
            ], 'Expenses retrieved successfully');
        } catch (\Exception $e) {
            Log::error('Failed to retrieve expenses: ' . $e->getMessage());
            return $this->error($e->getMessage(), 'Failed to retrieve expenses', 500);
        }
    }

    /**
     * Create a new expense
     */
    public function createExpense(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'expense_head_id' => 'required|exists:expense_heads,id',
                'amount' => 'required|numeric|min:0',
                'description' => 'nullable|string',
                'expense_date' => 'required|date',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            $expense = Expense::create([
                'expense_head_id' => $request->input('expense_head_id'),
                'amount' => $request->input('amount'),
                'description' => $request->input('description'),
                'expense_date' => $request->input('expense_date'),
                'created_by' => auth()->id(),
            ]);

            $expense->load(['expenseHead', 'creator']);

            return $this->success($expense, 'Expense created successfully', 201);
        } catch (\Exception $e) {
            Log::error('Failed to create expense: ' . $e->getMessage());
            return $this->error($e->getMessage(), 'Failed to create expense', 500);
        }
    }

    /**
     * Update an expense
     */
    public function updateExpense(Request $request, int $id): JsonResponse
    {
        try {
            $expense = Expense::find($id);
            if (!$expense) {
                return $this->notFound('Expense not found');
            }

            $validator = Validator::make($request->all(), [
                'expense_head_id' => 'sometimes|required|exists:expense_heads,id',
                'amount' => 'sometimes|required|numeric|min:0',
                'description' => 'nullable|string',
                'expense_date' => 'sometimes|required|date',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors()->toArray());
            }

            $expense->update($request->only(['expense_head_id', 'amount', 'description', 'expense_date']));
            $expense->load(['expenseHead', 'creator']);

            return $this->success($expense, 'Expense updated successfully');
        } catch (\Exception $e) {
            Log::error('Failed to update expense: ' . $e->getMessage());
            return $this->error($e->getMessage(), 'Failed to update expense', 500);
        }
    }

    /**
     * Delete an expense
     */
    public function deleteExpense(int $id): JsonResponse
    {
        try {
            $expense = Expense::find($id);
            if (!$expense) {
                return $this->notFound('Expense not found');
            }

            $expense->delete();

            return $this->success(null, 'Expense deleted successfully');
        } catch (\Exception $e) {
            Log::error('Failed to delete expense: ' . $e->getMessage());
            return $this->error($e->getMessage(), 'Failed to delete expense', 500);
        }
    }

    /**
     * Get income and expense report
     */
    public function getIncomeExpenseReport(Request $request): JsonResponse
    {
        try {
            $now = Carbon::now()->setTimezone('Asia/Karachi');
            
            // Determine date range based on filter
            $filterType = $request->get('filter', 'this_month');
            $dateFrom = null;
            $dateTo = null;

            switch ($filterType) {
                case 'last_month':
                    $dateFrom = $now->copy()->subMonth()->startOfMonth()->format('Y-m-d');
                    $dateTo = $now->copy()->subMonth()->endOfMonth()->format('Y-m-d');
                    break;
                case 'this_month':
                    $dateFrom = $now->copy()->startOfMonth()->format('Y-m-d');
                    $dateTo = $now->copy()->endOfMonth()->format('Y-m-d');
                    break;
                case 'this_year':
                    $dateFrom = $now->copy()->startOfYear()->format('Y-m-d');
                    $dateTo = $now->copy()->endOfYear()->format('Y-m-d');
                    break;
                case 'last_year':
                    $dateFrom = $now->copy()->subYear()->startOfYear()->format('Y-m-d');
                    $dateTo = $now->copy()->subYear()->endOfYear()->format('Y-m-d');
                    break;
            }

            // Override with custom date range if provided
            if ($request->has('date_from') && !empty($request->get('date_from'))) {
                $dateFrom = $request->get('date_from');
            }
            if ($request->has('date_to') && !empty($request->get('date_to'))) {
                $dateTo = $request->get('date_to');
            }

            // Get expenses
            $expensesQuery = Expense::with(['expenseHead', 'creator']);
            if ($dateFrom) {
                $expensesQuery->whereDate('expense_date', '>=', $dateFrom);
            }
            if ($dateTo) {
                $expensesQuery->whereDate('expense_date', '<=', $dateTo);
            }
            $expenses = $expensesQuery->orderBy('expense_date', 'desc')->get();
            $totalExpense = $expenses->sum('amount');

            // Get approved vouchers (income)
            $vouchersQuery = Voucher::where('status', 'approved')
                ->with(['student', 'approver']);
            if ($dateFrom) {
                $vouchersQuery->whereDate('approved_at', '>=', $dateFrom);
            }
            if ($dateTo) {
                $vouchersQuery->whereDate('approved_at', '<=', $dateTo);
            }
            $vouchers = $vouchersQuery->orderBy('approved_at', 'desc')->get();
            $totalIncome = $vouchers->sum('fee_amount');

            // Calculate profit
            $profit = $totalIncome - $totalExpense;

            return $this->success([
                'expenses' => $expenses,
                'vouchers' => $vouchers,
                'total_expense' => (float) $totalExpense,
                'total_income' => (float) $totalIncome,
                'profit' => (float) $profit,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ], 'Income and expense report retrieved successfully');
        } catch (\Exception $e) {
            Log::error('Failed to retrieve income and expense report: ' . $e->getMessage());
            return $this->error($e->getMessage(), 'Failed to retrieve income and expense report', 500);
        }
    }
}
