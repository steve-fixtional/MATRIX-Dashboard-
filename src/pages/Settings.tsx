import { Routes, Route, NavLink, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { User, Palette, LayoutDashboard, Calendar, CloudRain, RefreshCw, Layers, ShieldCheck, Info, ChevronLeft, ArrowLeft } from 'lucide-react';
import { cn } from '../utils';
import { useEffect } from 'react';

// Import sections
import { AccountSettings } from './settings/AccountSettings';
import { AppearanceSettings } from './settings/AppearanceSettings';
import { DashboardSettings } from './settings/DashboardSettings';
import { CalendarSettings } from './settings/CalendarSettings';
import { WeatherSettings } from './settings/WeatherSettings';
import { SyncSettings } from './settings/SyncSettings';
import { IntegrationSettings } from './settings/IntegrationSettings';
import { NotificationSettings } from './settings/NotificationSettings';
import { SecuritySettings } from './settings/SecuritySettings';
import { AboutSettings } from './settings/AboutSettings';
import { Bell } from 'lucide-react';

const SETTINGS_SECTIONS = [
  { id: 'account', name: 'Account', icon: User, path: '/settings/account' },
  { id: 'appearance', name: 'Appearance', icon: Palette, path: '/settings/appearance' },
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: '/settings/dashboard' },
  { id: 'calendar', name: 'Calendar', icon: Calendar, path: '/settings/calendar' },
  { id: 'weather', name: 'Weather', icon: CloudRain, path: '/settings/weather' },
  { id: 'notifications', name: 'Notifications', icon: Bell, path: '/settings/notifications' },
  { id: 'sync', name: 'Sync & Data', icon: RefreshCw, path: '/settings/sync' },
  { id: 'integrations', name: 'Integrations', icon: Layers, path: '/settings/integrations' },
  { id: 'security', name: 'Security & Privacy', icon: ShieldCheck, path: '/settings/security' },
  { id: 'about', name: 'About', icon: Info, path: '/settings/about' },
];

export function Settings() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRootSettings = location.pathname === '/settings' || location.pathname === '/settings/';
  
  const returnTo = location.state?.returnTo || '/';

  const handleBack = () => {
    navigate(returnTo);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, returnTo]);

  return (
    <PageWrapper className="p-0">
      <div className="flex h-full w-full max-w-7xl mx-auto md:py-6">
        {/* Sidebar Navigation - hidden on mobile when viewing a specific section */}
        <div className={cn(
          "w-full md:w-64 lg:w-72 flex-shrink-0 flex flex-col h-full overflow-y-auto border-r-0 md:border-r border-neutral-200 dark:border-neutral-800",
          !isRootSettings && "hidden md:flex"
        )}>
          <div className="p-4 md:p-6 md:pt-0 sticky top-0 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-sm z-10 flex items-center gap-2">
            <button 
              onClick={handleBack} 
              className="h-11 w-11 -ml-3 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0" 
              aria-label="Go back"
              title="Go back"
            >
               <ArrowLeft className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">Settings</h1>
          </div>
          <nav className="flex-1 px-3 pb-6 flex flex-col gap-1">
            {SETTINGS_SECTIONS.map((section) => (
              <NavLink
                key={section.id}
                to={section.path}
                state={{ returnTo }}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50" 
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900/50 dark:hover:text-neutral-100"
                )}
              >
                <section.icon className="h-4 w-4" />
                {section.name}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className={cn(
          "flex-1 h-full overflow-y-auto bg-neutral-50/30 dark:bg-neutral-900/10 md:bg-transparent",
          isRootSettings && "hidden md:block"
        )}>
          {!isRootSettings && (
            <div className="md:hidden sticky top-0 z-10 flex items-center p-2 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-sm">
              <NavLink to="/settings" state={{ returnTo }} replace className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors h-11 px-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <ChevronLeft className="h-5 w-5 -ml-1" />
                Back to Settings
              </NavLink>
            </div>
          )}
          
          <div className="p-4 sm:p-6 md:p-8 max-w-3xl w-full mx-auto pb-20 md:pb-8">
            <Routes>
              <Route path="/" element={
                <div className="hidden md:flex h-full items-center justify-center text-neutral-500 dark:text-neutral-400">
                  Select a category from the left menu
                </div>
              } />
              <Route path="account" element={<AccountSettings />} />
              <Route path="appearance" element={<AppearanceSettings />} />
              <Route path="dashboard" element={<DashboardSettings />} />
              <Route path="calendar" element={<CalendarSettings />} />
              <Route path="weather" element={<WeatherSettings />} />
              <Route path="notifications" element={<NotificationSettings />} />
              <Route path="sync" element={<SyncSettings />} />
              <Route path="integrations" element={<IntegrationSettings />} />
              <Route path="security" element={<SecuritySettings />} />
              <Route path="about" element={<AboutSettings />} />
              <Route path="*" element={<Navigate to="/settings" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
