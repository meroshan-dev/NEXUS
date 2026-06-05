import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, CheckSquare, MessageSquare, FileText, Users, Clock, Database, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import DbSetupModal from '../components/ui/DbSetupModal';
import { useWorkspace } from '../context/WorkspaceContext';

const STATS = [
  { key: 'tasksDueToday', label: 'Total tasks', icon: CheckSquare, color: '#f59e0b' },
  { key: 'unreadMessages', label: 'Unread', icon: MessageSquare, color: 'var(--accent)' },
  { key: 'filesShared', label: 'Files shared', icon: FileText, color: '#22c55e' },
  { key: 'activeMembers', label: 'Team members', icon: Users, color: '#3b82f6' },
];

const PALETTE = ['#5e6ad2', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { workspaces, createWorkspace, joinWorkspaceByCode, loading, dbError, activityFeed, workspaceMembers } = useWorkspace();
  const [showCreate, setShowCreate] = useState(false);
  const [newWs, setNewWs] = useState({ name: '', description: '', color: '#5e6ad2' });
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  if (dbError) return <DbSetupModal />;
  if (loading) return <LoadingState label="Loading workspaces…" />;

  // Flatten and sort activities across all workspaces
  const allActivities = Object.keys(activityFeed || {})
    .flatMap(wsId => {
      const ws = workspaces.find(w => w.id === wsId);
      const list = activityFeed[wsId] || [];
      return list.map(act => ({
        ...act,
        workspaceName: ws?.name || 'Workspace',
        workspaceColor: ws?.color || 'var(--accent)'
      }));
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const formatActivityTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newWs.name.trim()) return;
    const emojis = ['🚀', '📣', '🎨', '⚙️', '📋', '💜', '⚡', '💡', '💬', '📦', '🔑', '📊'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const created = await createWorkspace(newWs.name, newWs.description, newWs.color, randomEmoji);
    if (created) {
      setNewWs({ name: '', description: '', color: '#5e6ad2' });
      setShowCreate(false);
      navigate(`/workspace/${created.id}`);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError('');
    const res = await joinWorkspaceByCode(joinCode);
    setJoinLoading(false);
    if (res?.success) {
      setJoinCode('');
      setShowJoin(false);
      navigate(`/workspace/${res.workspaceId}`);
    } else {
      setJoinError(res?.error || 'Failed to join workspace.');
    }
  };

  const totalTasks = workspaces.reduce((sum, ws) => sum + (ws.tasksCount || 0), 0);
  const totalFiles = workspaces.reduce((sum, ws) => sum + (ws.filesCount || 0), 0);
  const totalUnread = workspaces.reduce((sum, ws) => sum + (ws.unread || 0), 0);

  // Compute unique team members across all user workspaces
  const uniqueMemberIds = new Set();
  Object.values(workspaceMembers || {}).forEach(membersList => {
    if (Array.isArray(membersList)) {
      membersList.forEach(m => {
        if (m && m.id) uniqueMemberIds.add(m.id);
      });
    }
  });
  const totalUniqueMembers = workspaces.length > 0 ? Math.max(1, uniqueMemberIds.size) : 0;

  const statsData = {
    tasksDueToday: totalTasks,
    unreadMessages: totalUnread,
    filesShared: totalFiles,
    activeMembers: totalUniqueMembers,
  };

  return (
    <div className="page-stack pb-12 min-w-0">
      <motion.header
        className="page-header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <p className="page-eyebrow">Overview</p>
        <h1 className="text-display overflow-safe" style={{ color: 'var(--text-primary)' }}>
          {greet()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-body-sm mt-4" style={{ color: 'var(--text-secondary)' }}>
          Your workspaces, tasks, and team activity in one place.
        </p>
      </motion.header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map(({ key, label, icon: Icon, color }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="surface-panel p-5 sm:p-6 flex items-center gap-4 min-w-0"
          >
            <div
              className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
              style={{ background: `${color}14`, color }}
            >
              <Icon size={18} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-semibold tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
                {statsData[key]}
              </p>
              <p className="text-caption mt-2">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <section className="min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
          <div className="page-header">
            <h2 className="text-h2" style={{ color: 'var(--text-primary)' }}>Workspaces</h2>
            <p className="text-body-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
              Open a workspace to chat, manage tasks, and share files.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Button variant="secondary" size="md" onClick={() => setShowJoin(true)}>
              Join with code
            </Button>
            <Button icon={Plus} size="md" onClick={() => setShowCreate(true)}>
              New workspace
            </Button>
          </div>
        </div>

        {workspaces.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No workspaces yet"
            description="Create your first workspace to start collaborating with your team on tasks, chat, and files."
            actionLabel="Create workspace"
            actionIcon={Plus}
            onAction={() => setShowCreate(true)}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {workspaces.map((ws, i) => (
              <motion.div
                key={ws.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.28 }}
                className="min-w-0"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/workspace/${ws.id}`)}
                  className="group w-full text-left surface-panel p-6 sm:p-7 flex flex-col gap-6 transition-colors duration-200 cursor-pointer min-w-0"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = ws.color + '44';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div
                      className="w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center text-xl shrink-0"
                      style={{ background: ws.color + '16', borderLeft: `3px solid ${ws.color}` }}
                    >
                      {ws.icon}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <h3 className="text-h4 overflow-safe flex-1" style={{ color: 'var(--text-primary)' }}>
                          {ws.name}
                        </h3>
                        {ws.unread > 0 && (
                          <span
                            className="min-w-[20px] h-5 px-1.5 rounded-full text-white text-[10px] font-semibold flex items-center justify-center shrink-0"
                            style={{ background: 'var(--accent)' }}
                          >
                            {ws.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-body-sm leading-relaxed line-clamp-2 overflow-safe" style={{ color: 'var(--text-secondary)' }}>
                        {ws.description || 'No description yet.'}
                      </p>
                    </div>
                  </div>

                  <div
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-5"
                    style={{ borderTop: '1px solid var(--border-light)' }}
                  >
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption">
                      <span className="flex items-center gap-1.5 shrink-0">
                        <CheckSquare size={13} strokeWidth={2} /> {ws.tasksCount} tasks
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <FileText size={13} strokeWidth={2} /> {ws.filesCount} files
                      </span>
                    </div>
                    <span className="flex items-center gap-1.5 text-caption shrink-0">
                      <Clock size={12} strokeWidth={1.75} />
                      <span className="text-ellipsis max-w-[140px] sm:max-w-none">{ws.lastActivity}</span>
                      <ArrowUpRight size={14} style={{ color: 'var(--text-brand)' }} />
                    </span>
                  </div>
                </button>
              </motion.div>
            ))}

            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-[var(--radius-lg)] p-6 sm:p-7 border border-dashed min-h-[200px] flex flex-col items-center justify-center gap-4 transition-colors duration-200 cursor-pointer w-full min-w-0"
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-tertiary)',
                background: 'var(--bg-subtle)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-focus)';
                e.currentTarget.style.color = 'var(--text-brand)';
                e.currentTarget.style.background = 'var(--bg-active)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.color = 'var(--text-tertiary)';
                e.currentTarget.style.background = 'var(--bg-subtle)';
              }}
            >
              <div
                className="w-14 h-14 rounded-[var(--radius-md)] border border-dashed flex items-center justify-center"
                style={{ borderColor: 'currentColor' }}
              >
                <Plus size={24} strokeWidth={1.75} />
              </div>
              <div className="text-center">
                <p className="text-body font-medium" style={{ color: 'var(--text-primary)' }}>
                  New workspace
                </p>
                <p className="text-caption mt-1">Start a new team space</p>
              </div>
            </button>
          </div>
        )}
      </section>

      <section className="min-w-0">
        <h2 className="text-h3 mb-5" style={{ color: 'var(--text-primary)' }}>
          Recent activity
        </h2>
        {allActivities.length === 0 ? (
          <div className="surface-panel px-6 py-10 sm:px-8 sm:py-12 text-center">
            <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
              {workspaces.length === 0 ? 'Activity will appear once you create a workspace.' : 'No recent activity yet.'}
            </p>
            <p className="text-caption mt-2">Tasks, messages, and file uploads show up here.</p>
          </div>
        ) : (
          <div className="surface-panel divide-y" style={{ divideColor: 'var(--border-color)', overflow: 'hidden' }}>
            {allActivities.slice(0, 10).map((act, idx) => {
              const actor = act.user_id === user?.id ? 'You' : (act.profiles?.name || 'Someone');
              return (
                <div key={act.id || idx} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[var(--bg-hover)] transition-colors" style={{ borderBottom: idx < allActivities.slice(0, 10).length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: act.workspaceColor }} />
                    <div className="text-sm">
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{actor}</span>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{act.details}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-start sm:self-center">
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: act.workspaceColor + '15', color: act.workspaceColor }}>
                      {act.workspaceName}
                    </span>
                    <span className="text-caption text-[11px] shrink-0">
                      {formatActivityTime(act.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create workspace">
        <form onSubmit={handleCreate} className="space-y-6">
          <Input
            label="Workspace name"
            placeholder="e.g. Product Development"
            value={newWs.name}
            onChange={(e) => setNewWs({ ...newWs, name: e.target.value })}
            required
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Description
            </label>
            <textarea
              placeholder="What's this workspace about?"
              value={newWs.description}
              onChange={(e) => setNewWs({ ...newWs, description: e.target.value })}
              className="input-base resize-none"
              style={{ height: 100 }}
            />
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Accent colour
            </label>
            <div className="flex flex-wrap gap-3">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewWs({ ...newWs, color: c })}
                  className="w-9 h-9 rounded-full transition-all hover:scale-105 focus:outline-none cursor-pointer"
                  style={{
                    background: c,
                    boxShadow:
                      newWs.color === c ? `0 0 0 2px var(--bg-elevated), 0 0 0 4px ${c}` : 'none',
                    transform: newWs.color === c ? 'scale(1.15)' : undefined,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create workspace
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showJoin} onClose={() => setShowJoin(false)} title="Join workspace">
        <form onSubmit={handleJoin} className="space-y-6">
          <Input
            label="Invite code"
            placeholder="e.g. ABCD12"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            required
          />
          {joinError && (
            <p
              className="text-xs font-medium px-4 py-3 rounded-[var(--radius-md)]"
              style={{
                color: 'var(--color-danger)',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              {joinError}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setShowJoin(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={joinLoading}>
              Join workspace
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
