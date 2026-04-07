import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { toggleTheme } from '../../store/slices/themeSlice';
import { logout } from '../../store/slices/authSlice';
import { fetchProfile } from '../../store/slices/profileSlice';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { Menu, Moon, Sun, LogOut, BarChart3, BookOpen, CalendarDays } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getStorageUrl, normalizeStorageUrl } from '../../config/api';
import NotificationDropdown from '../notifications/NotificationDropdown';
import ProfilePicture from '../ProfilePicture';
import { getPageMeta } from '../../config/routeMeta';
import { cn } from '../../utils/cn';

const Header = ({ onMenuClick }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useAppSelector((state) => state.theme);
  const { user } = useAppSelector((state) => state.auth);
  const { profile } = useAppSelector((state) => state.profile);
  const [profilePicture, setProfilePicture] = useState(null);

  const { title, description } = getPageMeta(location.pathname);

  useEffect(() => {
    if (!profile && user) {
      dispatch(fetchProfile());
    }
  }, [dispatch, profile, user]);

  useEffect(() => {
    if (user?.picture_url || user?.picture) {
      let pictureUrl = user.picture_url || (user.picture ? getStorageUrl(user.picture) : null);
      if (pictureUrl) {
        pictureUrl = normalizeStorageUrl(pictureUrl);
      }
      setProfilePicture(pictureUrl);
    } else if (profile?.picture_url || profile?.picture) {
      let pictureUrl = profile.picture_url || (profile.picture ? getStorageUrl(profile.picture) : null);
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

  const isStudent = () => {
    if (!user) return false;
    if (user.roles && Array.isArray(user.roles)) {
      return user.roles.some((role) => role.title?.toLowerCase() === 'student' || role.id == 2);
    }
    return user.user_type == 2 || user.user_type_title?.toLowerCase() === 'student';
  };

  return (
    <header className="flex min-h-16 items-center gap-3 border-b border-border bg-card/80 px-4 py-2.5 backdrop-blur-md lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={onMenuClick} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        <div key={location.pathname} className={cn('min-w-0 flex-1 animate-fade-in-down')}>
          <h1 className="truncate text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground sm:text-sm sm:leading-snug">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <NotificationDropdown />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard/academic-calendar')}
          aria-label="Academic calendar"
          title="Academic calendar"
        >
          <CalendarDays className="h-5 w-5" />
        </Button>

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

        <Button variant="ghost" size="icon" onClick={() => dispatch(toggleTheme())} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <Link
          to="/dashboard/profile"
          className="hidden cursor-pointer items-center gap-2 rounded-md bg-muted px-3 py-1.5 transition-colors hover:bg-accent sm:flex"
        >
          <ProfilePicture src={profilePicture} alt={user?.name || 'User'} size="sm" showBorder={true} />
          <span className="max-w-[8rem] truncate text-sm font-medium text-foreground">{user?.name || 'User'}</span>
          <span className="hidden text-xs text-muted-foreground md:inline">({user?.user_type_title || 'N/A'})</span>
        </Link>

        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default Header;
