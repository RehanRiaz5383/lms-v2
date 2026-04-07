import { useEffect, useState } from 'react';
import { useAppSelector } from '../hooks/redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Users,
  BookOpen,
  Video,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  UserCheck,
  FileVideo,
  Link2,
  Clock,
  Activity,
  ClipboardList,
  HelpCircle,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Award,
  PlayCircle,
  AlertCircle,
  Wallet,
  BarChart3,
  ChevronDown,
  Bell,
  Loader2,
  Inbox,
  Sparkles,
  LayoutList,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/toast';
import { formatCurrency } from '../utils/currency';
import { cn } from '../utils/cn';
import {
  DASHBOARD_GLASS_SHELL,
  DASHBOARD_GLASS_CARD,
  DASHBOARD_PAGE_WRAP,
  DASHBOARD_ORB_L,
  DASHBOARD_ORB_R,
  DASHBOARD_GLASS_PILL,
} from '../constants/dashboardGlassStyles';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend as RechartsLegend,
} from 'recharts';
import UpcomingActivities from '../components/UpcomingActivities';

const PIE_COLORS = ['#8b5cf6', '#0ea5e9', '#22c55e', '#f97316', '#ec4899'];

const TaskCountdownTimer = ({ dueDate }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!dueDate) {
      setTimeLeft(null);
      setIsExpired(false);
      return;
    }

    const updateTimer = () => {
      try {
        const now = new Date();
        let due = new Date(dueDate);
        if (isNaN(due.getTime())) {
          setTimeLeft(null);
          setIsExpired(false);
          return;
        }
        const dateStr = String(dueDate);
        if (
          dateStr.match(/^\d{4}-\d{2}-\d{2}$/) ||
          (!dateStr.includes('T') && !dateStr.includes(' ') && dateStr.length <= 10)
        ) {
          due.setHours(23, 59, 59, 999);
        }
        const diff = due - now;
        if (diff <= 0) {
          setTimeLeft(null);
          setIsExpired(true);
          return;
        }
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
        setIsExpired(false);
      } catch {
        setTimeLeft(null);
        setIsExpired(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [dueDate]);

  if (isExpired) {
    return <div className="text-xs font-medium text-red-500">Expired</div>;
  }
  if (!timeLeft) {
    return <div className="text-xs text-muted-foreground">…</div>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {timeLeft.days > 0 && (
        <span className="rounded bg-blue-500/15 px-2 py-0.5 font-semibold text-blue-600 dark:text-blue-400">
          {timeLeft.days}d
        </span>
      )}
      <span className="rounded bg-orange-500/15 px-2 py-0.5 font-semibold text-orange-600 dark:text-orange-400">
        {String(timeLeft.hours).padStart(2, '0')}h
      </span>
      <span className="rounded bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-400">
        {String(timeLeft.minutes).padStart(2, '0')}m
      </span>
      <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-400">
        {String(timeLeft.seconds).padStart(2, '0')}s
      </span>
    </div>
  );
};

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className={cn(DASHBOARD_GLASS_PILL, 'w-full justify-center sm:w-auto')}>
      <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      {label}
    </button>
  );
}

