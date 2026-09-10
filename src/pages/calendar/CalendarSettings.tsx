import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { X, Calendar as CalendarIcon, LogIn, LogOut, RefreshCw } from 'lucide-react';
import { 
  isGoogleAuthed, 
  loginGoogle, 
  logoutGoogle, 
  subscribeToGoogleAuth, 
  getGoogleCalendars, 
  GoogleCalendarListEntry 
} from '../../services/googleCalendarService';
import { getSelectedGoogleCalendars, setSelectedGoogleCalendars } from '../../services/calendarService';

interface CalendarSettingsProps {
  onClose: () => void;
  onSettingsChanged: () => void; // Trigger reload of events
}

export function CalendarSettings({ onClose, onSettingsChanged }: CalendarSettingsProps) {
  const [isAuthed, setIsAuthed] = useState(isGoogleAuthed());
  const [calendars, setCalendars] = useState<GoogleCalendarListEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(getSelectedGoogleCalendars());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToGoogleAuth(authed => {
      setIsAuthed(authed);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isAuthed) {
      loadCalendars();
    } else {
      setCalendars([]);
    }
  }, [isAuthed]);

  const loadCalendars = async () => {
    setIsLoading(true);
    const cals = await getGoogleCalendars();
    setCalendars(cals);
    setIsLoading(false);
  };

  const handleToggleCalendar = (id: string) => {
    const newSelected = selectedIds.includes(id) 
      ? selectedIds.filter(calId => calId !== id)
      : [...selectedIds, id];
    
    setSelectedIds(newSelected);
    setSelectedGoogleCalendars(newSelected);
    onSettingsChanged();
  };

  const handleLogin = () => loginGoogle();
  const handleLogout = () => {
    logoutGoogle();
    onSettingsChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" /> Calendar Settings
          </h2>
          <button onClick={onClose} className="text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 p-1.5 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Google Calendar Integration</h3>
              <p className="text-sm text-neutral-500">
                Connect your Google account to sync events automatically.
              </p>
            </div>
            
            {isAuthed ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-neutral-900 rounded-full flex items-center justify-center shadow-sm">
                      <img src="https://www.gstatic.com/images/branding/product/1x/calendar_48dp.png" alt="Google Calendar" className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Connected</div>
                      <div className="text-xs text-neutral-500">Syncing active</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-neutral-500 hover:text-red-500">
                    <LogOut className="h-4 w-4 mr-2" /> Disconnect
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Visible Calendars</h4>
                    {isLoading && <RefreshCw className="h-4 w-4 text-neutral-400 animate-spin" />}
                  </div>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {calendars.length === 0 && !isLoading && (
                      <div className="text-sm text-neutral-500 text-center py-4">No calendars found.</div>
                    )}
                    {calendars.map(cal => (
                      <label 
                        key={cal.id} 
                        className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(cal.id)}
                          onChange={() => handleToggleCalendar(cal.id)}
                          className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 h-4 w-4"
                        />
                        <div className="flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {cal.summary}
                        </div>
                        {cal.primary && (
                          <span className="text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full text-neutral-600 dark:text-neutral-400">
                            Primary
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Button onClick={handleLogin} className="w-full">
                <LogIn className="h-4 w-4 mr-2" /> Connect Google Account
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
