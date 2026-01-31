import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { 
  ClipboardList, 
  HelpCircle, 
  Users, 
  Clock, 
  Calendar,
  ArrowRight,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from './ui/toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

// Reusable countdown timer component
const CountdownTimer = ({ dueDate, type = 'default' }) => {
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
        const dateStr = String(dueDate);
        
        // Check if it's a date-only format (YYYY-MM-DD)
        const isDateOnly = dateStr.match(/^\d{4}-\d{2}-\d{2}$/) || 
                          (!dateStr.includes('T') && !dateStr.includes(' ') && dateStr.length <= 10);
        
        let due;
        if (isDateOnly) {
          // For date-only formats, parse as local date and set to end of day (23:59:59.999)
          // This ensures if due_date is 26/01/2026, timer counts until 26/01/2026 23:59:59.999
          // and expires at 27/01/2026 00:00:00
          const [year, month, day] = dateStr.split('-').map(Number);
          due = new Date(year, month - 1, day, 23, 59, 59, 999);
        } else {
          // For datetime formats, parse normally
          due = new Date(dueDate);
          
          // If it's a datetime with time 00:00:00, treat it as end of that day
          if (due.getHours() === 0 && due.getMinutes() === 0 && due.getSeconds() === 0 && due.getMilliseconds() === 0) {
            due.setHours(23, 59, 59, 999);
          }
        }
        
        if (isNaN(due.getTime())) {
          setTimeLeft(null);
          setIsExpired(false);
          return;
        }
        
        const diff = due - now;

        // Task expires at 00:00:01 AM of the next day (27/01/2026 00:00:01)
        // So we check if current time is past the end of due date
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
        console.error('Error calculating countdown:', error);
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
      <div className="flex items-center gap-2 text-xs font-medium text-red-500">
        <Clock className="h-3 w-3" />
        <span>Expired</span>
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

  const timerClasses = type === 'compact' 
    ? "flex items-center gap-1 text-xs"
    : "flex items-center gap-1.5 text-sm";

  return (
    <div className={timerClasses}>
      {timeLeft.days > 0 && (
        <span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md font-semibold">
          {timeLeft.days}d
        </span>
      )}
      <span className="px-2 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-md font-semibold">
        {String(timeLeft.hours).padStart(2, '0')}h
      </span>
      <span className="px-2 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-md font-semibold">
        {String(timeLeft.minutes).padStart(2, '0')}m
      </span>
      <span className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-md font-semibold">
        {String(timeLeft.seconds).padStart(2, '0')}s
      </span>
    </div>
  );
};

const UpcomingActivities = () => {
  const navigate = useNavigate();
  const { error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [upcomingQuizzes, setUpcomingQuizzes] = useState([]);
  const [upcomingCPs, setUpcomingCPs] = useState([]);

  useEffect(() => {
    loadUpcomingActivities();
  }, []);

  const loadUpcomingActivities = async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [tasksRes, quizzesRes, cpsRes] = await Promise.all([
        apiService.get(API_ENDPOINTS.student.tasks.list, { params: { status: 'pending' } }).catch(() => ({ data: { data: { tasks: [] } } })),
        apiService.get(API_ENDPOINTS.student.quizzes, { params: {} }).catch(() => ({ data: { data: { quizzes: [] } } })),
        apiService.get(API_ENDPOINTS.student.classParticipations, { params: {} }).catch(() => ({ data: { data: { participations: [] } } })),
      ]);

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // Filter and sort upcoming tasks
      const tasks = tasksRes.data.data?.tasks || [];
      const upcomingTasksFiltered = tasks
        .filter(task => {
          if (!task.expiry_date) return false;
          const dueDate = new Date(task.expiry_date);
          // Set to end of day (23:59:59.999) to match countdown timer logic
          // This ensures tasks are shown until the end of the due date
          dueDate.setHours(23, 59, 59, 999);
          // Include tasks that haven't expired yet (dueDate >= now) and aren't submitted
          return dueDate >= now && !task.is_submitted;
        })
        .sort((a, b) => {
          const dateA = new Date(a.expiry_date);
          const dateB = new Date(b.expiry_date);
          return dateA - dateB;
        })
        .slice(0, 5); // Show top 5 upcoming tasks
      setUpcomingTasks(upcomingTasksFiltered);

      // Filter and sort upcoming quizzes
      const quizzes = quizzesRes.data.data?.quizzes || [];
      const upcomingQuizzesFiltered = quizzes
        .filter(quiz => {
          if (!quiz.quiz_date) return false;
          const quizDate = new Date(quiz.quiz_date);
          quizDate.setHours(0, 0, 0, 0);
          return quizDate >= now && !quiz.has_mark;
        })
        .sort((a, b) => {
          const dateA = new Date(a.quiz_date);
          const dateB = new Date(b.quiz_date);
          return dateA - dateB;
        })
        .slice(0, 5); // Show top 5 upcoming quizzes
      setUpcomingQuizzes(upcomingQuizzesFiltered);

      // Filter and sort upcoming class participations
      const participations = cpsRes.data.data?.participations || [];
      const upcomingCPsFiltered = participations
        .filter(cp => {
          if (!cp.participation_date) return false;
          const cpDate = new Date(cp.participation_date);
          cpDate.setHours(0, 0, 0, 0);
          return cpDate >= now && !cp.has_mark;
        })
        .sort((a, b) => {
          const dateA = new Date(a.participation_date);
          const dateB = new Date(b.participation_date);
          return dateA - dateB;
        })
        .slice(0, 5); // Show top 5 upcoming CPs
      setUpcomingCPs(upcomingCPsFiltered);

    } catch (err) {
      console.error('Error loading upcoming activities:', err);
      showError('Failed to load upcoming activities');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const totalUpcoming = upcomingTasks.length + upcomingQuizzes.length + upcomingCPs.length;

  if (loading) {
    return (
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">My Upcoming Activities</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {totalUpcoming > 0 
                  ? `${totalUpcoming} upcoming ${totalUpcoming === 1 ? 'activity' : 'activities'}`
                  : 'No upcoming activities'
                }
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {totalUpcoming === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">All caught up!</p>
            <p className="text-sm text-muted-foreground mt-2">You have no upcoming activities at the moment.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Upcoming Tasks */}
            {upcomingTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/10 rounded-md">
                      <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-lg">Upcoming Tasks</h3>
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full">
                      {upcomingTasks.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/dashboard/tasks')}
                    className="text-xs"
                  >
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {upcomingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {task.title || 'Untitled Task'}
                          </h4>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {formatDate(task.expiry_date)}
                            </span>
                            {task.batch?.title && (
                              <span className="truncate">
                                {task.batch.title}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <CountdownTimer dueDate={task.expiry_date} type="compact" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Quizzes */}
            {upcomingQuizzes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/10 rounded-md">
                      <HelpCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-lg">Upcoming Quizzes</h3>
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-medium rounded-full">
                      {upcomingQuizzes.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/dashboard/quizzes')}
                    className="text-xs"
                  >
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {upcomingQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {quiz.title || 'Untitled Quiz'}
                          </h4>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Date: {formatDate(quiz.quiz_date)}
                            </span>
                            {quiz.batch?.title && (
                              <span className="truncate">
                                {quiz.batch.title}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <CountdownTimer dueDate={quiz.quiz_date} type="compact" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Class Participations */}
            {upcomingCPs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-500/10 rounded-md">
                      <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-semibold text-lg">Upcoming Class Participations</h3>
                    <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium rounded-full">
                      {upcomingCPs.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/dashboard/class-participations')}
                    className="text-xs"
                  >
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {upcomingCPs.map((cp) => (
                    <div
                      key={cp.id}
                      className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {cp.title || 'Untitled Participation'}
                          </h4>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Date: {formatDate(cp.participation_date)}
                            </span>
                            {cp.batch?.title && (
                              <span className="truncate">
                                {cp.batch.title}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <CountdownTimer dueDate={cp.participation_date} type="compact" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingActivities;

