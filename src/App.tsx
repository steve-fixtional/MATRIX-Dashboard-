/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import { SyncProvider } from './store/SyncContext';
import { VaultProvider } from './store/VaultContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Notes } from './pages/Notes';
import { Tasks } from './pages/Tasks';
import { Calendar } from './pages/Calendar';
import { Search } from './pages/Search';
import { Clipboard } from './pages/Clipboard';
import { Settings } from './pages/Settings';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/projects/ProjectDetail';
import { Passwords } from './pages/Passwords';
import { Files } from './pages/Files';
import { AnimatePresence } from 'motion/react';
import { EmptyState } from './components/ui/EmptyState';
import { Compass } from 'lucide-react';
import { PageWrapper } from './components/layout/PageWrapper';
import { useEffect } from 'react';
import { OfflineIndicator } from './components/ui/OfflineIndicator';
import { AppUpdateNotification } from './components/ui/AppUpdateNotification';

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
        <Route path="/passwords" element={<Passwords />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/files" element={<Files />} />
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
  return (
    <AuthProvider>
      <SyncProvider>
        <VaultProvider>
          <BrowserRouter>
            <Layout>
              <AnimatedRoutes />
              <OfflineIndicator />
              <AppUpdateNotification />
            </Layout>
          </BrowserRouter>
        </VaultProvider>
      </SyncProvider>
    </AuthProvider>
  );
}
