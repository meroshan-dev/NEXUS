import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Activity, Send, Smile, Paperclip, Hash,
  UserPlus, MoreHorizontal, Settings, Check, Copy, BarChart3,
  TrendingUp, Clock, FileText, CheckSquare, Users
} from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';

export default function WorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    workspaces,
    chatMessages,
    addChatMessage,
    loading,
    fetchWorkspaceDetails,
    workspaceMembers,
    inviteMemberToWorkspace,
    userPresence,
    activityFeed,
    tasks,
    files
  } = useWorkspace();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('chat');
  const [message, setMessage] = useState('');
  const chatEndRef = useRef(null);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (id) fetchWorkspaceDetails(id);
  }, [id]);

  useEffect(() => {
    if (!loading && workspaces.length === 0) navigate('/dashboard');
  }, [loading, workspaces, navigate]);

  const workspace = workspaces.find((w) => w.id === id);
  const messages = workspace ? chatMessages[workspace.id] || [] : [];

  useEffect(() => {
    if (messages.length) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading || !workspace) return <LoadingState label="Loading workspace…" />;

  const isOwner = workspace.ownerId === user?.id;

  const workspaceTabs = [
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'activity', icon: Activity, label: 'Activity' },
  ];
  if (isOwner) {
    workspaceTabs.push({ id: 'analytics', icon: BarChart3, label: 'Analytics' });
  }

  // Load presence-enriched members list
  const members = (workspaceMembers[workspace.id] || []).map(m => {
    const pres = userPresence[m.id] || { status: 'offline', lastSeen: null };
    return {
      ...m,
      status: pres.status,
      lastSeen: pres.lastSeen
    };
  });

  const send = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    addChatMessage(workspace.id, message);
    setMessage('');
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess(false);
    if (!inviteEmail.trim()) return;
    const res = await inviteMemberToWorkspace(workspace.id, inviteEmail);
    if (res.success) {
      setInviteSuccess(true);
      setInviteEmail('');
      setTimeout(() => {
        setShowInvite(false);
        setInviteSuccess(false);
      }, 1500);
    } else {
      setInviteError(res.error);
    }
  };

  const handleCopyCode = () => {
    if (workspace?.inviteCode) {
      navigator.clipboard.writeText(workspace.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const formatActivityTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatLastSeen = (isoString) => {
    if (!isoString) return 'Offline';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Active just now';
    if (diffMins < 60) return `Active ${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    return `Active ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  };

  // Calculate Owner Analytics data
  const wsTasks = tasks[workspace.id] || { todo: [], inProgress: [], done: [] };
  const wsFiles = files[workspace.id] || [];
  
  const totalTasksCount = wsTasks.todo.length + wsTasks.inProgress.length + wsTasks.done.length;
  const completedTasksCount = wsTasks.done.length;
  const pendingTasksCount = wsTasks.todo.length + wsTasks.inProgress.length;
  const overdueTasksCount = [...wsTasks.todo, ...wsTasks.inProgress].filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  const memberStats = members.map(m => {
    const assignedTasks = [
      ...wsTasks.todo,
      ...wsTasks.inProgress,
      ...wsTasks.done
    ].filter(t => t.assignee === m.id);
    
    const completed = assignedTasks.filter(t => t.status === 'done' || wsTasks.done.some(dt => dt.id === t.id)).length;
    const total = assignedTasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      member: m,
      total,
      completed,
      pending: total - completed,
      completionRate
    };
  });

  const onlineMembers = members.filter((m) => m.status === 'online');
  const awayMembers = members.filter((m) => m.status === 'away');
  const offlineMembers = members.filter((m) => m.status !== 'online' && m.status !== 'away');

  return (
    <div className="page-stack pb-8 min-w-0">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 min-w-0">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div
            className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center text-xl shrink-0"
            style={{ background: workspace.color + '18' }}
          >
            {workspace.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-h2 overflow-safe" style={{ color: 'var(--text-primary)' }}>
              {workspace.name}
            </h1>
            <p className="text-body-sm mt-2 overflow-safe" style={{ color: 'var(--text-secondary)' }}>
              {workspace.description || 'Team workspace'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            icon={UserPlus}
            onClick={() => {
              setShowInvite(true);
              setInviteError('');
              setInviteSuccess(false);
              setInviteEmail('');
            }}
          >
            Invite
          </Button>
          <Button variant="ghost" icon={Settings} aria-label="Settings" />
        </div>
      </header>

      <div
        className="inline-flex gap-1 p-1 rounded-[var(--radius-md)]"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        {workspaceTabs.map((t) => {
          const active = activeTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium transition-all cursor-pointer"
              style={{
                background: active ? 'var(--bg-elevated)' : 'transparent',
                color: active ? 'var(--text-brand)' : 'var(--text-secondary)',
                boxShadow: active ? 'var(--shadow-xs)' : 'none',
              }}
            >
              <Icon size={15} strokeWidth={1.75} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start min-w-0">
        <div className="flex-1 min-w-0 w-full max-w-full">
          <AnimatePresence mode="wait">
            {activeTab === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card
                  padding={false}
                  className="flex flex-col min-w-0"
                  style={{ height: 'clamp(420px, calc(100vh - 280px), 720px)', minHeight: '400px' }}
                >
                  <div
                    className="flex items-center gap-3 px-5 sm:px-6 py-4"
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                  >
                    <Hash size={18} strokeWidth={1.75} style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      general
                    </span>
                    <span className="text-caption hidden sm:inline truncate">Team channel</span>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <EmptyState
                          icon={MessageSquare}
                          title="Start the conversation"
                          description="Send a message to begin collaborating with your team in this channel."
                          compact
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {messages.map((msg, i) => {
                          const sender =
                            members.find((m) => m.id === msg.userId) ||
                            (msg.userId === user?.id ? user : null) ||
                            { name: 'Unknown User', initials: 'U', color: '#71717a' };
                          const showHeader = i === 0 || messages[i - 1]?.userId !== msg.userId;
                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex gap-3 group px-2 sm:px-3 py-2.5 rounded-[var(--radius-md)] transition-colors min-w-0 ${showHeader ? 'mt-4 first:mt-0' : ''}`}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <div className="w-8 sm:w-9 shrink-0">
                                {showHeader && (
                                  <Avatar
                                    name={sender?.name}
                                    initials={sender?.initials}
                                    color={sender?.color || 'var(--accent)'}
                                    size="sm"
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5 overflow-hidden">
                                {showHeader && (
                                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1">
                                    <span className="text-sm font-semibold overflow-safe" style={{ color: 'var(--text-primary)' }}>
                                      {sender?.name}
                                    </span>
                                    <span className="text-[11px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                                      {msg.timestamp}
                                    </span>
                                  </div>
                                )}
                                <p className="text-sm leading-relaxed overflow-safe" style={{ color: 'var(--text-secondary)' }}>
                                  {msg.text}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <form
                    onSubmit={send}
                    className="px-4 sm:px-6 py-4"
                    style={{ borderTop: '1px solid var(--border-color)' }}
                  >
                    <div
                      className="flex items-center gap-2 sm:gap-3 px-4 py-3 rounded-[var(--radius-md)] border transition-all"
                      style={{
                        background: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                      }}
                      onFocusCapture={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-focus)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)';
                      }}
                      onBlurCapture={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <button type="button" className="p-1.5 rounded-[var(--radius-sm)] cursor-pointer" style={{ color: 'var(--text-tertiary)' }}>
                        <Paperclip size={16} strokeWidth={1.75} />
                      </button>
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Message #general…"
                        className="flex-1 bg-transparent text-sm outline-none min-w-0"
                        style={{ color: 'var(--text-primary)' }}
                      />
                      <button type="button" className="p-1.5 rounded-[var(--radius-sm)] cursor-pointer hidden sm:block" style={{ color: 'var(--text-tertiary)' }}>
                        <Smile size={16} strokeWidth={1.75} />
                      </button>
                      <button
                        type="submit"
                        disabled={!message.trim()}
                        className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center text-white disabled:opacity-30 transition-colors cursor-pointer shrink-0"
                        style={{ background: 'var(--accent)' }}
                      >
                        <Send size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </form>
                </Card>
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card padding={false} className="min-h-[400px]">
                  <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <Activity size={18} style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Activity log
                    </span>
                  </div>
                  {(!activityFeed[workspace.id] || activityFeed[workspace.id].length === 0) ? (
                    <div className="py-20 flex items-center justify-center">
                      <EmptyState
                        icon={Activity}
                        title="No recent activity"
                        description="Updates on tasks, comments, files, and chat will appear here."
                        compact
                      />
                    </div>
                  ) : (
                    <div className="divide-y max-h-[600px] overflow-y-auto" style={{ divideColor: 'var(--border-color)' }}>
                      {activityFeed[workspace.id].map((act, idx) => {
                        const actor = act.user_id === user?.id ? 'You' : (act.profiles?.name || 'Someone');
                        return (
                          <div key={act.id || idx} className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-[var(--bg-hover)] transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full" style={{ background: workspace.color }} />
                              <div className="text-sm">
                                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{actor}</span>{' '}
                                <span style={{ color: 'var(--text-secondary)' }}>{act.details}</span>
                              </div>
                            </div>
                            <span className="text-caption text-xs shrink-0">
                              {formatActivityTime(act.created_at)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {activeTab === 'analytics' && isOwner && (
              <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                {/* Counters row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card padding className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{members.length}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Total Members</p>
                    </div>
                  </Card>
                  
                  <Card padding className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{messages.length}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Total Messages</p>
                    </div>
                  </Card>

                  <Card padding className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{wsFiles.length}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Files Shared</p>
                    </div>
                  </Card>

                  <Card padding className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
                      <CheckSquare size={20} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {completedTasksCount}/{totalTasksCount}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Tasks Completed</p>
                    </div>
                  </Card>
                </div>

                {/* Task breakdowns and productivity bar chart */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Task statuses card */}
                  <Card padding className="lg:col-span-1 space-y-4">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Task Statuses</h3>
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                          <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" /> To Do
                        </span>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{wsTasks.todo.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> In Progress
                        </span>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{wsTasks.inProgress.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed
                        </span>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{wsTasks.done.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm pt-2 border-t" style={{ borderColor: 'var(--border-light)' }}>
                        <span className="flex items-center gap-2 text-rose-500 font-semibold">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Overdue
                        </span>
                        <span className="font-bold text-rose-500">{overdueTasksCount}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Member productivity ratios */}
                  <Card padding className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Member Task Productivity</h3>
                    <div className="space-y-4 pt-2">
                      {memberStats.map(({ member, total, completed, pending, completionRate }) => (
                        <div key={member.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span style={{ color: 'var(--text-primary)' }}>{member.name}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {completed}/{total} tasks completed ({completionRate}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${completionRate}%`,
                                background: completionRate > 75 ? 'var(--color-success)' : completionRate > 40 ? 'var(--color-warning)' : 'var(--accent)'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.aside
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden xl:block w-72 shrink-0"
        >
          <Card padding={false}>
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border-color)' }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Members
                </p>
                <p className="text-caption mt-0.5">{members.length} in workspace</p>
              </div>
              <button
                onClick={() => {
                  setShowInvite(true);
                  setInviteError('');
                  setInviteSuccess(false);
                  setInviteEmail('');
                }}
                className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center transition-colors cursor-pointer"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-active)';
                  e.currentTarget.style.color = 'var(--text-brand)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-tertiary)';
                }}
              >
                <UserPlus size={15} strokeWidth={1.75} />
              </button>
            </div>

            {members.length === 0 ? (
              <p className="px-5 py-10 text-center text-caption">No members found.</p>
            ) : (
              <>
                {/* Online section */}
                {onlineMembers.length > 0 && (
                  <div className="px-4 pt-5 pb-3">
                    <p className="text-label mb-3 px-1 text-emerald-500 font-semibold">
                      Online — {onlineMembers.length}
                    </p>
                    <div className="space-y-0.5">
                      {onlineMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] transition-colors cursor-pointer"
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <Avatar
                            name={member.name}
                            initials={member.initials}
                            color={member.color || 'var(--accent)'}
                            size="xs"
                            status="online"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                              {member.name}
                              {member.id === workspace.ownerId && (
                                <span
                                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider shrink-0"
                                  style={{
                                    background: 'rgba(245,158,11,0.12)',
                                    color: '#f59e0b',
                                    border: '1px solid rgba(245,158,11,0.2)',
                                  }}
                                >
                                  Owner
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                              {member.role}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Away section */}
                {awayMembers.length > 0 && (
                  <div className="px-4 py-3" style={{ borderTop: onlineMembers.length > 0 ? '1px solid var(--border-light)' : 'none' }}>
                    <p className="text-label mb-3 px-1 text-amber-500 font-semibold">
                      Away — {awayMembers.length}
                    </p>
                    <div className="space-y-0.5">
                      {awayMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] transition-colors cursor-pointer"
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <Avatar
                            name={member.name}
                            initials={member.initials}
                            color={member.color || 'var(--accent)'}
                            size="xs"
                            status="away"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                              {member.name}
                              {member.id === workspace.ownerId && (
                                <span
                                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider shrink-0"
                                  style={{
                                    background: 'rgba(245,158,11,0.12)',
                                    color: '#f59e0b',
                                    border: '1px solid rgba(245,158,11,0.2)',
                                  }}
                                >
                                  Owner
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                              {member.role}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Offline section */}
                {offlineMembers.length > 0 && (
                  <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border-light)' }}>
                    <p className="text-label mb-3 px-1 text-zinc-500">Offline</p>
                    <div className="space-y-0.5">
                      {offlineMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] opacity-70 transition-colors cursor-pointer"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-hover)';
                            e.currentTarget.style.opacity = '1.0';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.opacity = '0.7';
                          }}
                        >
                          <Avatar
                            name={member.name}
                            initials={member.initials}
                            color={member.color || 'var(--accent)'}
                            size="xs"
                            status="offline"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm truncate font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                              {member.name}
                              {member.id === workspace.ownerId && (
                                <span
                                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider shrink-0"
                                  style={{
                                    background: 'rgba(245,158,11,0.12)',
                                    color: '#f59e0b',
                                    border: '1px solid rgba(245,158,11,0.2)',
                                  }}
                                >
                                  Owner
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                              {formatLastSeen(member.lastSeen)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </motion.aside>
      </div>

      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite member">
        <form onSubmit={handleInviteSubmit} className="space-y-5">
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
            Enter the email of the person you want to add to this workspace.
          </p>
          <Input
            label="Email address"
            type="email"
            placeholder="colleague@domain.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          {inviteError && (
            <p className="text-xs font-medium" style={{ color: 'var(--color-danger)' }}>
              {inviteError}
            </p>
          )}
          {inviteSuccess && (
            <div
              className="p-3 rounded-[var(--radius-md)] flex items-center gap-2 text-xs font-medium"
              style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--color-success)' }}
            >
              <Check size={14} />
              Member added successfully
            </div>
          )}
          <div className="pt-4" style={{ borderTop: '1px solid var(--border-light)' }}>
            <label className="text-label block mb-3">Or share invite code</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={workspace?.inviteCode || 'N/A'}
                className="input-base font-mono text-center tracking-wider text-sm select-all flex-1"
                style={{ background: 'var(--bg-subtle)' }}
              />
              <Button variant="secondary" type="button" onClick={handleCopyCode} icon={copiedCode ? Check : Copy}>
                {copiedCode ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={inviteSuccess}>
              Add to workspace
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
