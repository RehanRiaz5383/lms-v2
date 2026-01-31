import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { toggleTheme } from '../../store/slices/themeSlice';
import { logout } from '../../store/slices/authSlice';
import { fetchProfile } from '../../store/slices/profileSlice';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Menu, Moon, Sun, LogOut, User, BarChart3, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getStorageUrl, normalizeStorageUrl } from '../../config/api';
import NotificationDropdown from '../notifications/NotificationDropdown';
import ProfilePicture from '../ProfilePicture';

const Header = ({ onMenuClick }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.theme);
  const { user } = useAppSelector((state) => state.auth);
  const { profile } = useAppSelector((state) => state.profile);
  const [profilePicture, setProfilePicture] = useState(null);

  useEffect(() => {
    // Fetch profile if not loaded
    if (!profile && user) {
      dispatch(fetchProfile());
    }
  }, [dispatch, profile, user]);

  useEffect(() => {
    // Get profile picture from user or profile
    if (user?.picture_url || user?.picture) {
      let pictureUrl = user.picture_url || (user.picture ? getStorageUrl(user.picture) : null);
      // Normalize URL to ensure it uses /load-storage/ instead of /storage/
      if (pictureUrl) {
        pictureUrl = normalizeStorageUrl(pictureUrl);
      }
      setProfilePicture(pictureUrl);
    } else if (profile?.picture_url || profile?.picture) {
      let pictureUrl = profile.picture_url || (profile.picture ? getStorageUrl(profile.picture) : null);
      // Normalize URL to ensure it uses /load-storage/ instead of /storage/
      if (pictureUrl) {
        pictureUrl = normalizeStorageUrl(pictureUrl);
      }
      setProfilePicture(pictureUrl);
    } else {
      setProfilePicture(null);
    }
  }, [user, profile]);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  // Check if user is a student
  const isStudent = () => {
    if (!user) return false;
    
    // Check roles array
    if (user.roles && Array.isArray(user.roles)) {
      return user.roles.some(role => 
        role.title?.toLowerCase() === 'student' || role.id == 2
      );
    }
    
    // Fallback to user_type
    return user.user_type == 2 || user.user_type_title?.toLowerCase() === 'student';
  };

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationDropdown />

        {/* Performance Report (Students only) */}
        {isStudent() && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/performance-report')}
            aria-label="Performance Report"
            title="Performance Report"
          >
            <BarChart3 className="h-5 w-5" />
          </Button>
        )}

        {/* Account Book (Students only) */}
        {isStudent() && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/account-book')}
            aria-label="Account Book"
            title="Account Book"
          >
            <BookOpen className="h-5 w-5" />
          </Button>
        )}

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => dispatch(toggleTheme())}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* User Info */}
        <Link
          to="/dashboard/profile"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted hover:bg-accent transition-colors cursor-pointer"
        >
          <ProfilePicture
            src={profilePicture}
            alt={user?.name || 'User'}
            size="sm"
            showBorder={true}
          />
          <span className="text-sm font-medium text-foreground">
            {user?.name || 'User'}
          </span>
          <span className="text-xs text-muted-foreground">
            ({user?.user_type_title || 'N/A'})
          </span>
        </Link>

        {/* Logout Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label="Logout"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default Header;

