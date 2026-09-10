import { Card, CardContent } from '../ui/Card';
import { Plus, ListTodo, Calendar, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function QuickActionsWidget() {
  const navigate = useNavigate();

  return (
    <Card className="h-full shadow-sm bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">
      <CardContent className="h-full p-4 flex items-center justify-around">
        <button 
          onClick={() => navigate('/tasks')}
          className="flex flex-col items-center justify-center gap-2 p-2 hover:opacity-70 transition-opacity"
        >
          <div className="h-10 w-10 rounded-full bg-white/10 dark:bg-black/10 flex items-center justify-center">
            <ListTodo className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide uppercase">Task</span>
        </button>
        <button 
          onClick={() => navigate('/notes')}
          className="flex flex-col items-center justify-center gap-2 p-2 hover:opacity-70 transition-opacity"
        >
          <div className="h-10 w-10 rounded-full bg-white/10 dark:bg-black/10 flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide uppercase">Note</span>
        </button>
        <button 
          onClick={() => navigate('/calendar')}
          className="flex flex-col items-center justify-center gap-2 p-2 hover:opacity-70 transition-opacity"
        >
          <div className="h-10 w-10 rounded-full bg-white/10 dark:bg-black/10 flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide uppercase">Event</span>
        </button>
      </CardContent>
    </Card>
  );
}
