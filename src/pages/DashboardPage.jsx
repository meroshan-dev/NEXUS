import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, CheckSquare, Clock, CheckCircle2,
  Calendar, AlertCircle, History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import LoadingState from '../components/ui/LoadingState';
import DbSetupModal from '../components/ui/DbSetupModal';
import { useWorkspace } from '../context/WorkspaceContext';

const PALETTE = ['#5e6ad2', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    workspaces,
    createWorkspace,
    joinWorkspaceByCode,
    loading,
    dbError,
    activityFeed,
    tasks,
    refetchTasks
  } = useWorkspace();

  const [showCreate, setShowCreate] = useState(false);
  const [newWs, setNewWs] = useState({ name: '', description: '', color: '#5e6ad2' });
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  // 1. Continue Working: Recently accessed workspaces tracker
  const openedMap = useMemo(() => {
    if (!user?.id) return {};
    const key = `nexus_ws_opened_${user.id}`;
    try {
      return JSON.parse(localStorage.getItem(key) || '{}');
    } catch {
      return {};
    }
  }, [user?.id]);

  const continueWorkingList = useMemo(() => {
    return workspaces
      .filter(ws => openedMap[ws.id])
      .map(ws => ({
        ...ws,
        openedAt: new Date(openedMap[ws.id])
      }))
      .sort((a, b) => b.openedAt - a.openedAt);
  }, [workspaces, openedMap]);

  // Fix 3: Pre-fetch tasks for ALL workspaces on mount so data survives refresh
  useEffect(() => {
    if (workspaces.length > 0 && refetchTasks) {
      workspaces.forEach(ws => {
        // Only fetch if we don't already have tasks for this workspace
        if (!tasks[ws.id]) {
          refetchTasks(ws.id);
        }
      });
    }
  }, [workspaces]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper to format relative time for Continue Working
  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // 2. Personal Tasks checklist: Only tasks assigned to logged-in user, grouped by Overdue, Today, Upcoming
  const personalTasks = useMemo(() => {
    const list = [];
    Object.entries(tasks || {}).forEach(([wsId, cols]) => {
      const ws = workspaces.find(w => w.id === wsId);
      if (!ws) return;
      // Map column keys to status labels
      const statusMap = { todo: 'TO DO', inProgress: 'IN PROGRESS', done: 'DONE' };
      ['todo', 'inProgress', 'done'].forEach(colKey => {
        const items = cols[colKey] || [];
        items.forEach(t => {
          if (t.assignee === user?.id) {
            list.push({
              ...t,
              status: statusMap[colKey],
              workspaceId: wsId,
              workspaceName: ws.name,
              workspaceColor: ws.color
            });
          }
        });
      });
    });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const overdue = [];
    const dueToday = [];
    const upcoming = [];

    list.forEach(t => {
      if (t.status === 'DONE') return; // Don't show done tasks
      if (!t.dueDate) {
        upcoming.push(t);
        return;
      }
      const taskDateStr = t.dueDate.split('T')[0];
      if (taskDateStr < todayStr) {
        overdue.push(t);
      } else if (taskDateStr === todayStr) {
        dueToday.push(t);
      } else {
        upcoming.push(t);
      }
    });

    return { overdue, dueToday, upcoming, totalCount: list.length };
  }, [tasks, workspaces, user?.id]);


  // 3. Redesigned timeline activities: Grouped by Today/Yesterday, relative timestamps, activity type icons, clean spacing
  const groupedActivities = useMemo(() => {
    const list = [];
    Object.entries(activityFeed || {}).forEach(([wsId, feed]) => {
      const ws = workspaces.find(w => w.id === wsId);
      if (!ws) return;
      feed.forEach(act => {
        list.push({
          ...act,
          workspaceName: ws.name,
          workspaceColor: ws.color
        });
      });
    });

    // Sort by created_at descending
    list.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));

    // Avoid sequential redundant updates (e.g. same details repeatedly)
    const uniqueList = [];
    let lastEventKey = '';
    list.forEach(act => {
      const eventKey = `${act.user_id}_${act.action}_${act.details}`;
      if (eventKey !== lastEventKey) {
        uniqueList.push(act);
        lastEventKey = eventKey;
      }
    });

    const todayStr = new Date().toDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    const groups = { today: [], yesterday: [], older: [] };

    uniqueList.forEach(act => {
      const date = new Date(act.created_at || act.createdAt || 0);
      const dateStr = date.toDateString();
      if (dateStr === todayStr) {
        groups.today.push(act);
      } else if (dateStr === yesterdayStr) {
        groups.yesterday.push(act);
      } else {
        groups.older.push(act);
      }
    });

    return groups;
  }, [activityFeed, workspaces]);

  const getActivityIcon = (action) => {
    switch (action) {
      case 'created_task':
        return CheckIcon;
      case 'completed_task':
        return CheckCircle2;
      case 'uploaded_file':
      case 'downloaded_file':
        return FolderOpen;
      case 'message_sent':
        return Sparkles;
      case 'started_call':
        return Clock;
      default:
        return Sparkles;
    }
  };

  const formatActivityTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newWs.name.trim()) return;
    const res = await createWorkspace(newWs.name, newWs.description, newWs.color);
    if (res) {
      setShowCreate(false);
      setNewWs({ name: '', description: '', color: '#5e6ad2' });
      navigate(`/workspace/${res.id}?tab=overview`);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setJoinError('');
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    const res = await joinWorkspaceByCode(joinCode);
    setJoinLoading(false);
    if (res.success) {
      setShowJoin(false);
      setJoinCode('');
      navigate(`/workspace/${res.workspaceId}?tab=overview`);
    } else {
      setJoinError(res.error);
    }
  };

  if (loading) return <LoadingState label="Loading overview…" />;

  // Status badge color map
  const statusStyles = {
    'TO DO': { background: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
    'IN PROGRESS': { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    'DONE': { background: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  };

  // Task row component — Fix 4: no checkbox, show status badge
  const TaskRow = ({ t }) => {
    const badge = statusStyles[t.status] || statusStyles['TO DO'];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
          <span style={{ fontSize: '11px', opacity: 0.45, color: 'var(--text-secondary)', display: 'block', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.workspaceName}
          </span>
        </div>
        <span style={{
          fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
          whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 500, letterSpacing: '0.04em',
          background: badge.background, color: badge.color,
        }}>
          {t.status}
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {dbError && <DbSetupModal />}

      {/* Welcome Back Card — Fix 2: overflow hidden, flex-wrap, buttons contained */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={{ padding: '24px', boxSizing: 'border-box', overflow: 'hidden', position: 'relative' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="section-label" style={{ marginBottom: '8px', display: 'block', opacity: 1, color: 'var(--accent)' }}>
              Personal Overview
            </span>
            <h1 style={{ fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Welcome back, {user?.name?.split(' ')[0] || 'User'}
            </h1>
            <p style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              All workspaces are synchronized. Here is what is on your plate next.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            <Button variant="secondary" size="sm" style={{ whiteSpace: 'nowrap', flexShrink: 0, padding: '8px 16px' }} onClick={() => setShowJoin(true)}>
              Join workspace
            </Button>
            <Button icon={Plus} size="sm" style={{ whiteSpace: 'nowrap', flexShrink: 0, padding: '8px 16px' }} onClick={() => setShowCreate(true)}>
              Create workspace
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Continue Working Section */}
      {continueWorkingList.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <History size={15} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
            <h2 className="section-label">Continue working</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {continueWorkingList.slice(0, 3).map((ws) => (
              <motion.div
                key={ws.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card glass-card-hover"
                style={{ borderRadius: '16px', overflow: 'hidden', padding: '16px', boxSizing: 'border-box', position: 'relative', minHeight: '120px', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', objectFit: 'contain',
                      background: ws.color + '18', border: `1px solid ${ws.color}20`,
                    }}
                  >
                    {ws.icon}
                  </div>
                  <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</h3>
                    <p style={{ fontSize: '11px', opacity: 0.5, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                      Last opened {formatTimeAgo(ws.openedAt)}
                    </p>
                  </div>
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                    onClick={() => navigate(`/workspace/${ws.id}?tab=overview`)}
                  >
                    Open Workspace
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* My Tasks — Full width single column (Fix 4: right panel removed) */}
      <section className="glass-card" style={{ padding: '20px 24px', boxSizing: 'border-box', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', marginBottom: '16px', borderBottom: '1px solid var(--glass-border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={16} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
            <h2 className="section-label">My Tasks</h2>
          </div>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-tertiary)' }}>
            {personalTasks.totalCount} active tasks
          </span>
        </div>

        {personalTasks.totalCount === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>
              <CheckCircle2 size={20} strokeWidth={1.5} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>All caught up!</p>
              <p style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-tertiary)' }}>No tasks assigned to you yet.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Group: Overdue */}
            {personalTasks.overdue.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', opacity: 0.8, padding: '8px 0 4px', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500, color: '#f87171' }}>
                  <AlertCircle size={12} strokeWidth={1.5} />
                  <span>Overdue ({personalTasks.overdue.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {personalTasks.overdue.map(t => (
                    <TaskRow key={t.id} t={t} />
                  ))}
                </div>
              </div>
            )}

            {/* Group: Due Today */}
            {personalTasks.dueToday.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', opacity: 0.8, padding: '8px 0 4px', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500, color: '#fbbf24' }}>
                  <Calendar size={12} strokeWidth={1.5} />
                  <span>Due Today ({personalTasks.dueToday.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {personalTasks.dueToday.map(t => (
                    <TaskRow key={t.id} t={t} />
                  ))}
                </div>
              </div>
            )}

            {/* Group: Upcoming */}
            {personalTasks.upcoming.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', opacity: 0.5, padding: '8px 0 4px', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500, color: 'var(--text-tertiary)' }}>
                  <Clock size={12} strokeWidth={1.5} />
                  <span>Upcoming ({personalTasks.upcoming.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {personalTasks.upcoming.map(t => (
                    <TaskRow key={t.id} t={t} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Workspace Creation & Join Modals */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create workspace">
        <form onSubmit={handleCreate} className="space-y-5">
          <Input
            label="Workspace name"
            placeholder="e.g. Product Development"
            value={newWs.name}
            onChange={(e) => setNewWs({ ...newWs, name: e.target.value })}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              Description
            </label>
            <textarea
              placeholder="What's this workspace about?"
              value={newWs.description}
              onChange={(e) => setNewWs({ ...newWs, description: e.target.value })}
              className="input-base resize-none text-xs p-3 w-full"
              style={{ height: 80, borderRadius: 'var(--radius-md)' }}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              Theme color
            </label>
            <div className="flex flex-wrap gap-2.5">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewWs({ ...newWs, color: c })}
                  className="w-7 h-7 rounded-full transition-all focus:outline-none cursor-pointer"
                  style={{
                    background: c,
                    boxShadow: newWs.color === c ? `0 0 0 1.5px var(--bg-app), 0 0 0 3px ${c}, 0 0 12px ${c}50` : 'none',
                    transform: newWs.color === c ? 'scale(1.05)' : undefined,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-3" style={{ borderTop: '1px solid var(--glass-border-light)' }}>
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
        <form onSubmit={handleJoin} className="space-y-5">
          <Input
            label="Invite code"
            placeholder="e.g. ABCD12"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            required
          />
          {joinError && (
            <p
              className="text-xs font-medium px-3 py-2 rounded-[var(--radius-md)]"
              style={{
                color: '#f87171',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              {joinError}
            </p>
          )}
          <div className="flex gap-3 pt-3" style={{ borderTop: '1px solid var(--glass-border-light)' }}>
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
