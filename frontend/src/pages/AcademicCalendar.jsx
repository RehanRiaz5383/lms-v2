import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  parseISO,
  isValid,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { Loader2, ChevronLeft, ChevronRight, ClipboardList, GraduationCap, Users, X } from 'lucide-react';
import { useAppSelector } from '../hooks/redux';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { cn } from '../utils/cn';

function toDateKey(value) {
  if (!value) return null;
  try {
    const raw = typeof value === 'string' ? value.split('T')[0] : value;
    const d = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
    if (!isValid(d)) return null;
    return format(d, 'yyyy-MM-dd');
  } catch {
    return null;
  }
}

function isStudentUser(user) {
  if (!user) return false;
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.some(
      (role) => role.title?.toLowerCase() === 'student' || role.id == 2
    );
  }
  return user.user_type == 2 || user.user_type_title?.toLowerCase() === 'student';
}

/** Batch · subject on second line (no subject → batch-level), all roles */
function batchSubjectLine(batch, subject) {
  const batchTitle = batch?.title?.trim() || '—';
  const subjectTitle = subject?.title?.trim() || 'Batch-level';
  return `${batchTitle} · ${subjectTitle}`;
}

const WEEK_STARTS_ON = 1;

export default function AcademicCalendar() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { error: showError } = useToast();
  const studentView = useMemo(() => isStudentUser(user), [user]);

  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [participations, setParticipations] = useState([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (studentView) {
        const [tasksRes, quizzesRes, cpRes] = await Promise.all([
          apiService.get(API_ENDPOINTS.student.tasks.list, { params: { status: 'all' } }),
          apiService.get(API_ENDPOINTS.student.quizzes, {}),
          apiService.get(API_ENDPOINTS.student.classParticipations, {}),
        ]);
        const tData = tasksRes.data?.data || {};
        const qData = quizzesRes.data?.data || {};
        const cData = cpRes.data?.data || {};
        setTasks(tData.tasks || []);
        setQuizzes(qData.quizzes || []);
        setParticipations(cData.participations || []);
      } else {
        const [tasksRes, quizzesRes, cpRes] = await Promise.all([
          apiService.get(API_ENDPOINTS.tasks.list, {}),
          apiService.get(API_ENDPOINTS.quizzes.list, {}),
          apiService.get(API_ENDPOINTS.classParticipations.list, {}),
        ]);
        const t = tasksRes.data?.data;
        const q = quizzesRes.data?.data;
        const c = cpRes.data?.data;
        setTasks(Array.isArray(t) ? t : []);
        setQuizzes(Array.isArray(q) ? q : []);
        setParticipations(Array.isArray(c) ? c : []);
      }
    } catch {
      showError('Could not load calendar data');
    } finally {
      setLoading(false);
    }
  }, [user, studentView, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const eventsByDate = useMemo(() => {
    const map = {};
    const push = (dateKey, item) => {
      if (!dateKey) return;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(item);
    };

    tasks.forEach((task) => {
      const key = toDateKey(task.due_date || task.expiry_date);
      const batch = task.batch;
      const subject = task.subject;
      const line = batchSubjectLine(batch, subject);
      push(key, {
        type: 'task',
        id: task.id,
        title: task.title || 'Assignment',
        subtitle: line,
        detailLine: line,
        batchId: batch?.id ?? task.batch_id,
      });
    });

    quizzes.forEach((quiz) => {
      const key = toDateKey(quiz.quiz_date);
      const batch = quiz.batch;
      const subject = quiz.subject;
      const line = batchSubjectLine(batch, subject);
      push(key, {
        type: 'quiz',
        id: quiz.id,
        title: quiz.title || 'Quiz',
        subtitle: line,
        detailLine: line,
        batchId: batch?.id ?? quiz.batch_id,
      });
    });

    participations.forEach((cp) => {
      const key = toDateKey(cp.participation_date);
      const batch = cp.batch;
      const subject = cp.subject;
      const line = batchSubjectLine(batch, subject);
      push(key, {
        type: 'cp',
        id: cp.id,
        title: cp.title || 'Class participation',
        subtitle: line,
        detailLine: line,
        batchId: batch?.id ?? cp.batch_id,
      });
    });

    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => {
        const byTitle = a.title.localeCompare(b.title);
        if (byTitle !== 0) return byTitle;
        return (a.detailLine || '').localeCompare(b.detailLine || '');
      });
    });
    return map;
  }, [tasks, quizzes, participations]);

  const monthGrid = useMemo(() => {
    const start = startOfWeek(startOfMonth(displayMonth), { weekStartsOn: WEEK_STARTS_ON });
    const end = endOfWeek(endOfMonth(displayMonth), { weekStartsOn: WEEK_STARTS_ON });
    return eachDayOfInterval({ start, end });
  }, [displayMonth]);

  const weekDayLabels = useMemo(() => {
    const anchor = startOfWeek(new Date(2024, 0, 3), { weekStartsOn: WEEK_STARTS_ON });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(anchor);
      d.setDate(anchor.getDate() + i);
      return format(d, 'EEE');
    });
  }, []);

  const goToItem = (ev) => {
    if (studentView) {
      if (ev.type === 'task') navigate('/dashboard/tasks');
      else if (ev.type === 'quiz') navigate('/dashboard/quizzes');
      else navigate('/dashboard/class-participations');
      return;
    }
    if (ev.type === 'task') {
      navigate('/dashboard/admin-tasks');
      return;
    }
    if (ev.batchId) {
      navigate(`/dashboard/batches/${ev.batchId}/explore`);
    } else {
      navigate('/dashboard/batches');
    }
  };

  return (
    <div
      className={cn(
        'fixed z-30 bg-background flex flex-col',
        'inset-x-0 bottom-0 top-16 lg:left-16',
        'border-t border-border'
      )}
    >
      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-3 sm:px-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">Academic calendar</h1>
          <p className="truncate text-xs text-muted-foreground sm:text-sm">
            {studentView
              ? 'Your assignments, quizzes, and class participations by date — batch · subject on each item'
              : 'All assignments, quizzes, and class participations — batch · subject on each item'}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
          <Button variant="outline" size="sm" onClick={() => setDisplayMonth(startOfMonth(new Date()))}>
            Today
          </Button>
          <div className="flex items-center rounded-md border border-border">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDisplayMonth((m) => subMonths(m, 1))} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[8.5rem] px-2 text-center text-xs font-medium tabular-nums sm:text-sm">
              {format(displayMonth, 'MMMM yyyy')}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDisplayMonth((m) => addMonths(m, 1))} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(-1)} aria-label="Close calendar">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:p-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:text-sm">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-sky-500" />
            Assignment
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-violet-500" />
            Quiz
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-amber-500" />
            Class participation
          </span>
          <span className="text-muted-foreground/80">— batch · subject on each item</span>
        </div>

        {!user || loading ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-px overflow-hidden rounded-lg border border-border bg-border">
            {weekDayLabels.map((label) => (
              <div
                key={label}
                className="flex items-center justify-center bg-muted/80 px-1 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs"
              >
                {label}
              </div>
            ))}
            {monthGrid.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const items = eventsByDate[key] || [];
              const inMonth = isSameMonth(day, displayMonth);
              const today = isToday(day);
              return (
                <div
                  key={key}
                  className={cn(
                    'flex min-h-0 flex-col bg-card p-0.5 sm:p-1',
                    !inMonth && 'bg-muted/40 opacity-70',
                    today && 'ring-1 ring-inset ring-primary/60'
                  )}
                >
                  <span
                    className={cn(
                      'mb-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-medium sm:h-6 sm:w-6 sm:text-xs',
                      today ? 'bg-primary text-primary-foreground' : 'text-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
                    {items.map((ev) => (
                      <button
                        key={`${ev.type}-${ev.id}-${ev.detailLine || ''}`}
                        type="button"
                        onClick={() => goToItem(ev)}
                        className={cn(
                          'flex w-full flex-col items-stretch gap-0 rounded px-1 py-0.5 text-left text-[10px] leading-tight sm:text-xs',
                          'transition-opacity hover:opacity-90',
                          ev.type === 'task' && 'bg-sky-500/15 text-sky-800 dark:text-sky-200',
                          ev.type === 'quiz' && 'bg-violet-500/15 text-violet-800 dark:text-violet-200',
                          ev.type === 'cp' && 'bg-amber-500/15 text-amber-900 dark:text-amber-100'
                        )}
                        title={[ev.title, ev.subtitle].filter(Boolean).join(' — ')}
                      >
                        <span className="flex min-w-0 items-center gap-1">
                          {ev.type === 'task' && <ClipboardList className="h-2.5 w-2.5 shrink-0 opacity-80 sm:h-3 sm:w-3" />}
                          {ev.type === 'quiz' && <GraduationCap className="h-2.5 w-2.5 shrink-0 opacity-80 sm:h-3 sm:w-3" />}
                          {ev.type === 'cp' && <Users className="h-2.5 w-2.5 shrink-0 opacity-80 sm:h-3 sm:w-3" />}
                          <span className="min-w-0 flex-1 truncate font-medium">{ev.title}</span>
                        </span>
                        <span className="truncate pl-3.5 text-[9px] leading-tight opacity-80 sm:text-[10px]">
                          {ev.detailLine}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
