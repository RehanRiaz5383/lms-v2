import { useState, useEffect } from 'react';
import { useAppSelector } from '../../hooks/redux';
import { socketService } from '../../services/socketService';
import WhosOnlineButton from './WhosOnlineButton';
import WhosOnlineSidebar from './WhosOnlineSidebar';

const WhosOnline = () => {
  const { user, token } = useAppSelector((state) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Only connect if user is authenticated
    if (user && token) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }

    // Cleanup on unmount
    return () => {
      // Don't disconnect on unmount, keep connection alive
      // socketService.disconnect();
    };
  }, [user, token]);

  const handleButtonClick = () => {
    setSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  // Don't render if user is not authenticated
  if (!user || !token) {
    return null;
  }

  return (
    <>
      <WhosOnlineButton onClick={handleButtonClick} />
      <WhosOnlineSidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />
    </>
  );
};

export default WhosOnline;

