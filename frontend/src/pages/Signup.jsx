import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Mail, Lock, User, Loader2, Info } from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { storage } from '../utils/storage';
import { useAppDispatch } from '../hooks/redux';
import { impersonateLogin } from '../store/slices/authSlice';
import logo from '../assets/icons/logo.png';

const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const turnstileRef = useRef(null);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    source: '', // From where student know about us
  });

  const [formErrors, setFormErrors] = useState({});

  // Load Turnstile settings
  useEffect(() => {
    const loadTurnstileSettings = async () => {
      try {
        const response = await apiService.get(API_ENDPOINTS.turnstile.getSettings);
        const settings = response.data?.data;
        if (settings?.is_enabled && settings?.site_key) {
          setTurnstileEnabled(true);
          setTurnstileSiteKey(settings.site_key);
        }
      } catch (error) {
        console.error('Failed to load Turnstile settings:', error);
      } finally {
        setLoadingSettings(false);
      }
    };

    loadTurnstileSettings();
  }, []);

  // Load Turnstile script and initialize widget
  useEffect(() => {
    if (turnstileEnabled && turnstileSiteKey && !turnstileWidgetId) {
      // Load Turnstile script
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // Initialize Turnstile widget
        if (window.turnstile && turnstileRef.current) {
          const widgetId = window.turnstile.render(turnstileRef.current, {
            sitekey: turnstileSiteKey,
            callback: (token) => {
              setTurnstileToken(token);
            },
            'error-callback': () => {
              setTurnstileToken(null);
            },
            'expired-callback': () => {
              setTurnstileToken(null);
            },
          });
          setTurnstileWidgetId(widgetId);
        }
      };
      document.body.appendChild(script);

      return () => {
        // Cleanup: remove script and reset widget
        if (turnstileWidgetId && window.turnstile) {
          window.turnstile.remove(turnstileWidgetId);
        }
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, [turnstileEnabled, turnstileSiteKey, turnstileWidgetId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (turnstileEnabled && !turnstileToken) {
      errors.turnstile = 'Please complete the security verification';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        source: formData.source || null,
      };

      if (turnstileEnabled && turnstileToken) {
        payload.turnstile_token = turnstileToken;
      }

      const response = await apiService.post(API_ENDPOINTS.auth.signup, payload);
      const { data } = response.data;

      // Store token and user data
      storage.setToken(data.token);
      storage.setUser(data.user);

      // Dispatch login action
      dispatch(impersonateLogin({
        token: data.token,
        user: data.user,
      }));

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Signup failed';
      setFormErrors({ submit: errorMessage });
      
      // Reset Turnstile if error
      if (turnstileEnabled && turnstileWidgetId && window.turnstile) {
        window.turnstile.reset(turnstileWidgetId);
        setTurnstileToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Logo */}
      <div className="mb-8">
        <img 
          src={logo} 
          alt="LMS Logo" 
          className="h-24 w-auto object-contain"
        />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create Your Account
          </CardTitle>
          <CardDescription className="text-center">
            Sign up to start your learning journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  className={formErrors.name ? 'border-destructive pl-10' : 'pl-10'}
                  disabled={loading}
                />
              </div>
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  className={formErrors.email ? 'border-destructive pl-10' : 'pl-10'}
                  disabled={loading}
                />
              </div>
              {formErrors.email && (
                <p className="text-sm text-destructive">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password (min. 8 characters)"
                  value={formData.password}
                  onChange={handleChange}
                  className={formErrors.password ? 'border-destructive pl-10' : 'pl-10'}
                  disabled={loading}
                />
              </div>
              {formErrors.password && (
                <p className="text-sm text-destructive">{formErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">How did you hear about us? (Optional)</Label>
              <Input
                id="source"
                name="source"
                type="text"
                placeholder="e.g., Facebook, Google, Friend, etc."
                value={formData.source}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            {turnstileEnabled && (
              <div className="space-y-2">
                <div ref={turnstileRef}></div>
                {formErrors.turnstile && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <Info className="h-4 w-4" />
                    {formErrors.turnstile}
                  </p>
                )}
              </div>
            )}

            {formErrors.submit && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{formErrors.submit}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Sign up'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;

