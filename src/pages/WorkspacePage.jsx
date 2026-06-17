import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  MessageSquare, Send, Smile, Hash,
  UserPlus, MoreHorizontal, Settings, Check, Copy,
  FileText, CheckSquare, Users, MapPin, Phone, PhoneCall,
  Video, Trash2, Upload, Download, Grid, List, File,
  CloudUpload, Plus, Search, AlertCircle,
  Calendar, Edit3, FolderKanban
} from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import { PriorityBadge } from '../components/ui/Badge';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const PALETTE = ['#5e6ad2', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

const KANBAN_COLS = {
  todo: { title: 'To do', dotColor: '#9ca3af', accent: 'var(--bg-secondary)' },
  inProgress: { title: 'In progress', dotColor: '#f59e0b', accent: 'rgba(245,158,11,0.04)' },
  done: { title: 'Done', dotColor: '#10b981', accent: 'rgba(16,185,129,0.04)' },
};

// fileTypeConfig deleted

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handleFocusIn = (e) => {
      const tagName = e.target.tagName;
      const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA' || e.target.isContentEditable;
      if (isInput) setVisible(true);
    };
    const handleFocusOut = () => setVisible(false);
    const handleResize = () => {
      if (window.visualViewport) {
        setVisible(window.innerHeight - window.visualViewport.height > 150);
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);
  return visible;
}

export default function WorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

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
    files,
    typingUsers,
    sendTypingIndicator,
    deleteWorkspace,
    // Calling context
    activeCalls = {},
    startCall,
    joinCall,
    callError,
    clearCallError,
    // Task operations
    addTask,
    updateTasks,
    updateTaskDetails,
    deleteTask,
    taskComments,
    addTaskComment,
    // File operations
    uploadFile,
    downloadFile,
    deleteFile
  } = useWorkspace();
  
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update opened workspace tracker & details load
  useEffect(() => {
    if (id && user?.id) {
      fetchWorkspaceDetails(id);
      
      const openedKey = `nexus_ws_opened_${user.id}`;
      try {
        const openedMap = JSON.parse(localStorage.getItem(openedKey) || '{}');
        openedMap[id] = new Date().toISOString();
        localStorage.setItem(openedKey, JSON.stringify(openedMap));
      } catch (e) {
        console.error(e);
      }
    }
  }, [id, fetchWorkspaceDetails, user?.id]);

  useEffect(() => {
    if (!loading && workspaces.length === 0) navigate('/dashboard');
  }, [loading, workspaces, navigate]);

  const workspace = workspaces.find((w) => w.id === id);

  // Tab change wrapper
  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  // Modals & Local states
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const isKeyboardVisible = useKeyboardVisible();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Chat message send handler
  const [message, setMessage] = useState('');
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const messages = useMemo(() => (workspace ? chatMessages[workspace.id] || [] : []), [workspace, chatMessages]);

  useEffect(() => {
    if (messages.length && activeTab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !workspace) return;
    addChatMessage(workspace.id, message);
    setMessage('');
  };

  // Typing indicator
  const typingTimeoutRef = useRef(null);
  useEffect(() => {
    if (!id || activeTab !== 'chat') return;
    if (message.trim()) {
      sendTypingIndicator(id, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => sendTypingIndicator(id, false), 3000);
    } else {
      sendTypingIndicator(id, false);
    }
  }, [message, id, activeTab, sendTypingIndicator]);

  // Tasks Sub-tab filter
  const [tasksFilter, setTasksFilter] = useState('all');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskData, setNewTaskData] = useState({ title: '', description: '', assignee: '', priority: 'medium', dueDate: '' });
  const [selectedTask, setSelectedTask] = useState(null);
  const [commentText, setCommentText] = useState('');

  // Files state
  const [fileSearch, setFileSearch] = useState('');
  const [filesViewLayout, setFilesViewLayout] = useState('list');
  const [previewFile, setPreviewFile] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const objectUrlRef = useRef(null);

  const handlePreviewFile = (file) => {
    setPreviewLoading(true);
    setPreviewContent(null);
    setPreviewFile(file);
  };

  // Notes state (localStorage sync)
  const [notes, setNotes] = useState(() => {
    try {
      const stored = localStorage.getItem(`nexus_notes_${id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [activeNoteId, setActiveNoteId] = useState(null);
  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId), [notes, activeNoteId]);

  // Meetings state (localStorage sync)
  const [meetings, setMeetings] = useState(() => {
    try {
      const stored = localStorage.getItem(`nexus_meetings_${id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showScheduleMeeting, setShowScheduleMeeting] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: '', date: '', time: '', description: '' });

  // Settings states
  const [renameValue, setRenameValue] = useState(workspace?.name || '');
  const [colorValue, setColorValue] = useState(workspace?.color || '#5e6ad2');
  const [prevWorkspaceId, setPrevWorkspaceId] = useState(workspace?.id);
  if (workspace && workspace.id !== prevWorkspaceId) {
    setPrevWorkspaceId(workspace.id);
    setRenameValue(workspace.name);
    setColorValue(workspace.color);
  }

  // Files manager calculations
  const filteredFiles = useMemo(() => {
    const wsFiles = workspace?.id ? (files[workspace.id] || []) : [];
    return wsFiles.filter(f => f.name.toLowerCase().includes(fileSearch.toLowerCase()));
  }, [workspace, files, fileSearch]);

  // Previews files effect (without synchronous setState)
  useEffect(() => {
    if (!previewFile) return;
    let active = true;
    const loadPreview = async () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      try {
        if (isSupabaseConfigured && previewFile.storagePath) {
          const { data, error } = await supabase.storage.from('files').download(previewFile.storagePath);
          if (error) throw error;
          if (!active) return;
          if (previewFile.type === 'image' || previewFile.type === 'pdf') {
            const url = URL.createObjectURL(data);
            objectUrlRef.current = url;
            setPreviewContent({ url });
          } else {
            const text = await data.text();
            setPreviewContent({ text });
          }
        } else {
          // Local fallback
          if (previewFile.type === 'image') {
            setPreviewContent({ url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80' });
          } else if (previewFile.type === 'pdf') {
            setPreviewContent({ url: 'https://pdfobject.com/pdf/sample.pdf' });
          } else {
            setPreviewContent({ text: `Content preview for: ${previewFile.name}\nSize: ${previewFile.size}\nUploaded: ${previewFile.uploadedAt}` });
          }
        }
      } catch (err) {
        console.error(err);
        if (active) setPreviewContent({ error: 'Failed to load file preview. Please download the file to view it.' });
      } finally {
        if (active) setPreviewLoading(false);
      }
    };
    loadPreview();
    return () => {
      active = false;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [previewFile]);

  // Activity feeds specific to workspace
  const workspaceActivities = useMemo(() => {
    if (!workspace?.id) return [];
    const list = activityFeed[workspace.id] || [];
    return list.slice(0, 10);
  }, [activityFeed, workspace]);

  if (loading) return <LoadingState label="Loading workspace…" />;

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <EmptyState
          icon={Users}
          title="Workspace not found"
          description="The workspace you are trying to access does not exist or you don't have access to it."
          actionLabel="Go to Dashboard"
          onAction={() => navigate('/dashboard')}
        />
      </div>
    );
  }

  const isOwner = workspace.ownerId === user?.id;
  const wsFiles = files[workspace.id] || [];

  const workspaceTabs = [
    { id: 'overview', icon: FolderKanban, label: 'Overview' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'files', icon: FileText, label: 'Files' },
    { id: 'notes', icon: File, label: 'Notes' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'meetings', icon: Video, label: 'Meetings' },
    { id: 'members', icon: Users, label: 'Members' }
  ];
  if (isOwner) {
    workspaceTabs.push({ id: 'settings', icon: Settings, label: 'Settings' });
  }

  // Workspace members & online presence sync
  const members = (workspaceMembers[workspace.id] || []).map(m => {
    const pres = userPresence[m.id] || { status: 'offline', lastSeen: null };
    return {
      ...m,
      status: pres.status,
      lastSeen: pres.lastSeen
    };
  });

  const onlineMembers = members.filter((m) => m.status === 'online');
  const awayMembers = members.filter((m) => m.status === 'away');
  const offlineMembers = members.filter((m) => m.status !== 'online' && m.status !== 'away');

  const activeTyping = Object.keys(typingUsers || {})
    .filter(uid => uid !== user?.id && currentTime - typingUsers[uid].timestamp < 6000)
    .map(uid => typingUsers[uid].name);

  // Invite triggers
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

  // Delete triggering
  const handleDeleteWorkspace = async () => {
    if (deleteConfirmName !== workspace.name) {
      setDeleteError('Workspace name does not match.');
      return;
    }
    setDeleteError('');
    try {
      const res = await deleteWorkspace(workspace.id);
      if (res?.success) {
        setShowDeleteModal(false);
        navigate('/dashboard');
      } else {
        setDeleteError(res?.error || 'Failed to delete workspace.');
      }
    } catch (err) {
      console.error(err);
      setDeleteError('An unexpected error occurred.');
    }
  };

  // Settings updating
  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    if (!renameValue.trim()) return;
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('workspaces')
          .update({ name: renameValue.trim(), color: colorValue })
          .eq('id', workspace.id);
        if (error) throw error;
        // Refetch workspaces
        fetchWorkspaceDetails(workspace.id);
      } catch (err) {
        console.error(err);
      }
    } else {
      // Local fallback
      const stored = localStorage.getItem(`nexus_workspaces_${user?.id}`);
      if (stored) {
        const list = JSON.parse(stored);
        const updated = list.map(w => w.id === workspace.id ? { ...w, name: renameValue.trim(), color: colorValue } : w);
        localStorage.setItem(`nexus_workspaces_${user?.id}`, JSON.stringify(updated));
        window.location.reload();
      }
    }
  };

  // Notes operations
  const createNewNote = () => {
    const newNote = {
      id: `note_${Date.now()}`,
      title: 'Untitled Note',
      content: '',
      updatedAt: new Date().toISOString()
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    localStorage.setItem(`nexus_notes_${workspace.id}`, JSON.stringify(updated));
    setActiveNoteId(newNote.id);
  };

  const handleEditNote = (noteId, title, content) => {
    const updated = notes.map(n => n.id === noteId ? { ...n, title, content, updatedAt: new Date().toISOString() } : n);
    setNotes(updated);
    localStorage.setItem(`nexus_notes_${workspace.id}`, JSON.stringify(updated));
  };

  const handleDeleteNote = (noteId) => {
    const updated = notes.filter(n => n.id !== noteId);
    setNotes(updated);
    localStorage.setItem(`nexus_notes_${workspace.id}`, JSON.stringify(updated));
    if (activeNoteId === noteId) setActiveNoteId(null);
  };

  // Meetings operations
  const handleScheduleMeetingSubmit = (e) => {
    e.preventDefault();
    if (!newMeeting.title.trim() || !newMeeting.date) return;

    const mtg = {
      id: `meeting_${Date.now()}`,
      title: newMeeting.title.trim(),
      date: newMeeting.date,
      time: newMeeting.time || '12:00',
      description: newMeeting.description.trim(),
      createdBy: user?.name || 'Organizer'
    };

    const updated = [mtg, ...meetings].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    setMeetings(updated);
    localStorage.setItem(`nexus_meetings_${workspace.id}`, JSON.stringify(updated));
    setNewMeeting({ title: '', date: '', time: '', description: '' });
    setShowScheduleMeeting(false);
  };

  const handleDeleteMeeting = (meetingId) => {
    const updated = meetings.filter(m => m.id !== meetingId);
    setMeetings(updated);
    localStorage.setItem(`nexus_meetings_${workspace.id}`, JSON.stringify(updated));
  };

  // Tasks utilities
  const wsTasks = tasks[workspace.id] || { todo: [], inProgress: [], done: [] };
  const allTasksList = [...wsTasks.todo, ...wsTasks.inProgress, ...wsTasks.done];
  const completedTasksCount = wsTasks.done.length;
  const totalTasksCount = allTasksList.length;

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'done') return false;
    return new Date(dueDate) < new Date();
  };

  const filterTaskFn = (task) => {
    if (tasksFilter === 'my') return task.assignee === user?.id;
    if (tasksFilter === 'completed') return task.status === 'done';
    if (tasksFilter === 'overdue') return isOverdue(task.dueDate, task.status);
    return true;
  };

  const todoList = wsTasks.todo?.filter(filterTaskFn) || [];
  const inProgressList = wsTasks.inProgress?.filter(filterTaskFn) || [];
  const doneList = wsTasks.done?.filter(filterTaskFn) || [];

  const onDragEnd = ({ source: s, destination: d }) => {
    if (!d) return;
    const movedTaskId = wsTasks[s.droppableId][s.index].id;
    const movedTaskObj = [...wsTasks[s.droppableId], ...wsTasks[d.droppableId]].find(t => t.id === movedTaskId);
    if (!isOwner && movedTaskObj?.assignee !== user?.id) {
      alert("You only have permission to update tasks assigned to you.");
      return;
    }

    if (s.droppableId === d.droppableId) {
      const col = [...wsTasks[s.droppableId]];
      const [item] = col.splice(s.index, 1);
      col.splice(d.index, 0, item);
      updateTasks(workspace.id, { ...wsTasks, [s.droppableId]: col });
    } else {
      const src = [...wsTasks[s.droppableId]];
      const dst = [...wsTasks[d.droppableId]];
      const [item] = src.splice(s.index, 1);
      const updatedItem = { ...item, status: d.droppableId };
      dst.splice(d.index, 0, updatedItem);
      updateTasks(workspace.id, { ...wsTasks, [s.droppableId]: src, [d.droppableId]: dst });
    }
  };

  const handleCreateTaskSubmit = (e) => {
    e.preventDefault();
    if (!newTaskData.title.trim()) return;
    addTask(workspace.id, newTaskData);
    setNewTaskData({ title: '', description: '', assignee: '', priority: 'medium', dueDate: '' });
    setShowCreateTask(false);
  };

  const handleEditTaskSubmit = (e) => {
    e.preventDefault();
    if (!selectedTask?.title.trim()) return;
    updateTaskDetails(workspace.id, selectedTask.id, {
      title: selectedTask.title,
      description: selectedTask.description,
      assignee: selectedTask.assignee,
      priority: selectedTask.priority,
      dueDate: selectedTask.dueDate,
      status: selectedTask.status
    });
    setSelectedTask(null);
  };

  const handleAddTaskCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;
    addTaskComment(selectedTask.id, commentText.trim());
    setCommentText('');
  };

  const handleTaskDelete = (taskId) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask(workspace.id, taskId);
      setSelectedTask(null);
    }
  };

  const dueDateColor = (ds) => {
    if (!ds) return 'var(--text-tertiary)';
    const d = (new Date(ds) - new Date()) / 86400000;
    if (d < 0) return 'var(--color-danger)';
    if (d < 3) return 'var(--color-warning)';
    return 'var(--text-tertiary)';
  };

  // Files manager component state helper

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const meta = {
      name: file.name,
      type: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : file.type.includes('sheet') || file.name.endsWith('.csv') ? 'spreadsheet' : 'document',
      size: `${(file.size / 1024).toFixed(0)} KB`,
      icon: '📄'
    };
    await uploadFile(workspace.id, meta, file);
  };

  // Preview effect moved to top

  // Timestamps relative
  const formatActivityTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMessageTime = (msg) => {
    if (!msg.createdAt) return msg.timestamp || '';
    const date = new Date(msg.createdAt);
    if (isNaN(date.getTime())) return msg.timestamp || '';
    const now = new Date();
    const isToday = now.toDateString() === date.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? timeStr : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
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

  // workspaceActivities and unused metrics removed / moved to top

  return (
    <div className="page-stack pb-8 min-w-0">
      {/* Workspace Header — Glass */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 min-w-0">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div
            className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center text-lg shrink-0"
            style={{ background: workspace.color + '18', color: workspace.color, border: `1px solid ${workspace.color}25` }}
          >
            {workspace.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-medium tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
                {workspace.name}
              </h1>
              {activeCalls[workspace.id] && (
                <span className="flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-[var(--radius-pill)] uppercase animate-pulse" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <Phone size={8} strokeWidth={1.5} /> Huddle Live
                </span>
              )}
            </div>
            <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
              {workspace.description || 'Collaborative workspace hub.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            icon={UserPlus}
            onClick={() => {
              setShowInvite(true);
              setInviteError('');
              setInviteSuccess(false);
              setInviteEmail('');
            }}
          >
            Invite Member
          </Button>
        </div>
      </header>

      {/* Tabs — Glass Tab Container */}
      <div className="glass-tab-container flex gap-1 self-start mb-6 overflow-x-auto no-scrollbar max-w-full">
        {workspaceTabs.map((t) => {
          const active = activeTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`relative flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer shrink-0 ${active ? 'glass-tab-active' : 'rounded-[var(--radius-md)] hover:bg-[rgba(255,255,255,0.05)]'}`}
              style={{
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon size={13} strokeWidth={1.5} style={{ color: active ? 'var(--accent)' : 'var(--text-secondary)' }} />
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start min-w-0 w-full">
        <div className="flex-1 min-w-0 w-full max-w-full">
          <AnimatePresence mode="wait">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                
                {/* Active Workspace Huddle Box */}
                {activeCalls[workspace.id] ? (
                  <div className="glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                        <PhoneCall size={18} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Ongoing Workspace Huddle</h3>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          Started by {activeCalls[workspace.id].callerName} · {activeCalls[workspace.id].participants?.length || 1} participant(s) in call
                        </p>
                      </div>
                    </div>
                    <Button variant="primary" size="sm" className="shrink-0" style={{ background: 'rgba(16,185,129,0.5)', borderColor: 'rgba(16,185,129,0.4)' }} onClick={() => joinCall(workspace.id)}>
                      Join Huddle
                    </Button>
                  </div>
                ) : (
                  <div className="glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                        <Phone size={16} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Workspace Voice Huddle</h3>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Start a real-time call to discuss topics with your teammates.</p>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" icon={PhoneCall} className="shrink-0" onClick={() => startCall(workspace.id)}>
                      Start Call
                    </Button>
                  </div>
                )}

                {/* Call error banner */}
                {callError && (
                  <div style={{
                    padding: '12px 16px', borderRadius: '12px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                  }}>
                    <span style={{ fontSize: '16px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>⚠️</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#fca5a5', marginBottom: '3px' }}>Call failed to start</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{callError}</p>
                    </div>
                    <button
                      onClick={clearCallError}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '16px', lineHeight: 1, padding: '0', flexShrink: 0 }}
                      title="Dismiss"
                    >×</button>
                  </div>
                )}

                {/* Workspace Quick Actions — flex-wrap with gap:12px */}
                <Card padding={false} className="" style={{ padding: '20px 24px', boxSizing: 'border-box' }}>
                  <h3 className="section-label" style={{ marginBottom: '12px' }}>Workspace Actions</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {[
                      { onClick: () => setShowCreateTask(true), icon: CheckSquare, label: 'Create Task' },
                      { isUpload: true, icon: Upload, label: 'Upload File' },
                      { onClick: createNewNote, icon: File, label: 'Create Note' },
                      { onClick: () => startCall(workspace.id), icon: PhoneCall, label: 'Start Call' },
                      { onClick: () => { handleTabChange('meetings'); setShowScheduleMeeting(true); }, icon: Calendar, label: 'Schedule Meeting' },
                      { onClick: () => setShowInvite(true), icon: UserPlus, label: 'Invite Member' },
                    ].map((action, i) => {
                      const ActionIcon = action.icon;
                      const content = (
                        <>
                          <div className="flex items-center justify-center" style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border-light)', flexShrink: 0 }}>
                            <ActionIcon size={16} strokeWidth={1.5} className="icon-glow" style={{ color: 'var(--text-tertiary)' }} />
                          </div>
                          <span className="text-truncate" style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-primary)' }}>{action.label}</span>
                        </>
                      );
                      if (action.isUpload) {
                        return (
                          <label key={i} style={{ flex: '1 1 120px', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 8px', borderRadius: '16px', textAlign: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border-light)', cursor: 'pointer', boxSizing: 'border-box', overflow: 'hidden' }}>
                            <input type="file" onChange={handleFileUpload} className="hidden" />
                            {content}
                          </label>
                        );
                      }
                      return (
                        <button key={i} onClick={action.onClick} style={{ flex: '1 1 120px', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 8px', borderRadius: '16px', textAlign: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border-light)', cursor: 'pointer', boxSizing: 'border-box', overflow: 'hidden', transition: 'background 0.2s' }}>
                          {content}
                        </button>
                      );
                    })}
                  </div>
                </Card>

                {/* Stats & Activity — Glass Metric Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Glass Stats Cards */}
                  <div className="space-y-4">
                    {[
                      { icon: Users, value: members.length, label: 'Total Members', iconBg: 'rgba(129,140,248,0.12)', iconColor: 'var(--accent)' },
                      { icon: CheckSquare, value: `${completedTasksCount}/${totalTasksCount}`, label: 'Tasks Completed', iconBg: 'rgba(16,185,129,0.12)', iconColor: '#34d399' },
                      { icon: FileText, value: wsFiles.length, label: 'Shared Files', iconBg: 'rgba(251,191,36,0.12)', iconColor: '#fbbf24' },
                    ].map((stat, i) => {
                      const StatIcon = stat.icon;
                      return (
                        <div key={i} className="glass-stat-card flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0" style={{ background: stat.iconBg, color: stat.iconColor }}>
                            <StatIcon size={15} strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="text-base font-medium leading-none" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
                            <p className="text-[9px] uppercase font-medium tracking-wider mt-1" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Activity Timeline — Fix "Someone" bug */}
                  <Card padding className="lg:col-span-2 space-y-4">
                    <h3 className="section-label" style={{ marginBottom: '8px' }}>Workspace Activity</h3>
                    {workspaceActivities.length === 0 ? (
                      <div className="py-10 text-center rounded-[var(--radius-lg)]" style={{ border: '1px dashed var(--glass-border)' }}>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No recent activity.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 pt-2">
                        {workspaceActivities.map((act) => {
                          const actorName = act.profiles?.name ?? act.profiles?.display_name ?? act.profiles?.email ?? 'A member';
                          return (
                            <div key={act.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px' }}>
                              <div style={{ flexShrink: 0, width: '24px' }}>
                                <Avatar name={actorName} initials={actorName.slice(0, 2).toUpperCase()} size="xs" />
                              </div>
                              <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                                <p className="text-truncate" style={{ color: 'var(--text-secondary)' }}>
                                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{actorName}</span>{' '}
                                  {act.details}
                                </p>
                                <span style={{ fontSize: '9px', fontFamily: 'monospace', display: 'block', marginTop: '2px', color: 'var(--text-tertiary)' }}>
                                  {formatActivityTime(act.created_at || act.createdAt)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </div>
              </motion.div>
            )}

            {/* TASKS TAB */}
            {activeTab === 'tasks' && (
              <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex gap-1.5 p-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                    {[
                      { id: 'all', label: 'All Tasks' },
                      { id: 'my', label: 'My Tasks' },
                      { id: 'completed', label: 'Completed' },
                      { id: 'overdue', label: 'Overdue' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setTasksFilter(tab.id)}
                        className={`px-3 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${tasksFilter === tab.id ? 'bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] shadow-xs' : 'text-[var(--text-secondary)]'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <Button icon={Plus} size="sm" onClick={() => setShowCreateTask(true)}>
                    Create Task
                  </Button>
                </div>

                {totalTasksCount === 0 ? (
                  <EmptyState
                    icon={CheckSquare}
                    title="No tasks assigned yet"
                    description="Create a task to map your product roadmap."
                    actionLabel="Create Task"
                    onAction={() => setShowCreateTask(true)}
                  />
                ) : (
                  <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory">
                      {Object.entries(KANBAN_COLS).map(([colId, cfg]) => {
                        const columnTasks = colId === 'todo' ? todoList : colId === 'inProgress' ? inProgressList : doneList;
                        return (
                          <div key={colId} className="flex flex-col snap-start" style={{ width: '280px', flexShrink: 0, overflow: 'hidden' }}>
                            <div className="flex items-center justify-between mb-3 px-1">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dotColor }} />
                                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                  {cfg.title}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                                  {columnTasks.length}
                                </span>
                              </div>
                            </div>

                            <Droppable droppableId={colId}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className="flex-1 rounded-[var(--radius-lg)] space-y-3 p-3 transition-all duration-200"
                                  style={{
                                    background: snapshot.isDraggingOver ? cfg.accent : 'var(--bg-secondary)',
                                    border: snapshot.isDraggingOver ? `1px dashed ${cfg.dotColor}55` : '1px solid var(--border-color)',
                                    minHeight: 300,
                                  }}
                                >
                                  {columnTasks.map((task, i) => {
                                    const assignee = members.find((m) => m.id === task.assignee);
                                    const isDragDisabled = !isOwner && task.assignee !== user?.id;
                                    return (
                                      <Draggable key={task.id} draggableId={task.id} index={i} isDragDisabled={isDragDisabled}>
                                        {(prov, snap) => (
                                          <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} style={{ ...prov.draggableProps.style }}>
                                            <div
                                              onClick={() => setSelectedTask({ ...task, status: colId })}
                                              className="glass-card cursor-pointer transition-all hover:shadow-xs"
                                              style={{ boxShadow: snap.isDragging ? 'var(--shadow-md)' : 'none', padding: '12px 14px', boxSizing: 'border-box', width: '100%' }}
                                            >
                                              <h3 style={{ fontSize: '12px', fontWeight: 600, lineHeight: 1.4, marginBottom: '4px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                                                {task.title}
                                              </h3>
                                              {task.description && (
                                                <p className="text-clamp-2" style={{ fontSize: '10px', lineHeight: 1.5, color: 'var(--text-tertiary)', marginBottom: '10px' }}>
                                                  {task.description}
                                                </p>
                                              )}
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                                                <div className="flex items-center gap-2">
                                                  {assignee && (
                                                    <Avatar name={assignee.name} initials={assignee.initials} color={assignee.color} size="xs" />
                                                  )}
                                                  <PriorityBadge priority={task.priority} />
                                                </div>
                                                {task.dueDate && (
                                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', flexShrink: 0, color: dueDateColor(task.dueDate), border: `1px solid ${dueDateColor(task.dueDate)}1c` }}>
                                                    {task.dueDate}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    );
                                  })}
                                  {provided.placeholder}
                                  {columnTasks.length === 0 && (
                                    <p className="text-[10px] text-center text-[var(--text-tertiary)] py-10">No tasks</p>
                                  )}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        );
                      })}
                    </div>
                  </DragDropContext>
                )}
              </motion.div>
            )}

            {/* FILES TAB */}
            {activeTab === 'files' && (
              <motion.div key="files" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-sm w-full">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-tertiary)]" />
                    <input
                      type="text"
                      placeholder="Search files…"
                      value={fileSearch}
                      onChange={(e) => setFileSearch(e.target.value)}
                      className="input-base text-xs pl-9 pr-4 py-2 w-full rounded-lg"
                    />
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="flex rounded-md border border-[var(--border-color)] overflow-hidden">
                      <button onClick={() => setFilesViewLayout('list')} className={`p-1.5 cursor-pointer ${filesViewLayout === 'list' ? 'bg-[var(--bg-secondary)]' : 'bg-transparent'}`}>
                        <List size={14} />
                      </button>
                      <button onClick={() => setFilesViewLayout('grid')} className={`p-1.5 cursor-pointer ${filesViewLayout === 'grid' ? 'bg-[var(--bg-secondary)]' : 'bg-transparent'}`}>
                        <Grid size={14} />
                      </button>
                    </div>
                    <label className="inline-flex items-center justify-center gap-1.5 px-4 h-8 text-xs font-semibold text-white bg-[var(--accent)] hover:opacity-95 rounded-lg cursor-pointer">
                      <input type="file" onChange={handleFileUpload} className="hidden" />
                      <Upload size={12} /> Upload File
                    </label>
                  </div>
                </div>

                {filteredFiles.length === 0 ? (
                  <EmptyState
                    icon={CloudUpload}
                    title="No files found"
                    description={fileSearch ? "No files matches your search query." : "Share design assets, documents, and spreadsheets here."}
                  />
                ) : filesViewLayout === 'list' ? (
                  <div className="surface-panel overflow-hidden border border-[var(--border-color)] rounded-xl">
                    <div className="divide-y divide-[var(--border-light)]">
                      {filteredFiles.map(file => (
                        <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', overflow: 'hidden' }} className="hover:bg-[var(--bg-hover)] transition-colors">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => handlePreviewFile(file)}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                              <FileText size={15} />
                            </div>
                            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                              <p className="text-truncate" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</p>
                              <p className="text-truncate" style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{file.size} · Uploaded by {members.find(m => m.id === file.uploadedBy)?.name ?? members.find(m => m.id === file.uploadedBy)?.email ?? 'A member'}</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            <button onClick={() => downloadFile(file)} className="p-1.5 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                              <Download size={13} />
                            </button>
                            <button onClick={() => deleteFile(workspace.id, file.id)} className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-500">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredFiles.map(file => (
                      <Card key={file.id} padding className="flex flex-col justify-between items-center text-center p-4 hover:border-[var(--border-focus)] transition-all select-none">
                        <div className="flex flex-col items-center gap-2 cursor-pointer w-full" onClick={() => handlePreviewFile(file)}>
                          <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center text-lg border border-[var(--border-color)]">
                            <FileText size={20} />
                          </div>
                          <p className="text-xs font-semibold text-[var(--text-primary)] truncate w-full px-1">{file.name}</p>
                        </div>
                        <div className="flex justify-between items-center w-full pt-3 mt-3 border-t border-[var(--border-light)]">
                          <span className="text-[9px] text-[var(--text-tertiary)] font-semibold">{file.size}</span>
                          <div className="flex gap-1">
                            <button onClick={() => downloadFile(file)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                              <Download size={11} />
                            </button>
                            <button onClick={() => deleteFile(workspace.id, file.id)} className="p-1 text-[var(--text-tertiary)] hover:text-red-500">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* NOTES TAB */}
            {activeTab === 'notes' && (
              <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex flex-col md:flex-row gap-6 items-stretch min-h-[450px]">
                  
                  {/* Sidebar list */}
                  <div className="w-full md:w-64 shrink-0 flex flex-col gap-3.5 border-r border-[var(--border-color)] pr-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Notes list</h3>
                      <button onClick={createNewNote} className="w-6 h-6 rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] flex items-center justify-center cursor-pointer">
                        <Plus size={12} />
                      </button>
                    </div>

                    {notes.length === 0 ? (
                      <p className="text-[11px] text-center text-[var(--text-tertiary)] py-12">No workspace notes.</p>
                    ) : (
                      <div className="space-y-1.5 flex-1 overflow-y-auto">
                        {notes.map(n => (
                          <div
                            key={n.id}
                            onClick={() => setActiveNoteId(n.id)}
                            className={`p-3 rounded-lg border text-left cursor-pointer transition-colors group flex items-center justify-between gap-3 ${activeNoteId === n.id ? 'bg-[var(--bg-active)] border-[var(--border-focus)]' : 'bg-[var(--bg-primary)] border-[var(--border-color)] hover:bg-[var(--bg-hover)]'}`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{n.title || 'Untitled Note'}</p>
                              <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5 font-mono">{new Date(n.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteNote(n.id); }} className="opacity-0 group-hover:opacity-100 hover:text-red-500 text-[var(--text-tertiary)] p-1 transition-all shrink-0">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Note Editor */}
                  <div className="flex-1 min-w-0">
                    {activeNote ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                          <input
                            type="text"
                            value={activeNote.title}
                            onChange={(e) => handleEditNote(activeNote.id, e.target.value, activeNote.content)}
                            placeholder="Untitled Note"
                            className="bg-transparent border-none text-base font-bold text-[var(--text-primary)] focus:outline-none flex-1 min-w-0"
                          />
                          <span className="text-[9px] text-[var(--text-tertiary)] font-mono">
                            Auto-saved
                          </span>
                        </div>
                        <textarea
                          placeholder="Start typing note content here…"
                          value={activeNote.content}
                          onChange={(e) => handleEditNote(activeNote.id, activeNote.title, e.target.value)}
                          className="w-full min-h-[300px] bg-transparent border-none text-xs leading-relaxed focus:outline-none resize-none text-[var(--text-secondary)]"
                        />
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center py-20">
                        <Edit3 className="w-10 h-10 text-[var(--text-tertiary)] mb-3 animate-pulse" />
                        <p className="text-xs font-semibold text-[var(--text-primary)]">No note selected</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Select an existing note or click below to create one.</p>
                        <Button variant="secondary" size="sm" className="mt-4 h-7.5 text-[11px]" onClick={createNewNote}>
                          Create Note
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card
                  padding={false}
                  className="flex flex-col min-w-0 bg-[var(--bg-primary)] border-[var(--border-color)] overflow-hidden shadow-sm rounded-[var(--radius-xl)]"
                  style={{
                    height: isMobile
                      ? (isKeyboardVisible ? 'calc(100dvh - 130px)' : 'calc(100dvh - 200px)')
                      : 'clamp(400px, calc(100vh - 240px), 700px)',
                    minHeight: isMobile ? '280px' : '400px'
                  }}
                >
                  <div
                    className="flex items-center justify-between px-5 py-3 border-b"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-subtle)' }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Hash size={15} className="text-[var(--accent)] shrink-0" />
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                        general
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-[10px] text-[var(--text-tertiary)] hidden sm:inline truncate">Company general workspace discussions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                        {messages.length} messages
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 py-5 space-y-1.5 scrollbar-thin">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <EmptyState
                          icon={MessageSquare}
                          title="No messages"
                          description="Send a message to start collaborating in #general."
                          compact
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {messages.map((msg, i) => {
                           const sender =
                            members.find((m) => m.id === msg.userId) ||
                            (msg.userId === user?.id ? user : null) ||
                            { name: 'Member', initials: 'M', color: '#71717a' };
                           const showHeader = i === 0 || messages[i - 1]?.userId !== msg.userId;
                           const messageTime = formatMessageTime(msg);
                           return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 3 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex gap-3 group px-2.5 py-1 rounded-lg transition-all min-w-0 relative ${showHeader ? 'mt-3 first:mt-0 pt-0.5 hover:bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-hover)]'}`}
                            >
                              <div className="w-7.5 shrink-0 flex justify-center">
                                {showHeader ? (
                                  <Avatar
                                    name={sender?.name}
                                    initials={sender?.initials}
                                    color={sender?.color || 'var(--accent)'}
                                    size="xs"
                                  />
                                ) : (
                                  <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity select-none self-center pr-1 text-[var(--text-tertiary)] font-medium">
                                    {messageTime.includes('at') ? messageTime.split('at')[1].trim() : messageTime}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5 overflow-hidden">
                                {showHeader && (
                                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-0.5">
                                    <span className="text-truncate" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                                      {sender?.name}
                                    </span>
                                    <span className="text-[9px] text-[var(--text-tertiary)] shrink-0">
                                      {messageTime}
                                    </span>
                                  </div>
                                )}
                                <p style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: '100%' }}>
                                  {msg.text}
                                </p>
                              </div>

                              <div className="absolute right-2.5 -top-2 opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center gap-0.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md p-0.5 shadow-sm z-10">
                                <button type="button" className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer" title="React with emoji">
                                  <Smile size={12} />
                                </button>
                                <button type="button" className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer" title="More options">
                                  <MoreHorizontal size={12} />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {activeTyping.length > 0 && (
                    <div className="px-5 py-1 text-[10px] flex items-center gap-1.5 text-[var(--text-secondary)] bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
                      <span className="flex gap-0.5 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                      <span>
                        {activeTyping.join(', ')} {activeTyping.length === 1 ? 'is' : 'are'} typing…
                      </span>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="p-4 bg-[var(--bg-secondary)] border-t flex gap-2.5 items-end relative" style={{ borderColor: 'var(--border-color)' }}>
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message in #general…"
                      className="input-base text-xs max-h-32 resize-none flex-1 py-3.5 pr-12 pl-4 border-[var(--border-color)]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                    />
                    <div className="absolute right-6.5 bottom-7.5 flex items-center gap-2">
                      <button type="submit" disabled={!message.trim()} className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-brand)] hover:opacity-90 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors" title="Send message">
                        <Send size={14} />
                      </button>
                    </div>
                  </form>
                </Card>
              </motion.div>
            )}

            {/* MEETINGS TAB */}
            {activeTab === 'meetings' && (
              <motion.div key="meetings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                
                {/* Voice Calling / Huddle Launcher Panel */}
                <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/10">
                      <PhoneCall size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Voice Huddle Room</h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {activeCalls[workspace.id] ? `Ongoing huddle call with ${activeCalls[workspace.id].participants?.length || 1} participant(s).` : 'Launch an instant audio huddle session in this workspace.'}
                      </p>
                    </div>
                  </div>
                  {activeCalls[workspace.id] ? (
                    <Button variant="primary" className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0" onClick={() => joinCall(workspace.id)}>
                      Join Huddle
                    </Button>
                  ) : (
                    <Button variant="primary" icon={PhoneCall} className="shrink-0" onClick={() => startCall(workspace.id)}>
                      Start Huddle
                    </Button>
                  )}
                  </div>
                </div>

                {/* Scheduled Meetings list */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border-light)]">
                    <div className="flex items-center gap-2">
                      <Calendar size={15} style={{ color: 'var(--text-tertiary)' }} />
                      <h3 className="section-label">Scheduled Meetings</h3>
                    </div>
                    <Button icon={Plus} size="sm" onClick={() => setShowScheduleMeeting(true)}>
                      Schedule Meeting
                    </Button>
                  </div>

                  {meetings.length === 0 ? (
                    <EmptyState
                      icon={Video}
                      title="No meetings scheduled"
                      description="Create a meeting timeline to synchronize with workspace partners."
                      actionLabel="Schedule Meeting"
                      onAction={() => setShowScheduleMeeting(true)}
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {meetings.map(m => {
                        const mtgDateTime = new Date(`${m.date}T${m.time}`);
                        const timeStr = mtgDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const dateStr = mtgDateTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                        
                        return (
                          <div key={m.id} className="surface-panel p-5 border border-[var(--border-color)] hover:border-[var(--border-focus)] transition-colors flex flex-col justify-between min-h-[140px]">
                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-4">
                                <h4 className="text-xs font-bold text-[var(--text-primary)] leading-snug">{m.title}</h4>
                                <button onClick={() => handleDeleteMeeting(m.id)} className="text-[var(--text-tertiary)] hover:text-red-500 p-1 rounded hover:bg-[var(--bg-hover)]">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                              {m.description && (
                                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">{m.description}</p>
                              )}
                            </div>
                            <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-3.5 mt-3.5 text-[9px] text-[var(--text-tertiary)]">
                              <span className="flex items-center gap-1">
                                <Calendar size={10} /> {dateStr} at {timeStr}
                              </span>
                              <span className="font-semibold text-indigo-500">
                                Host: {m.createdBy}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* MEMBERS TAB */}
            {activeTab === 'members' && (
              <motion.div key="members" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-[var(--border-light)]">
                  <h3 className="section-label">Workspace Members ({members.length})</h3>
                  <Button icon={UserPlus} size="sm" onClick={() => { setShowInvite(true); setInviteError(''); setInviteSuccess(false); setInviteEmail(''); }}>
                    Invite Teammate
                  </Button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                  {members.map(member => (
                    <div key={member.id} className="glass-card" style={{ padding: '16px', boxSizing: 'border-box', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flexShrink: 0 }}>
                        <Avatar
                          name={member.name}
                          initials={member.initials}
                          color={member.color || 'var(--accent)'}
                          size="sm"
                          status={member.status}
                        />
                      </div>
                      <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <p className="text-truncate" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{member.name}</p>
                          {member.id === workspace.ownerId && (
                            <span style={{ fontSize: '7px', fontWeight: 700, padding: '2px 6px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '4px', textTransform: 'uppercase', flexShrink: 0 }}>
                              Owner
                            </span>
                          )}
                        </div>
                        <p className="text-truncate" style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1 }}>{member.email}</p>
                        <p style={{ fontSize: '9px', color: 'var(--text-tertiary)', paddingTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: member.status === 'online' ? '#10b981' : member.status === 'away' ? '#f59e0b' : '#71717a' }} />
                          <span>{member.status === 'online' ? 'Online' : member.status === 'away' ? 'Away' : formatLastSeen(member.lastSeen)}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && isOwner && (
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <Card className="space-y-6">
                  <div>
                    <h3 className="section-label" style={{ marginBottom: '4px' }}>Workspace configurations</h3>
                    <p style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-secondary)' }}>Rename the workspace or update theme colors.</p>
                  </div>
                  
                  <form onSubmit={handleUpdateSettings} className="space-y-5 pt-3 border-t border-[var(--border-light)]">
                    <Input
                      label="Workspace name"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      required
                    />
                    
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        Workspace Theme color
                      </label>
                      <div className="flex flex-wrap gap-2.5">
                        {PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setColorValue(c)}
                            className="w-7 h-7 rounded-full transition-all cursor-pointer border border-transparent"
                            style={{
                              background: c,
                              boxShadow: colorValue === c ? `0 0 0 1.5px var(--bg-primary), 0 0 0 3px ${c}` : 'none',
                              transform: colorValue === c ? 'scale(1.05)' : undefined,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" size="sm">
                        Save changes
                      </Button>
                    </div>
                  </form>

                  <div className="pt-6 border-t border-[var(--border-color)]">
                    <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Danger Zone</h4>
                    <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                      Permanently delete this workspace, including all messages, tasks, notes, files, comments, and member profiles.
                    </p>
                    <Button variant="danger" size="sm" onClick={() => { setShowDeleteModal(true); setDeleteConfirmName(''); setDeleteError(''); }}>
                      Delete Workspace
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Desktop RIGHT SIDEBAR - COLLABORATORS - Visible only for CHAT tab to keep general discussion context active */}
        {activeTab === 'chat' && (
          <motion.aside
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden xl:block w-64 shrink-0"
          >
            <Card padding={false} className="border border-[var(--border-color)] bg-[var(--bg-primary)]">
              <div
                className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Members
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{members.length} total</p>
                </div>
                <button
                  onClick={() => {
                    setShowInvite(true);
                    setInviteError('');
                    setInviteSuccess(false);
                    setInviteEmail('');
                  }}
                  className="w-7 h-7 rounded-md flex items-center justify-center border border-[var(--border-color)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] transition-colors cursor-pointer text-[var(--text-secondary)]"
                >
                  <UserPlus size={13} />
                </button>
              </div>

              {members.length === 0 ? (
                <p className="px-5 py-10 text-center text-xs text-[var(--text-tertiary)]">No members found.</p>
              ) : (
                <div className="divide-y divide-[var(--border-light)]">
                  {/* Online section */}
                  {onlineMembers.length > 0 && (
                    <div className="px-3 py-4">
                      <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mb-2.5 px-2">
                        Online · {onlineMembers.length}
                      </p>
                      <div className="space-y-0.5">
                        {onlineMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
                          >
                            <Avatar
                              name={member.name}
                              initials={member.initials}
                              color={member.color || 'var(--accent)'}
                              size="xs"
                              status="online"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold truncate flex items-center gap-1 text-[var(--text-primary)]">
                                {member.name}
                                {member.id === workspace.ownerId && (
                                  <span
                                    className="text-[8px] font-bold px-1.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded uppercase shrink-0"
                                  >
                                    Owner
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] truncate flex items-center gap-1 text-[var(--text-tertiary)]">
                                <span>{member.role}</span>
                                {member.location && (
                                  <span className="flex items-center gap-0.5 shrink-0 text-zinc-500" title={`Location: ${member.location}`}>
                                    <MapPin size={9} /> {member.location.split(',')[0]}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Away section */}
                  {awayMembers.length > 0 && (
                    <div className="px-3 py-4">
                      <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider mb-2.5 px-2">
                        Away · {awayMembers.length}
                      </p>
                      <div className="space-y-0.5">
                        {awayMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
                          >
                            <Avatar
                              name={member.name}
                              initials={member.initials}
                              color={member.color || 'var(--accent)'}
                              size="xs"
                              status="away"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold truncate flex items-center gap-1 text-[var(--text-primary)]">
                                {member.name}
                                {member.id === workspace.ownerId && (
                                  <span
                                    className="text-[8px] font-bold px-1.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded uppercase shrink-0"
                                  >
                                    Owner
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] truncate flex items-center gap-1 text-[var(--text-tertiary)]">
                                <span>{member.role}</span>
                                {member.location && (
                                  <span className="flex items-center gap-0.5 shrink-0 text-zinc-500" title={`Location: ${member.location}`}>
                                    <MapPin size={9} /> {member.location.split(',')[0]}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Offline section */}
                  {offlineMembers.length > 0 && (
                    <div className="px-3 py-4">
                      <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2.5 px-2">
                        Offline
                      </p>
                      <div className="space-y-0.5">
                        {offlineMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md opacity-70 transition-colors hover:bg-[var(--bg-hover)] hover:opacity-100 cursor-pointer"
                          >
                            <Avatar
                              name={member.name}
                              initials={member.initials}
                              color={member.color || 'var(--accent)'}
                              size="xs"
                              status="offline"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold truncate flex items-center gap-1 text-[var(--text-primary)]">
                                {member.name}
                                {member.id === workspace.ownerId && (
                                  <span
                                    className="text-[8px] font-bold px-1.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded uppercase shrink-0"
                                  >
                                    Owner
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] truncate flex flex-wrap items-center gap-1 text-[var(--text-tertiary)] mt-0.5">
                                <span>{formatLastSeen(member.lastSeen)}</span>
                                {member.location && (
                                  <span className="flex items-center gap-0.5 shrink-0 text-zinc-500" title={`Location: ${member.location}`}>
                                    <MapPin size={9} /> {member.location.split(',')[0]}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </motion.aside>
        )}
      </div>

      {/* Global MODALS */}

      {/* Invite member modal */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite member">
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Enter the email address of the team member to add them directly to this workspace.
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
            <p className="text-xs font-semibold text-[var(--color-danger)]">
              {inviteError}
            </p>
          )}
          {inviteSuccess && (
            <div
              className="p-2.5 rounded-md flex items-center gap-2 text-xs font-medium bg-emerald-500/5 text-emerald-500 border border-emerald-500/15"
            >
              <Check size={13} />
              <span>Added successfully</span>
            </div>
          )}
          <div className="pt-3 border-t border-[var(--border-light)]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">Or share invite code</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={workspace?.inviteCode || 'N/A'}
                className="input-base font-mono text-center tracking-wider text-xs select-all flex-1"
                style={{ background: 'var(--bg-secondary)' }}
              />
              <Button variant="secondary" type="button" size="sm" onClick={handleCopyCode} icon={copiedCode ? Check : Copy}>
                {copiedCode ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
          <div className="flex gap-3 pt-3 border-t border-[var(--border-light)]">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={inviteSuccess}>
              Add directly
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Workspace Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmName('');
          setDeleteError('');
        }}
        title="Delete Workspace"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            This action is permanent and cannot be undone. All database items associated with <strong>{workspace?.name}</strong> will be permanently wiped.
          </p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Please type <strong>{workspace?.name}</strong> to confirm:
          </p>
          <Input
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.target.value)}
            placeholder="Type workspace name here"
            className="w-full"
          />
          {deleteError && (
            <p className="text-xs text-[var(--color-danger)] font-medium">{deleteError}</p>
          )}
          <div className="flex gap-3 pt-3 border-t border-[var(--border-light)]">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmName('');
                setDeleteError('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleDeleteWorkspace}
              disabled={deleteConfirmName !== workspace.name}
            >
              Delete Permanent
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Task Modal */}
      <Modal isOpen={showCreateTask} onClose={() => setShowCreateTask(false)} title="Create task">
        <form onSubmit={handleCreateTaskSubmit} className="space-y-4">
          <Input
            label="Task title"
            placeholder="e.g. Implement Oauth authentication"
            value={newTaskData.title}
            onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Description
            </label>
            <textarea
              placeholder="What needs to be done?"
              value={newTaskData.description}
              onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
              className="input-base text-xs rounded-lg p-3 w-full bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)] focus:border-[var(--accent)] resize-none h-20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Assignee
            </label>
            <select
              value={newTaskData.assignee}
              onChange={(e) => setNewTaskData({ ...newTaskData, assignee: e.target.value })}
              className="input-base text-xs rounded-lg p-2.5 w-full bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)] focus:border-[var(--accent)]"
            >
              <option value="">Unassigned</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Priority
              </label>
              <select
                value={newTaskData.priority}
                onChange={(e) => setNewTaskData({ ...newTaskData, priority: e.target.value })}
                className="input-base text-xs rounded-lg p-2.5 w-full bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)] focus:border-[var(--accent)]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <Input
              label="Due Date"
              type="date"
              value={newTaskData.dueDate}
              onChange={(e) => setNewTaskData({ ...newTaskData, dueDate: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-3 border-t border-[var(--border-light)]">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setShowCreateTask(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Selected Task Details & Comments Modal */}
      {selectedTask && (
        <Modal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title={isOwner ? "Edit Task" : "Task Details"}
          size="lg"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form details (2/3 width) */}
            <form onSubmit={handleEditTaskSubmit} className="lg:col-span-2 space-y-4 text-left">
              <Input
                label="Title"
                value={selectedTask.title}
                onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                disabled={!isOwner}
                required
              />
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Description
                </label>
                <textarea
                  value={selectedTask.description || ''}
                  onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
                  disabled={!isOwner}
                  className="input-base text-xs rounded-lg p-3 w-full bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)] resize-none h-20"
                />
              </div>

              {/* Task Comments Stream */}
              <div className="space-y-3 pt-4 border-t border-[var(--border-light)]">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                  <MessageSquare size={10} /> Discussion Stream
                </h4>
                
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {(taskComments[selectedTask.id] || []).length === 0 ? (
                    <p className="text-[10px] text-[var(--text-tertiary)] italic">No comments yet. Start a discussion below.</p>
                  ) : (
                    (taskComments[selectedTask.id] || []).map(comment => {
                      const commSender = members.find(m => m.id === comment.userId) || { name: 'Member', initials: 'M' };
                      return (
                        <div key={comment.id} className="flex gap-2.5 items-start p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                          <Avatar name={commSender.name} initials={commSender.initials} size="xs" />
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-baseline gap-2">
                              <span className="text-[10px] font-bold text-[var(--text-primary)]">{commSender.name}</span>
                              <span className="text-[8px] text-[var(--text-tertiary)]">{new Date(comment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-[10px] text-[var(--text-secondary)] mt-1 break-words leading-relaxed">{comment.text}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Add a comment…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="input-base text-xs px-3 py-1.5 flex-1 rounded-lg"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTaskCommentSubmit(e);
                      }
                    }}
                  />
                  <Button variant="secondary" size="sm" type="button" onClick={handleAddTaskCommentSubmit} disabled={!commentText.trim()}>
                    Comment
                  </Button>
                </div>
              </div>

              {isOwner && (
                <div className="flex justify-between items-center pt-3 border-t border-[var(--border-light)] gap-3">
                  <Button variant="danger" size="sm" type="button" icon={Trash2} onClick={() => handleTaskDelete(selectedTask.id)}>
                    Delete Task
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" type="button" onClick={() => setSelectedTask(null)}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" type="submit">
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </form>

            {/* Sidebar properties (1/3 width) */}
            <div className="space-y-4 border-l border-[var(--border-light)] pl-6 text-left text-xs">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Task Properties</h4>
              
              <div className="space-y-3 pt-2">
                <div>
                  <span className="block text-[10px] uppercase font-semibold text-[var(--text-tertiary)] mb-1">Status</span>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => setSelectedTask({ ...selectedTask, status: e.target.value })}
                    disabled={!isOwner && selectedTask.assignee !== user?.id}
                    className="input-base text-xs rounded p-1.5 w-full bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                  >
                    <option value="todo">To do</option>
                    <option value="inProgress">In progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <span className="block text-[10px] uppercase font-semibold text-[var(--text-tertiary)] mb-1">Assignee</span>
                  <select
                    value={selectedTask.assignee || ''}
                    onChange={(e) => setSelectedTask({ ...selectedTask, assignee: e.target.value || null })}
                    disabled={!isOwner}
                    className="input-base text-xs rounded p-1.5 w-full bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="block text-[10px] uppercase font-semibold text-[var(--text-tertiary)] mb-1">Priority</span>
                  <select
                    value={selectedTask.priority}
                    onChange={(e) => setSelectedTask({ ...selectedTask, priority: e.target.value })}
                    disabled={!isOwner}
                    className="input-base text-xs rounded p-1.5 w-full bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <span className="block text-[10px] uppercase font-semibold text-[var(--text-tertiary)] mb-1">Due Date</span>
                  <input
                    type="date"
                    value={selectedTask.dueDate || ''}
                    onChange={(e) => setSelectedTask({ ...selectedTask, dueDate: e.target.value })}
                    disabled={!isOwner}
                    className="input-base text-xs rounded p-1.5 w-full bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Schedule Meeting Modal */}
      <Modal isOpen={showScheduleMeeting} onClose={() => setShowScheduleMeeting(false)} title="Schedule meeting">
        <form onSubmit={handleScheduleMeetingSubmit} className="space-y-4">
          <Input
            label="Meeting title"
            placeholder="e.g. Design review session"
            value={newMeeting.title}
            onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={newMeeting.date}
              onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
              required
            />
            <Input
              label="Time"
              type="time"
              value={newMeeting.time}
              onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Description / Notes
            </label>
            <textarea
              placeholder="e.g. Discussing the upcoming UI adjustments"
              value={newMeeting.description}
              onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
              className="input-base text-xs rounded-lg p-3 w-full bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)] focus:border-[var(--accent)] resize-none h-20"
            />
          </div>
          <div className="flex gap-3 pt-3 border-t border-[var(--border-light)]">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setShowScheduleMeeting(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Schedule Meeting
            </Button>
          </div>
        </form>
      </Modal>

      {/* File Previewer Modal */}
      {previewFile && (
        <Modal isOpen={!!previewFile} onClose={() => setPreviewFile(null)} title={previewFile.name} size="lg">
          <div className="space-y-4 text-center">
            {previewLoading ? (
              <div className="py-20 flex justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--border-color)] border-t-[var(--accent)] animate-spin" />
              </div>
            ) : previewContent?.error ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <p className="text-xs text-[var(--text-secondary)]">{previewContent.error}</p>
              </div>
            ) : previewFile.type === 'image' && previewContent?.url ? (
              <div className="flex justify-center max-h-[380px] overflow-hidden rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                <img src={previewContent.url} alt={previewFile.name} className="object-contain max-h-full" />
              </div>
            ) : previewFile.type === 'pdf' && previewContent?.url ? (
              <iframe src={previewContent.url} className="w-full h-[380px] rounded-lg border border-[var(--border-color)]" title="PDF Preview" />
            ) : (
              <pre className="text-left font-mono text-[10px] p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] max-h-[380px] overflow-auto whitespace-pre-wrap leading-relaxed text-[var(--text-secondary)]">
                {previewContent?.text || 'No preview content available.'}
              </pre>
            )}

            <div className="flex justify-between items-center border-t border-[var(--border-light)] pt-4 mt-4 gap-4">
              <span className="text-[10px] text-[var(--text-tertiary)] font-mono">{previewFile.size} · Shared by {(members.find(m => m.id === previewFile.uploadedBy)?.name || 'Someone')}</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPreviewFile(null)}>
                  Close
                </Button>
                <Button variant="primary" size="sm" icon={Download} onClick={() => downloadFile(previewFile)}>
                  Download
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
