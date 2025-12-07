import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { toggleTheme } from '../../store/slices/themeSlice';
import { logout } from '../../store/slices/authSlice';
import { fetchProfile } from '../../store/slices/profileSlice';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Menu, Moon, Sun, LogOut, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getStorageUrl } from '../../config/api';

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
      const pictureUrl = user.picture_url || (user.picture ? getStorageUrl(user.picture) : null);
      setProfilePicture(pictureUrl);
    } else if (profile?.picture_url || profile?.picture) {
      const pictureUrl = profile.picture_url || (profile.picture ? getStorageUrl(profile.picture) : null);
      setProfilePicture(pictureUrl);
    } else {
      setProfilePicture(null);
    }
  }, [user, profile]);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
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
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={user?.name || 'User'}
              className="w-8 h-8 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
          )}
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

