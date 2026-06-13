import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, CheckSquare, Clock, Database, ArrowUpRight, Sparkles, CheckSquare as CheckIcon, CheckCircle2,
  Calendar, AlertCircle, History, FolderOpen
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
    updateTaskDetails
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
      ['todo', 'inProgress'].forEach(colKey => {
        const items = cols[colKey] || [];
        items.forEach(t => {
          if (t.assignee === user?.id) {
            list.push({
              ...t,
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

  // Handler to toggle task completion immediately
  const handleCheckTask = async (task) => {
    try {
      await updateTaskDetails(task.workspaceId, task.id, { status: 'done' });
    } catch (err) {
      console.error(err);
    }
  };

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

  // Task row component for DRY rendering
  const TaskRow = ({ t, dateLabel, dateColor, dateBg }) => (
    <div className="flex items-start justify-between p-3.5 rounded-[var(--radius-lg)] transition-all gap-4 hover:bg-[rgba(255,255,255,0.04)]" style={{ border: '1px solid var(--glass-border-light)' }}>
      <div className="flex items-start gap-3 min-w-0">
        <button
          onClick={() => handleCheckTask(t)}
          className="mt-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center cursor-pointer text-[10px] text-transparent hover:text-[var(--accent)] bg-transparent shrink-0 transition-all"
          style={{ border: '1.5px solid var(--glass-border)' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 8px rgba(129,140,248,0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          ✓
        </button>
        <div className="min-w-0">
          <p className="text-xs font-medium leading-snug truncate" style={{ color: 'var(--text-primary)' }}>{t.title}</p>
          <span className="text-[9px] font-medium mt-1 inline-block truncate max-w-[150px]" style={{ color: t.workspaceColor }}>
            {t.workspaceName}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0 gap-1 text-[10px]">
        <span className="font-medium" style={{ color: dateColor }}>{dateLabel}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-[var(--radius-pill)] font-mono uppercase tracking-wider"
          style={{ background: dateBg, color: dateColor, border: `1px solid ${dateColor}20` }}>
          {t.priority}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {dbError && <DbSetupModal />}

      {/* Welcome Back Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full glass-card"
        style={{ padding: '24px 28px', boxSizing: 'border-box' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6" style={{ minWidth: 0 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span className="section-label" style={{ marginBottom: '8px', display: 'block', opacity: 1, color: 'var(--accent)' }}>
              Personal Overview
            </span>
            <h1 className="text-display text-2xl sm:text-3xl text-truncate" style={{ color: 'var(--text-primary)' }}>
              Welcome back, {user?.name?.split(' ')[0] || 'User'}
            </h1>
            <p className="text-xs leading-relaxed text-truncate" style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
              All workspaces are synchronized. Here is what is on your plate next.
            </p>
          </div>
          <div className="flex gap-2.5 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => setShowJoin(true)}>
              Join workspace
            </Button>
            <Button icon={Plus} size="sm" onClick={() => setShowCreate(true)}>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {continueWorkingList.slice(0, 3).map((ws) => (
              <motion.div
                key={ws.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card glass-card-hover p-5 flex flex-col justify-between h-[130px]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center text-lg shrink-0"
                    style={{ background: ws.color + '18', border: `1px solid ${ws.color}20` }}
                  >
                    {ws.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ws.name}</h3>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      Last opened {formatTimeAgo(ws.openedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7.5 px-3.5 text-[11px]"
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

      {/* Main Grid: My Tasks (left) and Workspaces + Activity (right column) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start" style={{ minWidth: 0 }}>
        {/* Left Column (2/3 width) - My Tasks Checklist */}
        <div className="lg:col-span-2" style={{ minWidth: 0 }}>
          <section className="glass-card" style={{ padding: '20px 24px', boxSizing: 'border-box' }}>
            <div className="flex items-center justify-between pb-3" style={{ marginBottom: '16px', borderBottom: '1px solid var(--glass-border-light)' }}>
              <div className="flex items-center gap-2">
                <CheckSquare size={16} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                <h2 className="section-label">My Tasks</h2>
              </div>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                {personalTasks.totalCount} active tasks
              </span>
            </div>

            {personalTasks.totalCount === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>
                  <CheckCircle2 size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>All caught up!</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>No tasks assigned to you yet.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Group: Overdue */}
                {personalTasks.overdue.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: '#f87171' }}>
                      <AlertCircle size={12} strokeWidth={1.5} />
                      <span>Overdue ({personalTasks.overdue.length})</span>
                    </div>
                    <div className="space-y-2">
                      {personalTasks.overdue.map(t => (
                        <TaskRow key={t.id} t={t} dateLabel={t.dueDate} dateColor="#f87171" dateBg="rgba(239,68,68,0.08)" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Group: Due Today */}
                {personalTasks.dueToday.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: '#fbbf24' }}>
                      <Calendar size={12} strokeWidth={1.5} />
                      <span>Due Today ({personalTasks.dueToday.length})</span>
                    </div>
                    <div className="space-y-2">
                      {personalTasks.dueToday.map(t => (
                        <TaskRow key={t.id} t={t} dateLabel="Today" dateColor="#fbbf24" dateBg="rgba(245,158,11,0.08)" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Group: Upcoming */}
                {personalTasks.upcoming.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      <Clock size={12} strokeWidth={1.5} />
                      <span>Upcoming ({personalTasks.upcoming.length})</span>
                    </div>
                    <div className="space-y-2">
                      {personalTasks.upcoming.map(t => (
                        <TaskRow key={t.id} t={t} dateLabel={t.dueDate || 'No date'} dateColor="var(--text-tertiary)" dateBg="rgba(255,255,255,0.04)" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Right Column (1/3 width) - Workspaces & Activity — FIXED RIGHT PANEL */}
        <div style={{ minWidth: 0 }} className="space-y-6">
          {/* My Workspaces list — glass side panel */}
          <section className="glass-card" style={{ padding: '20px 24px', boxSizing: 'border-box' }}>
            <div className="flex items-center justify-between pb-3" style={{ marginBottom: '16px', borderBottom: '1px solid var(--glass-border-light)' }}>
              <div className="flex items-center gap-2">
                <Database size={15} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                <h2 className="section-label">My Workspaces</h2>
              </div>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                {workspaces.length} total
              </span>
            </div>

            {workspaces.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>No workspaces joined.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => navigate(`/workspace/${ws.id}?tab=overview`)}
                    className="w-full text-left p-3 rounded-[var(--radius-lg)] flex items-center justify-between gap-3 cursor-pointer group transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--glass-border-light)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-focus)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--glass-border-light)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 text-sm"
                        style={{ background: ws.color + '18', border: `1px solid ${ws.color}20` }}
                      >
                        {ws.icon}
                      </div>
                      <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ws.name}</span>
                    </div>
                    <ArrowUpRight size={14} strokeWidth={1.5} className="opacity-0 group-hover:opacity-100 transition-all shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Grouped Timeline Activity Feed */}
          <section className="glass-card" style={{ padding: '20px 24px', boxSizing: 'border-box' }}>
            <div className="flex items-center gap-2 pb-3" style={{ marginBottom: '16px', borderBottom: '1px solid var(--glass-border-light)' }}>
              <Clock size={15} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
              <h2 className="section-label">My Recent Activity</h2>
            </div>

            {(!groupedActivities.today.length && !groupedActivities.yesterday.length && !groupedActivities.older.length) ? (
              <div className="py-8 text-center rounded-[var(--radius-lg)]" style={{ border: '1px dashed var(--glass-border)' }}>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No recent activities.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Today */}
                {groupedActivities.today.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Today</p>
                    <div className="space-y-4">
                      {groupedActivities.today.map((act) => {
                        const Icon = getActivityIcon(act.action);
                        return (
                          <div key={act.id} className="flex gap-3 items-start text-xs">
                            <div className="w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0" style={{ border: '1px solid var(--glass-border-light)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-tertiary)' }}>
                              <Icon size={11} strokeWidth={1.5} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="leading-normal truncate" style={{ color: 'var(--text-primary)' }}>{act.details}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-medium truncate max-w-[100px]" style={{ color: act.workspaceColor }}>
                                  {act.workspaceName}
                                </span>
                                <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                                  {formatActivityTime(act.created_at || act.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Yesterday */}
                {groupedActivities.yesterday.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Yesterday</p>
                    <div className="space-y-4">
                      {groupedActivities.yesterday.map((act) => {
                        const Icon = getActivityIcon(act.action);
                        return (
                          <div key={act.id} className="flex gap-3 items-start text-xs">
                            <div className="w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0" style={{ border: '1px solid var(--glass-border-light)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-tertiary)' }}>
                              <Icon size={11} strokeWidth={1.5} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="leading-normal truncate" style={{ color: 'var(--text-primary)' }}>{act.details}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-medium truncate max-w-[100px]" style={{ color: act.workspaceColor }}>
                                  {act.workspaceName}
                                </span>
                                <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                                  {formatActivityTime(act.created_at || act.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Older */}
                {groupedActivities.older.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Earlier</p>
                    <div className="space-y-4">
                      {groupedActivities.older.slice(0, 5).map((act) => {
                        const Icon = getActivityIcon(act.action);
                        return (
                          <div key={act.id} className="flex gap-3 items-start text-xs">
                            <div className="w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0" style={{ border: '1px solid var(--glass-border-light)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-tertiary)' }}>
                              <Icon size={11} strokeWidth={1.5} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="leading-normal truncate" style={{ color: 'var(--text-primary)' }}>{act.details}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-medium truncate max-w-[100px]" style={{ color: act.workspaceColor }}>
                                  {act.workspaceName}
                                </span>
                                <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                                  {new Date(act.created_at || act.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

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
