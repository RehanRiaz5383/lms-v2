import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { restoreSession } from './store/slices/authSlice';
import { ToastProvider } from './components/ui/toast';
import ProtectedRoute from './components/ProtectedRoute';
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
import BatchExplore from './pages/BatchExplore';
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
            <Route index element={<Dashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="batches" element={<BatchManagement />} />
            <Route path="batches/:id/explore" element={<BatchExplore />} />
            <Route path="subjects" element={<SubjectsManagement />} />
            <Route path="videos" element={<VideosManagement />} />
            <Route path="settings/smtp" element={<SmtpSettings />} />
            <Route path="settings/notifications" element={<NotificationSettings />} />
            <Route path="profile" element={<Profile />} />
            {/* Student routes */}
            <Route path="lecture-videos" element={<StudentLectureVideos />} />
            <Route path="tasks" element={<div className="p-6"><h1 className="text-2xl font-bold">Task Assigned</h1><p className="text-muted-foreground mt-2">Coming soon...</p></div>} />
            <Route path="quizzes" element={<div className="p-6"><h1 className="text-2xl font-bold">My Quizes</h1><p className="text-muted-foreground mt-2">Coming soon...</p></div>} />
            <Route path="account-book" element={<div className="p-6"><h1 className="text-2xl font-bold">Account Book</h1><p className="text-muted-foreground mt-2">Coming soon...</p></div>} />
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
