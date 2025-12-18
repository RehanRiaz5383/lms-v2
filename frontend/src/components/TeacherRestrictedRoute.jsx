import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';

const TeacherRestrictedRoute = ({ children }) => {
  const { user } = useAppSelector((state) => state.auth);
  const location = useLocation();
  
  // Check if user is a teacher (user_type = 3 or has teacher role)
  const isTeacher = () => {
    if (!user) return false;
    
    // Check user_type
    if (Number(user.user_type) === 3) return true;
    
    // Check roles
    if (user.roles && Array.isArray(user.roles)) {
      return user.roles.some(role => {
        const roleTitle = role.title?.toLowerCase();
        const roleId = Number(role.id);
        return roleTitle === 'teacher' || roleId === 3;
      });
    }
    
    return false;
  };

  // Check if user is admin (user_type = 1 or has admin role)
  const isAdmin = () => {
    if (!user) return false;
    
    // Check user_type
    if (Number(user.user_type) === 1) return true;
    
    // Check roles
    if (user.roles && Array.isArray(user.roles)) {
      return user.roles.some(role => {
        const roleTitle = role.title?.toLowerCase();
        const roleId = Number(role.id);
        return roleTitle === 'admin' || roleId === 1;
      });
    }
    
    return false;
  };

  // If user is a teacher (regardless of admin role), redirect to dashboard for restricted pages
  // Teachers should have restricted access even if they also have admin role
  if (isTeacher()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default TeacherRestrictedRoute;

