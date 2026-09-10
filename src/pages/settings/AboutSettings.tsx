import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Info, Code, Github } from 'lucide-react';

export function AboutSettings() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">About</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Application version and information.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-xl bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center shadow-sm">
              <span className="text-3xl font-bold tracking-tighter text-white dark:text-neutral-900">M</span>
            </div>
          </div>
          <CardTitle className="text-center text-xl">MATRIX</CardTitle>
          <CardDescription className="text-center">Personal Command Center</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6">
            <div className="bg-neutral-50 dark:bg-neutral-900 px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800">
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Version 1.0.0</span>
            </div>
            
            <div className="flex flex-col gap-3 w-full mt-4 border-t border-neutral-200 dark:border-neutral-800 pt-6">
              <a href="#" className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <span className="flex items-center gap-3"><Code className="h-4 w-4" /> Release Notes</span>
              </a>
              <a href="#" className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <span className="flex items-center gap-3"><Github className="h-4 w-4" /> Open Source</span>
              </a>
              <a href="#" className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <span className="flex items-center gap-3"><Info className="h-4 w-4" /> Privacy Policy</span>
              </a>
            </div>
            
            <div className="mt-8 text-center text-xs text-neutral-400">
              <p>&copy; {new Date().getFullYear()} MATRIX</p>
              <p className="mt-1">All rights reserved.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
