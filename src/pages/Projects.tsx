import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Project } from '../domain/types';
import { getProjects, saveProject } from '../services/projectService';
import { FolderKanban, Plus, MoreVertical, Archive, CheckCircle2, ChevronRight, Folder } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from '../components/ui/EmptyState';

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === 'true') {
      handleCreateProject();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      loadProjects();
    }
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    const data = await getProjects();
    setProjects(data);
    setLoading(false);
  };

  const handleCreateProject = async () => {
    const newProject = await saveProject({
      name: 'New Project',
      description: '',
      status: 'active'
    });
    navigate(`/projects/${newProject.id}`);
  };

  const activeProjects = projects.filter(p => p.status === 'active');
  const completedProjects = projects.filter(p => p.status === 'completed');
  const archivedProjects = projects.filter(p => p.status === 'archived');

  return (
    <PageWrapper className="flex flex-col h-full max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between p-4 sm:p-6 shrink-0 border-b border-neutral-100 dark:border-neutral-800">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Projects</h1>
        <Button size="sm" onClick={() => handleCreateProject()}>
          <Plus className="h-4 w-4 mr-1.5" /> New Project
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <span className="text-neutral-400 font-medium animate-pulse">Loading...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="pt-12">
            <EmptyState 
              icon={FolderKanban}
              title="Your Command Center"
              description="Projects group your notes, tasks, events, and files into unified workspaces. Data is stored securely on your device."
              action={<Button onClick={() => handleCreateProject()}>Create first project</Button>}
            />
          </div>
        ) : (
          <div className="space-y-8">
            {activeProjects.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">Active Projects</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeProjects.map(project => (
                    <ProjectCard key={project.id} project={project} onClick={() => navigate(`/projects/${project.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {completedProjects.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Completed
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
                  {completedProjects.map(project => (
                    <ProjectCard key={project.id} project={project} onClick={() => navigate(`/projects/${project.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {archivedProjects.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Archive className="h-4 w-4" /> Archived
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60 grayscale-[50%] hover:grayscale-0 transition-all">
                  {archivedProjects.map(project => (
                    <ProjectCard key={project.id} project={project} onClick={() => navigate(`/projects/${project.id}`)} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

function ProjectCard({ project, onClick }: { project: Project, onClick: () => void, key?: React.Key }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm cursor-pointer transition-all group flex flex-col h-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" 
            style={{ backgroundColor: project.color ? `${project.color}20` : 'var(--color-neutral-100)', color: project.color || 'var(--color-neutral-600)' }}
          >
             <FolderKanban className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors line-clamp-1">
            {project.name}
          </h3>
        </div>
      </div>
      <p className="text-sm text-neutral-500 line-clamp-2 flex-1 mb-4">
        {project.description || 'No description provided.'}
      </p>
      <div className="flex items-center justify-between text-xs text-neutral-400 mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-800/50">
        <span>Updated {formatDistanceToNow(project.updatedAt)} ago</span>
        <ChevronRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
      </div>
    </div>
  );
}
