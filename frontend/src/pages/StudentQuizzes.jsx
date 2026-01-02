import { useEffect, useState } from 'react';
import { useAppSelector } from '../hooks/redux';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  FileText, 
  Calendar, 
  BookOpen, 
  Users,
  Filter,
  Loader2,
  CheckCircle2,
  Clock,
  Award,
} from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../components/ui/toast';
import { format } from 'date-fns';

const StudentQuizzes = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { error: showError } = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // all, subject, batch-level

  useEffect(() => {
    loadQuizzes();
  }, [selectedBatch, selectedSubject, filterType]);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedBatch) params.batch_id = selectedBatch;
      if (selectedSubject) params.subject_id = selectedSubject;
      else if (filterType === 'batch-level') params.subject_id = 'null';

      const response = await apiService.get(API_ENDPOINTS.student.quizzes, { params });
      const data = response.data.data || {};
      setQuizzes(data.quizzes || []);
      setBatches(data.batches || []);
      setSubjects(data.subjects || []);
    } catch (err) {
      showError('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
    setSelectedSubject('');
    if (type === 'batch-level') {
      // Keep selectedBatch as is
    }
  };

  const getQuizTypeLabel = (quiz) => {
    if (quiz.subject_id) {
      return quiz.subject?.title || 'Subject Quiz';
    }
    return 'Batch-Level Quiz';
  };

  const getQuizTypeBadge = (quiz) => {
    if (quiz.subject_id) {
      return (
        <span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium rounded">
          {quiz.subject?.title || 'Subject'}
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-medium rounded">
        Batch-Level
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Quizzes</h1>
          <p className="text-muted-foreground mt-2">View and track your quiz results</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Quiz Type Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Quiz Type</label>
              <div className="flex gap-2">
                <Button
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('all')}
                >
                  All
                </Button>
                <Button
                  variant={filterType === 'subject' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('subject')}
                >
                  Subject
                </Button>
                <Button
                  variant={filterType === 'batch-level' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('batch-level')}
                >
                  Batch-Level
                </Button>
              </div>
            </div>

            {/* Batch Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Batch</label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="">All Batches</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter (only if filterType is 'all' or 'subject') */}
            {filterType !== 'batch-level' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  disabled={filterType === 'batch-level'}
                >
                  <option value="">All Subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quizzes List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No quizzes found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{quiz.title || 'Untitled Quiz'}</CardTitle>
                      {getQuizTypeBadge(quiz)}
                    </div>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {quiz.batch?.title || 'Unknown Batch'}
                      </span>
                      {quiz.subject && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {quiz.subject.title}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {quiz.quiz_date ? format(new Date(quiz.quiz_date), 'MMM dd, yyyy') : 'No date'}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {quiz.description && (
                  <p className="text-sm text-muted-foreground mb-4">{quiz.description}</p>
                )}
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4">
                    {quiz.has_mark ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="text-sm font-medium">
                            Marks: {quiz.obtained_marks ?? 'N/A'} / {quiz.total_marks ?? 'N/A'}
                          </p>
                          {quiz.remarks && (
                            <p className="text-xs text-muted-foreground">Remarks: {quiz.remarks}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Results pending</span>
                      </div>
                    )}
                    {quiz.total_marks && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Award className="h-4 w-4" />
                        Total: {quiz.total_marks} marks
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentQuizzes;


