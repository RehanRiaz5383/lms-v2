import { useAppSelector } from '../hooks/redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import StudentPerformanceReport from '../components/reports/StudentPerformanceReport';

const StudentPerformanceReportPage = () => {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  if (!user) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            My Performance Report
          </h1>
          <p className="text-muted-foreground mt-2">
            View your academic performance and progress
          </p>
        </div>
      </div>

      <StudentPerformanceReport
        student={user}
        isOpen={true}
        onClose={null}
        hideActions={true}
      />
    </div>
  );
};

export default StudentPerformanceReportPage;

