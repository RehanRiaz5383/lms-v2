import { useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import BlockedMessage from './BlockedMessage';

const BlockedRoute = ({ children, allowedPaths = ['/dashboard', '/dashboard/account-book'] }) => {
  const { user } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const isBlocked = Number(user?.block) === 1;
  const currentPath = location.pathname;

  // If user is blocked and trying to access a restricted page, show blocked message
  if (isBlocked && !allowedPaths.includes(currentPath)) {
    return <BlockedMessage />;
  }

  return children;
};

export default BlockedRoute;

