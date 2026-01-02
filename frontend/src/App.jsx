import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { restoreSession, impersonateLogin } from './store/slices/authSlice';
import { ToastProvider } from './components/ui/toast';
import ProtectedRoute from './components/ProtectedRoute';
import BlockedRoute from './components/BlockedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import BatchManagement from './pages/BatchManagement';
import SubjectsManagement from './pages/SubjectsManagement';
import VideosManagement from './pages/VideosManagement';
import SmtpSettings from './pages/SmtpSettings';
import NotificationSettings from './pages/NotificationSettings';
import Profile from './pages/Profile';
import StudentLectureVideos from './pages/StudentLectureVideos';
import StudentTasks from './pages/StudentTasks';
import StudentQuizzes from './pages/StudentQuizzes';
import StudentClassParticipations from './pages/StudentClassParticipations';
import BatchExplore from './pages/BatchExplore';
import NotificationDetail from './pages/NotificationDetail';
import StudentPerformanceReportPage from './pages/StudentPerformanceReportPage';
import ScheduledJobs from './pages/ScheduledJobs';
import AccountBook from './pages/AccountBook';
import FeeVouchers from './pages/FeeVouchers';
import IncomeReport from './pages/IncomeReport';
import ExpenseManagement from './pages/ExpenseManagement';
import IncomeExpenseReport from './pages/IncomeExpenseReport';
import Signup from './pages/Signup';
import InternalIntegrations from './pages/InternalIntegrations';
import DashboardLayout from './components/layout/DashboardLayout';
import PWAInstallPrompt from './components/PWAInstallPrompt';

// Inner component to handle message listener
function AppContent() {
  const navigate = useNavigate();

  useEffect(() => {
    // Restore session from localStorage on app load
    store.dispatch(restoreSession());

    // Listen for impersonation token from parent window
    const handleMessage = (event) => {
      // Security: Only accept messages from same origin
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'IMPERSONATE_LOGIN' && event.data?.token) {
        // Use user data from message if available, otherwise fetch from API
        const loginWithToken = async () => {
          try {
            let user = event.data.user;
            
            // If user data not provided, fetch it from API
            if (!user) {
              const { apiService } = await import('./services/api');
              const { API_ENDPOINTS } = await import('./config/api');
              
              // Set token temporarily to make authenticated request
              const { storage } = await import('./utils/storage');
              storage.setToken(event.data.token);
              
              // Get user data
              const response = await apiService.get(API_ENDPOINTS.auth.me);
              user = response.data?.data;
            }
            
            if (user) {
              // Dispatch impersonation login
              store.dispatch(impersonateLogin({
                token: event.data.token,
                user: user,
              }));
              
              // Navigate to dashboard
              navigate('/dashboard');
            }
          } catch (error) {
            console.error('Error during impersonation login:', error);
          }
        };
        
        loginWithToken();
      } else if (event.data?.type === 'CLEAR_IMPERSONATION') {
        // Clear impersonation session when modal closes
        // Clear both sessionStorage and localStorage to prevent impersonation token from persisting
        try {
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('user_data');
        } catch (err) {
          console.error('Error clearing sessionStorage:', err);
        }
        const { storage } = require('./utils/storage');
        storage.clearAuth();
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [navigate]);

  return null;
}

function App() {

  return (
    <Provider store={store}>
      <ToastProvider>
        <BrowserRouter>
          <AppContent />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
            <Route index element={
              <BlockedRoute>
                <Dashboard />
              </BlockedRoute>
            } />
            <Route path="users" element={
              <BlockedRoute>
                <UserManagement />
              </BlockedRoute>
            } />
            <Route path="batches" element={
              <BlockedRoute>
                <BatchManagement />
              </BlockedRoute>
            } />
            <Route path="batches/:id/explore" element={
              <BlockedRoute>
                <BatchExplore />
              </BlockedRoute>
            } />
            <Route path="subjects" element={
              <BlockedRoute>
                <SubjectsManagement />
              </BlockedRoute>
            } />
            <Route path="videos" element={
              <BlockedRoute>
                <VideosManagement />
              </BlockedRoute>
            } />
            <Route path="settings/smtp" element={
              <BlockedRoute>
                <SmtpSettings />
              </BlockedRoute>
            } />
            <Route path="settings/notifications" element={
              <BlockedRoute>
                <NotificationSettings />
              </BlockedRoute>
            } />
            <Route path="scheduled-jobs" element={
              <BlockedRoute>
                <ScheduledJobs />
              </BlockedRoute>
            } />
            <Route path="integrations/internal" element={
              <BlockedRoute>
                <InternalIntegrations />
              </BlockedRoute>
            } />
            <Route path="fee-vouchers" element={
              <BlockedRoute>
                <FeeVouchers />
              </BlockedRoute>
            } />
            <Route path="reports/income" element={
              <BlockedRoute>
                <IncomeReport />
              </BlockedRoute>
            } />
            <Route path="expenses" element={
              <BlockedRoute>
                <ExpenseManagement />
              </BlockedRoute>
            } />
            <Route path="income-expense-report" element={
              <BlockedRoute>
                <IncomeExpenseReport />
              </BlockedRoute>
            } />
            <Route path="profile" element={
              <BlockedRoute>
                <Profile />
              </BlockedRoute>
            } />
            {/* Student routes */}
            <Route path="lecture-videos" element={
              <BlockedRoute>
                <StudentLectureVideos />
              </BlockedRoute>
            } />
            <Route path="tasks" element={
              <BlockedRoute>
                <StudentTasks />
              </BlockedRoute>
            } />
            <Route path="notifications/:id" element={
              <BlockedRoute>
                <NotificationDetail />
              </BlockedRoute>
            } />
            <Route path="performance-report" element={
              <BlockedRoute>
                <StudentPerformanceReportPage />
              </BlockedRoute>
            } />
            <Route path="account-book" element={
              <BlockedRoute>
                <AccountBook />
              </BlockedRoute>
            } />
            <Route path="quizzes" element={
              <BlockedRoute>
                <StudentQuizzes />
              </BlockedRoute>
            } />
            <Route path="class-participations" element={
              <BlockedRoute>
                <StudentClassParticipations />
              </BlockedRoute>
            } />
            {/* Add more dashboard routes here */}
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <PWAInstallPrompt />
        </BrowserRouter>
      </ToastProvider>
    </Provider>
  );
}

export default App;
