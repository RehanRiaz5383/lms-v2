import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { login, clearError } from '../store/slices/authSlice';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Mail, Lock, Loader2, Quote, BookOpen, GraduationCap, ShieldCheck } from 'lucide-react';
import quotes from '../data/quotes.json';
import { cn } from '../utils/cn';

const highlights = [
  { icon: BookOpen, label: 'Structured courses', sub: 'Lessons, tasks & quizzes in one place' },
  { icon: GraduationCap, label: 'Track progress', sub: 'Performance and deadlines at a glance' },
  { icon: ShieldCheck, label: 'Secure access', sub: 'Your account stays protected' },
];

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [randomQuote, setRandomQuote] = useState('');

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setRandomQuote(quotes[randomIndex]);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    if (error) {
      dispatch(clearError());
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const result = await dispatch(login(formData));
      if (login.fulfilled.match(result)) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const inputShell =
    'h-11 border-border/60 bg-background/60 backdrop-blur-sm transition-shadow focus-within:ring-2 focus-within:ring-primary/20';

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-100/90 via-background to-sky-100/80 dark:from-violet-950/50 dark:via-background dark:to-sky-950/40"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 top-0 h-[420px] w-[420px] rounded-full bg-violet-400/35 blur-[100px] dark:bg-violet-600/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 top-1/3 h-[360px] w-[360px] rounded-full bg-sky-400/30 blur-[90px] dark:bg-sky-500/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/4 h-[280px] w-[280px] rounded-full bg-primary/15 blur-[80px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.45)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.45)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_40%,#000_20%,transparent_70%)] dark:bg-[linear-gradient(to_right,hsl(var(--border)/0.2)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.2)_1px,transparent_1px)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col lg:flex-row lg:items-stretch">
        <div className="flex flex-1 flex-col justify-center px-6 pb-6 pt-10 sm:px-10 lg:px-14 lg:py-16">
          <div className="mx-auto w-full max-w-lg lg:mx-0">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
              Sign in and{' '}
              <span className="bg-gradient-to-r from-violet-600 via-primary to-sky-600 bg-clip-text text-transparent dark:from-violet-300 dark:via-primary dark:to-sky-300">
                keep learning
              </span>
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              Access your courses, assignments, and progress—on a calm, focused workspace built for students and teams.
            </p>

            <ul className="mt-10 hidden space-y-4 sm:block">
              {highlights.map(({ icon: Icon, label, sub }) => (
                <li
                  key={label}
                  className="flex gap-4 rounded-2xl border border-border/35 bg-card/45 p-4 shadow-sm backdrop-blur-md transition-colors hover:border-border/60 dark:bg-card/25"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-sky-500/15 text-violet-700 dark:text-violet-200">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{label}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>
                  </div>
                </li>
              ))}
            </ul>

            {randomQuote && (
              <blockquote className="mt-8 hidden rounded-2xl border border-border/40 bg-muted/30 p-5 backdrop-blur-md dark:bg-muted/15 lg:block">
                <Quote className="mb-3 h-5 w-5 text-primary opacity-80" aria-hidden />
                <p className="text-sm italic leading-relaxed text-muted-foreground">{randomQuote}</p>
              </blockquote>
            )}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-12 pt-2 sm:px-8 lg:px-10 lg:py-16">
          <div className="w-full max-w-md">
            <Card
              className={cn(
                'rounded-3xl border-border/45 bg-card/75 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.18)] backdrop-blur-xl backdrop-saturate-150 dark:bg-card/45 dark:shadow-[0_24px_70px_-20px_rgba(0,0,0,0.45)]'
              )}
            >
              <CardHeader className="space-y-1 pb-2 pt-8 text-center sm:px-8 sm:text-left">
                <CardTitle className="text-2xl font-bold tracking-tight">Sign in</CardTitle>
                <CardDescription className="text-base">
                  Enter your credentials to open your dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-8 pt-2 sm:px-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">
                      Email
                    </Label>
                    <div
                      className={cn(
                        'relative rounded-md',
                        inputShell,
                        formErrors.email && 'ring-2 ring-destructive/25 border-destructive/50'
                      )}
                    >
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        className="h-11 border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0"
                        disabled={loading}
                      />
                    </div>
                    {formErrors.email && <p className="text-sm text-destructive">{formErrors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground">
                      Password
                    </Label>
                    <div
                      className={cn(
                        'relative rounded-md',
                        inputShell,
                        formErrors.password && 'ring-2 ring-destructive/25 border-destructive/50'
                      )}
                    >
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        className="h-11 border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0"
                        disabled={loading}
                      />
                    </div>
                    {formErrors.password && (
                      <p className="text-sm text-destructive">{formErrors.password}</p>
                    )}
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive backdrop-blur-sm"
                    >
                      {typeof error === 'object' && error.email
                        ? error.email[0]
                        : typeof error === 'string'
                          ? error
                          : 'Invalid credentials. Please try again.'}
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="h-11 w-full text-base font-semibold shadow-md shadow-primary/15 transition-[transform,box-shadow] hover:shadow-lg hover:shadow-primary/20 active:scale-[0.99]"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <Link
                    to="/signup"
                    className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
                  >
                    Create one
                  </Link>
                </p>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} - Tech Inn Solutions, All rights reserved.
            </p>

            {randomQuote && (
              <div className="mt-6 rounded-2xl border border-border/40 bg-card/50 p-4 backdrop-blur-md dark:bg-card/30 lg:hidden">
                <Quote className="mb-2 h-4 w-4 text-primary" aria-hidden />
                <p className="text-sm italic leading-relaxed text-muted-foreground">{randomQuote}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
