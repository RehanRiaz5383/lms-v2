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
      <div className="flex justify-start">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} aria-label="Back to dashboard">
          <ArrowLeft className="h-5 w-5" />
        </Button>
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