const Dashboard = () => {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const { error: showError, success } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendingData, setTrendingData] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [trendingFilter, setTrendingFilter] = useState('all_time');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [loadingPendingSubmissions, setLoadingPendingSubmissions] = useState(false);
  const [notifyingStudentId, setNotifyingStudentId] = useState(null);
  const [studentActivityTab, setStudentActivityTab] = useState('tasks');

  const isStudent =
    user?.roles?.some((role) => role.title?.toLowerCase() === 'student') ||
    user?.user_type_title?.toLowerCase() === 'student';

  useEffect(() => {
    if (isStudent) {
      loadStudentDashboardStats();
    } else {
      loadDashboardStats();
      loadTrendingSignupReasons();
      loadPendingTaskSubmissions();
    }
  }, [isStudent]);

  useEffect(() => {
    if (!isStudent) {
      loadTrendingSignupReasons();
    }
  }, [trendingFilter]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterDropdown && !event.target.closest('.filter-dropdown-container')) {
        setShowFilterDropdown(false);
      }
    };
    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterDropdown]);

  const loadDashboardStats = async () => {
    try {
      const response = await apiService.get(API_ENDPOINTS.dashboard.stats);
      setStats(response.data.data);
    } catch {
      showError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingSignupReasons = async () => {
    try {
      setLoadingTrending(true);
      const response = await apiService.get(API_ENDPOINTS.dashboard.trendingSignupReasons, {
        params: { filter: trendingFilter },
      });
      setTrendingData(response.data.data?.trending || []);
    } catch (err) {
      console.error('Failed to load trending signup reasons:', err);
      showError('Failed to load trending signup reasons');
    } finally {
      setLoadingTrending(false);
    }
  };

  const loadPendingTaskSubmissions = async () => {
    try {
      setLoadingPendingSubmissions(true);
      const response = await apiService.get(API_ENDPOINTS.dashboard.pendingTaskSubmissions);
      setPendingSubmissions(response.data.data || []);
    } catch (err) {
      console.error('Failed to load pending task submissions:', err);
      showError('Failed to load pending task submissions');
    } finally {
      setLoadingPendingSubmissions(false);
    }
  };

  const handleNotifyStudent = async (studentId, taskId) => {
    try {
      setNotifyingStudentId(studentId);
      await apiService.post(API_ENDPOINTS.dashboard.notifyStudentOverdue, {
        student_id: studentId,
        task_id: taskId,
      });
      success('Notification sent successfully to student');
    } catch (err) {
      console.error('Failed to notify student:', err);
      showError('Failed to send notification to student');
    } finally {
      setNotifyingStudentId(null);
    }
  };

  const loadStudentDashboardStats = async () => {
    try {
      const response = await apiService.get(API_ENDPOINTS.student.dashboardStats);
      setStats(response.data.data);
    } catch {
      showError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (rate) => {
    if (rate >= 80) return 'text-emerald-500';
    if (rate >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  if (isStudent && loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-border/40 bg-card/30 backdrop-blur-md">
        <div className="text-center">
          <Activity className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your learning hub…</p>
        </div>
      </div>
    );
  }

  if (isStudent && stats) {
    const overallPct = stats.performance?.breakdown?.calculation?.result
      ? parseFloat(String(stats.performance.breakdown.calculation.result).replace('%', '')) || 0
      : stats.performance?.overall_average ?? 0;
    const showAttendance = (stats.attendance?.total_days ?? 0) > 0;

    return (
      <div className={cn(DASHBOARD_PAGE_WRAP)}>
        <div className={DASHBOARD_ORB_L} aria-hidden />
        <div className={DASHBOARD_ORB_R} aria-hidden />
        <div className="relative z-10 space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-1 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Your learning space
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Hi,{' '}
                <span className="bg-gradient-to-r from-violet-600 to-sky-600 bg-clip-text text-transparent dark:from-violet-300 dark:to-sky-300">
                  {user?.name?.split(' ')[0] || 'Student'}
                </span>
              </h1>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Stay on top of tasks, quizzes, and deadlines—everything in one calm, glass-clear view.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <QuickAction icon={ClipboardList} label="Tasks" onClick={() => navigate('/dashboard/tasks')} />
              <QuickAction icon={Video} label="Videos" onClick={() => navigate('/dashboard/lecture-videos')} />
              <QuickAction icon={HelpCircle} label="Quizzes" onClick={() => navigate('/dashboard/quizzes')} />
              <QuickAction icon={Inbox} label="Inbox" onClick={() => navigate('/dashboard/inbox')} />
              <QuickAction
                icon={CalendarDays}
                label="Calendar"
                onClick={() => navigate('/dashboard/academic-calendar')}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div
              className={cn(
                DASHBOARD_GLASS_CARD,
                'border-l-4 border-l-violet-500 p-4'
              )}
            >
              <p className="text-xs font-medium text-muted-foreground">Tasks</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {stats.tasks?.completion_rate ?? 0}%
              </p>
              <p className="text-xs text-muted-foreground">Completion</p>
              {(stats.tasks?.pending ?? 0) > 0 && (
                <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                  {stats.tasks.pending} overdue — act soon
                </p>
              )}
            </div>
            <div className={cn(DASHBOARD_GLASS_CARD, 'border-l-4 border-l-sky-500 p-4')}>
              <p className="text-xs font-medium text-muted-foreground">Quizzes</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {stats.quizzes?.average_score ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Avg score</p>
            </div>
            <div className={cn(DASHBOARD_GLASS_CARD, 'border-l-4 border-l-emerald-500 p-4')}>
              <p className="text-xs font-medium text-muted-foreground">Videos</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{stats.videos?.total ?? 0}</p>
              <p className="text-xs text-muted-foreground">Available to you</p>
            </div>
            {showAttendance ? (
              <div className={cn(DASHBOARD_GLASS_CARD, 'border-l-4 border-l-orange-500 p-4')}>
                <p className="text-xs font-medium text-muted-foreground">Attendance</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {stats.attendance?.attendance_rate ?? 0}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.attendance?.present_days ?? 0} present / {stats.attendance?.total_days ?? 0} days
                </p>
              </div>
            ) : (
              <div className={cn(DASHBOARD_GLASS_CARD, 'flex flex-col justify-center border-l-4 border-l-primary/40 p-4')}>
                <p className="text-xs font-medium text-muted-foreground">Overall</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{overallPct}%</p>
                <p className="text-xs text-muted-foreground">Weighted performance</p>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
            <div className="space-y-4 lg:col-span-7">
              <UpcomingActivities />
            </div>
            <div className="space-y-4 lg:col-span-5">
              <Card className={cn(DASHBOARD_GLASS_CARD, 'border-l-4 border-l-amber-500')}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet className="h-5 w-5 text-amber-500" />
                    Fees & vouchers
                  </CardTitle>
                  <CardDescription>Pending payments and what&apos;s next</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tabular-nums text-foreground">
                    {stats.vouchers?.pending_count || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Pending vouchers</p>
                  {stats.vouchers?.upcoming_voucher && (
                    <div className="mt-4 rounded-xl border border-border/50 bg-muted/30 p-3 backdrop-blur-sm">
                      <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Next amount
                      </p>
                      <p className="text-sm font-semibold">
                        {formatCurrency(stats.vouchers.upcoming_voucher.fee_amount)}
                      </p>
                      <TaskCountdownTimer dueDate={stats.vouchers.upcoming_voucher.due_date} />
                      <p className="mt-1 text-[10px] text-muted-foreground opacity-70">
                        Due {new Date(stats.vouchers.upcoming_voucher.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {stats.vouchers?.pending_count === 0 && (
                    <p className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      All payments up to date
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className={DASHBOARD_GLASS_CARD}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Award className="h-5 w-5 text-amber-500" />
                      Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative mx-auto flex h-36 w-36 items-center justify-center rounded-full border-4 border-primary/20 bg-gradient-to-br from-primary/15 to-violet-500/10 shadow-inner">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-foreground">{overallPct}%</p>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">overall</p>
                      </div>
                    </div>
                    {stats.performance?.grade && stats.performance?.has_graded_activities && (
                      <p className="mt-3 text-center text-sm text-muted-foreground">
                        Grade:{' '}
                        <span className="font-semibold text-foreground">{stats.performance.grade}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card className={DASHBOARD_GLASS_CARD}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <PlayCircle className="h-5 w-5 text-sky-500" />
                      Lecture videos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <p className="text-4xl font-bold tabular-nums text-foreground">{stats.videos?.total || 0}</p>
                    <Button className="mt-4 w-full" onClick={() => navigate('/dashboard/lecture-videos')}>
                      <Video className="mr-2 h-4 w-4" />
                      Watch
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className={DASHBOARD_GLASS_CARD}>
              <CardHeader>
                <CardTitle className="text-base">Performance detail</CardTitle>
                <CardDescription>How your overall score is built</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.performance?.breakdown ? (
                  <div className="overflow-hidden rounded-xl border border-border/40 bg-muted/20 backdrop-blur-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/50">
                          <th className="px-3 py-2 text-left font-semibold">Area</th>
                          <th className="px-3 py-2 text-right font-semibold">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        <tr>
                          <td className="px-3 py-2">{stats.performance.breakdown.tasks.label}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            {stats.performance.breakdown.tasks.percentage}%
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2">{stats.performance.breakdown.quizzes.label}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            {stats.performance.breakdown.quizzes.percentage}%
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2">{stats.performance.breakdown.class_participations.label}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            {stats.performance.breakdown.class_participations.percentage}%
                          </td>
                        </tr>
                        <tr className="bg-primary/10 font-semibold text-primary">
                          <td className="px-3 py-2">Overall</td>
                          <td className="px-3 py-2 text-right">{stats.performance.breakdown.calculation.result}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="py-6 text-center text-muted-foreground">
                    {stats.performance?.remarks ||
                      'Complete tasks and quizzes to see your full breakdown here.'}
                  </p>
                )}
                {stats.performance?.remarks && stats.performance?.has_graded_activities && (
                  <p className="mt-3 rounded-lg border border-border/40 bg-card/30 p-3 text-sm text-muted-foreground backdrop-blur-sm">
                    {stats.performance.remarks}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className={DASHBOARD_GLASS_CARD}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LayoutList className="h-5 w-5" />
                    Recent activity
                  </CardTitle>
                  <CardDescription>Latest from your assignments</CardDescription>
                </div>
                <div className="flex rounded-lg border border-border/50 bg-muted/20 p-0.5 text-xs backdrop-blur-sm">
                  <button
                    type="button"
                    className={cn(
                      'rounded-md px-2 py-1 font-medium transition-colors',
                      studentActivityTab === 'tasks' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                    )}
                    onClick={() => setStudentActivityTab('tasks')}
                  >
                    Tasks
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'rounded-md px-2 py-1 font-medium transition-colors',
                      studentActivityTab === 'quizzes' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                    )}
                    onClick={() => setStudentActivityTab('quizzes')}
                  >
                    Quizzes
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {studentActivityTab === 'tasks' ? (
                  <div className="space-y-2">
                    {stats.recent_activity?.tasks?.length ? (
                      stats.recent_activity.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between rounded-xl border border-border/30 bg-card/30 p-3 backdrop-blur-sm transition-colors hover:bg-card/50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(task.created_at)}</p>
                          </div>
                          {task.is_submitted ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="py-8 text-center text-sm text-muted-foreground">No recent tasks</p>
                    )}
                    <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard/tasks')}>
                      All tasks
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stats.recent_activity?.quizzes?.length ? (
                      stats.recent_activity.quizzes.map((quiz) => (
                        <div
                          key={quiz.id}
                          className="flex items-center justify-between rounded-xl border border-border/30 bg-card/30 p-3 backdrop-blur-sm transition-colors hover:bg-card/50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{quiz.title}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(quiz.created_at)}</p>
                          </div>
                          {quiz.is_completed ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                          ) : (
                            <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="py-8 text-center text-sm text-muted-foreground">No recent quizzes</p>
                    )}
                    <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard/quizzes')}>
                      All quizzes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-border/40 bg-card/30 backdrop-blur-md">
        <div className="text-center">
          <Activity className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading command center…</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-border/40 py-12 text-center backdrop-blur-md">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    );
  }

  const { overview, growth, user_types, recent_activity } = stats;

  const mainStats = [
    {
      title: 'Learners',
      value: formatNumber(overview.total_users),
      hint: `${overview.active_users} active · ${overview.blocked_users} blocked`,
      icon: Users,
      accent: 'from-blue-500/20 to-blue-600/5 border-blue-500/40',
      trend: growth.users.percentage,
      link: '/dashboard/users',
    },
    {
      title: 'Batches',
      value: formatNumber(overview.total_batches),
      hint: `${overview.active_batches} running`,
      icon: GraduationCap,
      accent: 'from-violet-500/20 to-violet-600/5 border-violet-500/40',
      trend: growth.batches.percentage,
      link: '/dashboard/batches',
    },
    {
      title: 'Subjects',
      value: formatNumber(overview.total_subjects),
      hint: `${overview.active_subjects} active`,
      icon: BookOpen,
      accent: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/40',
      trend: null,
      link: '/dashboard/subjects',
    },
    {
      title: 'Videos',
      value: formatNumber(overview.total_videos),
      hint: `${overview.internal_videos} internal · ${overview.external_videos} external`,
      icon: Video,
      accent: 'from-orange-500/20 to-orange-600/5 border-orange-500/40',
      trend: growth.videos.percentage,
      link: '/dashboard/videos',
    },
    {
      title: 'Assignments',
      value: formatNumber(overview.total_video_assignments ?? 0),
      hint: 'Videos linked to batch subjects',
      icon: Link2,
      accent: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/40',
      trend: null,
      link: '/dashboard/videos',
    },
  ];

  const pieData = (user_types || []).map((t) => ({ name: t.type, value: t.count }));

  return (
    <div className={cn(DASHBOARD_PAGE_WRAP)}>
      <div className={DASHBOARD_ORB_L} aria-hidden />
      <div className={DASHBOARD_ORB_R} aria-hidden />
      <div className="relative z-10 space-y-8 p-4 sm:p-6 lg:p-8">
        <div className={cn(DASHBOARD_GLASS_SHELL, 'border-white/20 dark:border-white/5')}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-1 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
                <PieChartIcon className="h-3.5 w-3.5" />
                Admin command center
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Welcome back,{' '}
                <span className="bg-gradient-to-r from-violet-600 to-sky-600 bg-clip-text text-transparent dark:from-violet-300 dark:to-sky-300">
                  {user?.name?.split(' ')[0] || 'Admin'}
                </span>
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Enrollment health, delivery pipeline, and student follow-ups—prioritized for daily operations.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <QuickAction icon={UserCheck} label="Users" onClick={() => navigate('/dashboard/users')} />
              <QuickAction icon={GraduationCap} label="Batches" onClick={() => navigate('/dashboard/batches')} />
              <QuickAction icon={Wallet} label="Vouchers" onClick={() => navigate('/dashboard/fee-vouchers')} />
              <QuickAction
                icon={ClipboardList}
                label="Pending work"
                onClick={() => navigate('/dashboard/pending-task-submissions')}
              />
              <QuickAction icon={Inbox} label="Inbox" onClick={() => navigate('/dashboard/inbox')} />
              <QuickAction
                icon={CalendarDays}
                label="Calendar"
                onClick={() => navigate('/dashboard/academic-calendar')}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {mainStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <button
                key={stat.title}
                type="button"
                onClick={() => navigate(stat.link)}
                className={cn(
                  DASHBOARD_GLASS_CARD,
                  'group cursor-pointer border border-border/40 bg-gradient-to-br p-5 text-left ring-1 ring-transparent transition-all hover:ring-primary/20',
                  stat.accent
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
                  </div>
                  <div className="rounded-xl bg-background/60 p-2.5 shadow-inner backdrop-blur-md dark:bg-background/40">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                {stat.trend != null && (
                  <div className={cn('mt-3 flex items-center gap-1 text-xs font-medium', getStatusColor(stat.trend))}>
                    {stat.trend > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {Math.abs(stat.trend).toFixed(1)}% <span className="font-normal text-muted-foreground">vs prior 30d</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <Card className={cn(DASHBOARD_GLASS_CARD, 'lg:col-span-7')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Student follow-up
              </CardTitle>
              <CardDescription>Overdue task submissions — notify or drill into the list</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPendingSubmissions ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : pendingSubmissions.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 text-center backdrop-blur-sm">
                  <CheckCircle2 className="mb-2 h-10 w-10 text-emerald-500/70" />
                  <p className="font-medium text-foreground">No overdue submissions right now</p>
                  <p className="text-sm text-muted-foreground">Great job staying on top of tasks.</p>
                </div>
              ) : (
                <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                  {pendingSubmissions.slice(0, 8).map((submission) => (
                    <div
                      key={submission.id}
                      className="flex flex-col gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{submission.student_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{submission.student_email}</p>
                        <p className="mt-1 text-xs font-medium">Task: {submission.task_title}</p>
                        {submission.task_expiry_date && (
                          <p className="text-xs text-muted-foreground">
                            Due {new Date(submission.task_expiry_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 border-red-500/30"
                        onClick={() => handleNotifyStudent(submission.student_id, submission.task_id)}
                        disabled={notifyingStudentId === submission.student_id}
                      >
                        {notifyingStudentId === submission.student_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                        <span className="ml-1">Nudge</span>
                      </Button>
                    </div>
                  ))}
                  <Button variant="secondary" className="w-full" onClick={() => navigate('/dashboard/pending-task-submissions')}>
                    Open full overdue queue
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={cn(DASHBOARD_GLASS_CARD, 'lg:col-span-5')}>
            <CardHeader>
              <CardTitle className="text-lg">Role mix</CardTitle>
              <CardDescription>Active assignments across user types</CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={3}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={`${entry.name}-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card) / 0.95)',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          backdropFilter: 'blur(8px)',
                        }}
                      />
                      <RechartsLegend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-12 text-center text-muted-foreground">No role distribution data</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className={DASHBOARD_GLASS_CARD}>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5" />
                  Where students hear about you
                </CardTitle>
                <CardDescription>Signup sources — tune campaigns and intake</CardDescription>
              </div>
              <div className="relative filter-dropdown-container">
                <button
                  type="button"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={cn(DASHBOARD_GLASS_PILL, 'text-xs')}
                >
                  {trendingFilter === 'today'
                    ? 'Today'
                    : trendingFilter === 'yesterday'
                      ? 'Yesterday'
                      : trendingFilter === 'last_15_days'
                        ? 'Last 15 days'
                        : trendingFilter === 'this_month'
                          ? 'This month'
                          : trendingFilter === 'last_month'
                            ? 'Last month'
                            : 'All time'}
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showFilterDropdown && (
                  <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-border/50 bg-card/95 shadow-xl backdrop-blur-xl">
                    {[
                      { value: 'today', label: 'Today' },
                      { value: 'yesterday', label: 'Yesterday' },
                      { value: 'last_15_days', label: 'Last 15 days' },
                      { value: 'this_month', label: 'This month' },
                      { value: 'last_month', label: 'Last month' },
                      { value: 'all_time', label: 'All time' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setTrendingFilter(option.value);
                          setShowFilterDropdown(false);
                        }}
                        className={cn(
                          'w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent/80',
                          trendingFilter === option.value && 'bg-accent font-medium'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTrending ? (
              <div className="flex h-56 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : trendingData.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">No signup keywords in this range</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendingData} margin={{ top: 8, right: 8, left: 8, bottom: 48 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                    <XAxis
                      dataKey="keyword"
                      angle={-35}
                      textAnchor="end"
                      height={70}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted) / 0.15)' }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card) / 0.95)',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Signups" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <div className={cn(DASHBOARD_GLASS_SHELL)}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Activity className="h-5 w-5 text-primary" />
            Latest across the platform
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">People</p>
              <div className="space-y-2">
                {recent_activity.users?.length ? (
                  recent_activity.users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between rounded-xl border border-border/35 bg-card/40 px-3 py-2 backdrop-blur-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{formatDate(u.created_at)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recent registrations</p>
                )}
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate('/dashboard/users')}>
                Users
              </Button>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batches</p>
              <div className="space-y-2">
                {recent_activity.batches?.length ? (
                  recent_activity.batches.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-xl border border-border/35 bg-card/40 px-3 py-2 backdrop-blur-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{b.title}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          {b.active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{formatDate(b.created_at)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No batches yet</p>
                )}
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate('/dashboard/batches')}>
                Batches
              </Button>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Videos</p>
              <div className="space-y-2">
                {recent_activity.videos?.length ? (
                  recent_activity.videos.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-xl border border-border/35 bg-card/40 px-3 py-2 backdrop-blur-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{v.title}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          {v.source_type === 'internal' ? (
                            <>
                              <FileVideo className="h-3 w-3" /> Internal
                            </>
                          ) : (
                            <>
                              <Link2 className="h-3 w-3" /> External
                            </>
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{formatDate(v.created_at)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No uploads yet</p>
                )}
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate('/dashboard/videos')}>
                Library
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
