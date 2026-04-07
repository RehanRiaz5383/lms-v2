/** Shared frosted glass styling for dashboard shell and cards (matches sidebar aesthetic). */

export const DASHBOARD_GLASS_SHELL =
  'rounded-2xl border border-border/45 bg-background/50 dark:bg-background/40 backdrop-blur-xl backdrop-saturate-150 p-4 sm:p-6 ' +
  'shadow-[0_8px_40px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.35)]';

export const DASHBOARD_GLASS_CARD =
  'border-border/50 bg-card/60 dark:bg-card/40 backdrop-blur-xl backdrop-saturate-150 ' +
  'shadow-sm transition-all duration-200 hover:shadow-md hover:bg-card/70 dark:hover:bg-card/45';

/** Full-page soft gradient + frame behind dashboard content */
export const DASHBOARD_PAGE_WRAP =
  'relative min-h-[calc(100vh-8rem)] overflow-hidden rounded-3xl border border-border/30 ' +
  'bg-gradient-to-br from-violet-500/[0.06] via-background to-sky-500/[0.07] ' +
  'dark:from-violet-950/40 dark:via-background dark:to-sky-950/25';

export const DASHBOARD_ORB_L =
  'pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-violet-400/20 blur-[80px] dark:bg-violet-600/15';
export const DASHBOARD_ORB_R =
  'pointer-events-none absolute -right-16 top-1/4 h-64 w-64 rounded-full bg-sky-400/20 blur-[72px] dark:bg-sky-500/12';

/** Quick action chip */
export const DASHBOARD_GLASS_PILL =
  'inline-flex items-center gap-2 rounded-xl border border-border/40 bg-card/55 px-3 py-2 text-sm font-medium ' +
  'text-foreground shadow-sm backdrop-blur-md transition-all hover:bg-card/80 hover:shadow-md dark:bg-card/35';
