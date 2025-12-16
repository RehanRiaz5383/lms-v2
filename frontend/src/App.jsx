import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { restoreSession } from './store/slices/authSlice';
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
import BatchExplore from './pages/BatchExplore';
import NotificationDetail from './pages/NotificationDetail';
import StudentPerformanceReportPage from './pages/StudentPerformanceReportPage';
import ScheduledJobs from './pages/ScheduledJobs';
import DashboardLayout from './components/layout/DashboardLayout';

function App() {
  useEffect(() => {
    // Restore session from localStorage on app load
    store.dispatch(restoreSession());
  }, []);

  return (
    <Provider store={store}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
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
            <Route path="quizzes" element={
              <BlockedRoute>
                <div className="p-6"><h1 className="text-2xl font-bold">My Quizes</h1><p className="text-muted-foreground mt-2">Coming soon...</p></div>
              </BlockedRoute>
            } />
            <Route path="account-book" element={
              <BlockedRoute>
                <div className="p-6"><h1 className="text-2xl font-bold">Account Book</h1><p className="text-muted-foreground mt-2">Coming soon...</p></div>
              </BlockedRoute>
            } />
            {/* Add more dashboard routes here */}
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </Provider>
  );
}

export default App;
