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
  UserX,
  FolderOpen,
  FileVideo,
  Link2,
  ArrowRight,
  Clock,
  Activity,
  ClipboardList,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  Award,
  Target,
  PlayCircle,
  AlertCircle,
} from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/toast';

// Countdown timer component for nearest task
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
        // Parse due date - handle both date-only and datetime formats
        let due = new Date(dueDate);
        
        // If the date is invalid, return
        if (isNaN(due.getTime())) {
          console.warn('Invalid date received:', dueDate);
          setTimeLeft(null);
          setIsExpired(false);
          return;
        }

        // Check if it's a date-only format (YYYY-MM-DD) and set to end of day
        const dateStr = String(dueDate);
        // If the string is just a date (10 chars: YYYY-MM-DD) or doesn't have time info
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/) || (!dateStr.includes('T') && !dateStr.includes(' ') && dateStr.length <= 10)) {
          // It's a date-only format, set to end of day (23:59:59)
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
      } catch (error) {
        console.error('Error calculating countdown:', error, 'dueDate:', dueDate);
        setTimeLeft(null);
        setIsExpired(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [dueDate]);

  if (isExpired) {
    return (
      <div className="text-xs text-red-500 font-medium">
        Expired
      </div>
    );
  }

  if (!timeLeft) {
    return (
      <div className="text-xs text-muted-foreground">
        Calculating...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {timeLeft.days > 0 && (
        <span className="px-2 py-1 bg-blue-500/10 text-blue-600 rounded font-semibold">
          {timeLeft.days}d
        </span>
      )}
      <span className="px-2 py-1 bg-orange-500/10 text-orange-600 rounded font-semibold">
        {String(timeLeft.hours).padStart(2, '0')}h
      </span>
      <span className="px-2 py-1 bg-yellow-500/10 text-yellow-600 rounded font-semibold">
        {String(timeLeft.minutes).padStart(2, '0')}m
      </span>
      <span className="px-2 py-1 bg-green-500/10 text-green-600 rounded font-semibold">
        {String(timeLeft.seconds).padStart(2, '0')}s
      </span>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const { error: showError } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is student
  const isStudent = user?.roles?.some(role => role.title?.toLowerCase() === 'student') || 
                   user?.user_type_title?.toLowerCase() === 'student';

  useEffect(() => {
    if (isStudent) {
      loadStudentDashboardStats();
    } else {
      loadDashboardStats();
    }
  }, [isStudent]);

  const loadDashboardStats = async () => {
    try {
      const response = await apiService.get(API_ENDPOINTS.dashboard.stats);
      setStats(response.data.data);
    } catch (err) {
      showError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentDashboardStats = async () => {
    try {
      const response = await apiService.get(API_ENDPOINTS.student.dashboardStats);
      setStats(response.data.data);
    } catch (err) {
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
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (rate) => {
    if (rate >= 80) return 'text-green-500';
    if (rate >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusBgColor = (rate) => {
    if (rate >= 80) return 'bg-green-500/10';
    if (rate >= 60) return 'bg-yellow-500/10';
    return 'bg-red-500/10';
  };

  // Show empty dashboard for students (will be replaced with student stats)
  if (isStudent && loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (isStudent && stats) {
    return (
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user?.name || 'Student'}! 👋
            </h1>
            <p className="text-muted-foreground mt-2">
              Here's your learning progress and statistics
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Last updated</p>
            <p className="text-sm font-medium">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Tasks Card */}
          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tasks
              </CardTitle>
              <div className="bg-blue-500/10 p-2 rounded-lg">
                <ClipboardList className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground mb-1">
                {stats.tasks?.submitted || 0} / {stats.tasks?.total || 0}
              </div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">
                  {stats.tasks?.pending || 0} pending
                </p>
                <div className={`text-xs font-medium ${getStatusColor(stats.tasks?.completion_rate || 0)}`}>
                  {stats.tasks?.completion_rate || 0}%
                </div>
              </div>
              {stats.tasks?.nearest_due_date && (
                <div className="mb-2 p-2 bg-muted/50 rounded-md border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Most Recent Pending Task:
                  </p>
                  <TaskCountdownTimer dueDate={stats.tasks.nearest_due_date} />
                  {/* Debug: Show the date value to help diagnose */}
                  <p className="text-xs text-muted-foreground mt-1 opacity-50">
                    Due: {new Date(stats.tasks.nearest_due_date).toLocaleString()}
                  </p>
                </div>
              )}
              <div className="mt-2 w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    (stats.tasks?.completion_rate || 0) >= 80 ? 'bg-green-500' :
                    (stats.tasks?.completion_rate || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${stats.tasks?.completion_rate || 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quizzes Card */}
          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quizzes
              </CardTitle>
              <div className="bg-purple-500/10 p-2 rounded-lg">
                <HelpCircle className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground mb-1">
                {stats.quizzes?.completed || 0} / {stats.quizzes?.total || 0}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {stats.quizzes?.pending || 0} pending
                </p>
                <div className={`text-xs font-medium ${getStatusColor(stats.quizzes?.completion_rate || 0)}`}>
                  {stats.quizzes?.completion_rate || 0}%
                </div>
              </div>
              <div className="mt-2 w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    (stats.quizzes?.completion_rate || 0) >= 80 ? 'bg-green-500' :
                    (stats.quizzes?.completion_rate || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${stats.quizzes?.completion_rate || 0}%` }}
                />
              </div>
              {stats.quizzes?.average_score > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Avg Score: {stats.quizzes?.average_score}%
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tests Card */}
          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tests
              </CardTitle>
              <div className="bg-green-500/10 p-2 rounded-lg">
                <Target className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground mb-1">
                {stats.tests?.completed || 0} / {stats.tests?.total || 0}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {stats.tests?.pending || 0} pending
                </p>
                <div className={`text-xs font-medium ${getStatusColor(stats.tests?.completion_rate || 0)}`}>
                  {stats.tests?.completion_rate || 0}%
                </div>
              </div>
              <div className="mt-2 w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    (stats.tests?.completion_rate || 0) >= 80 ? 'bg-green-500' :
                    (stats.tests?.completion_rate || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${stats.tests?.completion_rate || 0}%` }}
                />
              </div>
              {stats.tests?.average_score > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Avg Score: {stats.tests?.average_score}%
                </p>
              )}
            </CardContent>
          </Card>

          {/* Attendance Card */}
          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Attendance
              </CardTitle>
              <div className="bg-orange-500/10 p-2 rounded-lg">
                <Calendar className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground mb-1">
                {stats.attendance?.attendance_rate || 0}%
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {stats.attendance?.present_days || 0} present
                </p>
                <p className="text-xs text-red-500">
                  {stats.attendance?.absent_days || 0} absent
                </p>
              </div>
              <div className="mt-2 w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    (stats.attendance?.attendance_rate || 0) >= 80 ? 'bg-green-500' :
                    (stats.attendance?.attendance_rate || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${stats.attendance?.attendance_rate || 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total: {stats.attendance?.total_days || 0} days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance and Videos Row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Overall Performance */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Overall Performance
              </CardTitle>
              <CardDescription>Your academic performance summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="text-5xl font-bold text-foreground mb-2">
                    {stats.performance?.overall_average || 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">Overall Average</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">
                      {stats.performance?.quiz_average || 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">Quiz Average</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {stats.performance?.test_average || 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">Test Average</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Videos Available */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-blue-500" />
                Lecture Videos
              </CardTitle>
              <CardDescription>Access your assigned videos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <div className="text-5xl font-bold text-foreground mb-2">
                  {stats.videos?.total || 0}
                </div>
                <p className="text-sm text-muted-foreground mb-4">Videos Available</p>
                <Button
                  onClick={() => navigate('/dashboard/lecture-videos')}
                  className="w-full"
                >
                  <Video className="mr-2 h-4 w-4" />
                  View All Videos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Recent Tasks
              </CardTitle>
              <CardDescription>Your latest assigned tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recent_activity?.tasks && stats.recent_activity.tasks.length > 0 ? (
                  stats.recent_activity.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {task.title}
                          </p>
                          {task.is_submitted ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(task.created_at)}
                        </p>
                      </div>
                      <div className="ml-2">
                        {task.is_submitted ? (
                          <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">
                            Submitted
                          </span>
                        ) : (
                          <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent tasks
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate('/dashboard/tasks')}
              >
                View All Tasks
              </Button>
            </CardContent>
          </Card>

          {/* Recent Quizzes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Recent Quizzes
              </CardTitle>
              <CardDescription>Your latest quizzes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recent_activity?.quizzes && stats.recent_activity.quizzes.length > 0 ? (
                  stats.recent_activity.quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {quiz.title}
                          </p>
                          {quiz.is_completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(quiz.created_at)}
                        </p>
                      </div>
                      <div className="ml-2">
                        {quiz.is_completed ? (
                          <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">
                            Completed
                          </span>
                        ) : (
                          <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent quizzes
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate('/dashboard/quizzes')}
              >
                View All Quizzes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Admin Dashboard (existing code)
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    );
  }

  const { overview, growth, user_types, recent_activity } = stats;

  const mainStats = [
    {
      title: 'Total Users',
      value: formatNumber(overview.total_users),
      description: `${overview.active_users} active, ${overview.blocked_users} blocked`,
      icon: Users,
      color: 'bg-blue-500',
      trend: growth.users.percentage,
      link: '/dashboard/users',
    },
    {
      title: 'Total Batches',
      value: formatNumber(overview.total_batches),
      description: `${overview.active_batches} active batches`,
      icon: GraduationCap,
      color: 'bg-purple-500',
      trend: growth.batches.percentage,
      link: '/dashboard/batches',
    },
    {
      title: 'Total Subjects',
      value: formatNumber(overview.total_subjects),
      description: `${overview.active_subjects} active subjects`,
      icon: BookOpen,
      color: 'bg-green-500',
      trend: null,
      link: '/dashboard/subjects',
    },
    {
      title: 'Total Videos',
      value: formatNumber(overview.total_videos),
      description: `${overview.internal_videos} internal, ${overview.external_videos} external`,
      icon: Video,
      color: 'bg-orange-500',
      trend: growth.videos.percentage,
      link: '/dashboard/videos',
    },
  ];

  const quickActions = [
    { label: 'Manage Users', icon: Users, link: '/dashboard/users', color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Manage Batches', icon: GraduationCap, link: '/dashboard/batches', color: 'bg-purple-500/10 text-purple-500' },
    { label: 'Manage Subjects', icon: BookOpen, link: '/dashboard/subjects', color: 'bg-green-500/10 text-green-500' },
    { label: 'Manage Videos', icon: Video, link: '/dashboard/videos', color: 'bg-orange-500/10 text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user?.name || 'User'}! 👋
          </h1>
          <p className="text-muted-foreground mt-2">
            Here's what's happening with your LMS today.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Last updated</p>
          <p className="text-sm font-medium">{new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {mainStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.title} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(stat.link)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.color} p-2 rounded-lg`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {stat.value}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                  {stat.trend !== null && (
                    <div className={`flex items-center gap-1 text-xs ${getStatusColor(stat.trend)}`}>
                      {stat.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span>{Math.abs(stat.trend).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
                {stat.trend !== null && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {stat.trend > 0 ? '↑' : stat.trend < 0 ? '↓' : '→'} Last 30 days
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts and Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* User Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">User Types Distribution</CardTitle>
            <CardDescription>Breakdown by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user_types && user_types.length > 0 ? (
                user_types.map((type, index) => {
                  const total = user_types.reduce((sum, t) => sum + t.count, 0);
                  const percentage = total > 0 ? (type.count / total) * 100 : 0;
                  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500'];
                  return (
                    <div key={type.type} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{type.type}</span>
                        <span className="text-muted-foreground">{type.count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`${colors[index % colors.length]} h-2 rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No user types data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Video Source Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Video Sources</CardTitle>
            <CardDescription>Internal vs External</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <FileVideo className="h-4 w-4 text-blue-500" />
                    <span>Internal Videos</span>
                  </div>
                  <span className="font-medium">{overview.internal_videos}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all"
                    style={{ 
                      width: `${overview.total_videos > 0 ? (overview.internal_videos / overview.total_videos) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-orange-500" />
                    <span>External Videos</span>
                  </div>
                  <span className="font-medium">{overview.external_videos}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-orange-500 h-3 rounded-full transition-all"
                    style={{ 
                      width: `${overview.total_videos > 0 ? (overview.external_videos / overview.total_videos) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quickActions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.link)}
                    className="w-full flex items-center gap-3 px-4 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                  >
                    <div className={action.color + ' p-2 rounded-lg'}>
                      <ActionIcon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium flex-1">{action.label}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Recent Users
            </CardTitle>
            <CardDescription>Latest registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recent_activity.users && recent_activity.users.length > 0 ? (
                recent_activity.users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(user.created_at)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent users</p>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => navigate('/dashboard/users')}
            >
              View All Users
            </Button>
          </CardContent>
        </Card>

        {/* Recent Batches */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Recent Batches
            </CardTitle>
            <CardDescription>Latest created batches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recent_activity.batches && recent_activity.batches.length > 0 ? (
                recent_activity.batches.map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {batch.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {batch.active ? (
                          <span className="text-green-500">Active</span>
                        ) : (
                          <span className="text-muted-foreground">Inactive</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(batch.created_at)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent batches</p>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => navigate('/dashboard/batches')}
            >
              View All Batches
            </Button>
          </CardContent>
        </Card>

        {/* Recent Videos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Video className="h-4 w-4" />
              Recent Videos
            </CardTitle>
            <CardDescription>Latest uploaded videos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recent_activity.videos && recent_activity.videos.length > 0 ? (
                recent_activity.videos.map((video) => (
                  <div key={video.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {video.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {video.source_type === 'internal' ? (
                          <span className="flex items-center gap-1">
                            <FileVideo className="h-3 w-3" />
                            Internal
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Link2 className="h-3 w-3" />
                            External
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(video.created_at)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent videos</p>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => navigate('/dashboard/videos')}
            >
              View All Videos
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
