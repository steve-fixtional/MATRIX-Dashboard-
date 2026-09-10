/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import { SyncProvider } from './store/SyncContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Notes } from './pages/Notes';
import { Tasks } from './pages/Tasks';
import { Calendar } from './pages/Calendar';
import { Search } from './pages/Search';
import { Clipboard } from './pages/Clipboard';
import { Settings } from './pages/Settings';
import { AnimatePresence } from 'motion/react';
import { EmptyState } from './components/ui/EmptyState';
import { Compass } from 'lucide-react';
import { PageWrapper } from './components/layout/PageWrapper';
import { useEffect } from 'react';
import { initGoogleCalendarAuth } from './services/googleCalendarService';
import { OfflineIndicator } from './components/ui/OfflineIndicator';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      {/* @ts-expect-error key is a valid React prop but missing in RoutesProps in this RR version */}
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<Search />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/clipboard" element={<Clipboard />} />
        <Route path="/settings/*" element={<Settings />} />
        <Route path="*" element={
          <PageWrapper className="pt-12">
            <EmptyState 
              icon={Compass} 
              title="Under Construction" 
              description="This section of the command center is currently being built. Check back later." 
            />
          </PageWrapper>
        } />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  useEffect(() => {
    initGoogleCalendarAuth().catch(console.error);
  }, []);

  return (
    <AuthProvider>
      <SyncProvider>
        <BrowserRouter>
          <Layout>
            <AnimatedRoutes />
            <OfflineIndicator />
          </Layout>
        </BrowserRouter>
      </SyncProvider>
    </AuthProvider>
  );
}
