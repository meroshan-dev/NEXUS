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
  Calendar, Edit3, FolderKanban, X, ArrowLeft
} from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import { PriorityBadge } from '../components/ui/Badge';
import CustomSelect from '../components/ui/CustomSelect';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const PALETTE = ['#5e6ad2', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];
const PlusIcon14 = (props) => <Plus {...props} size={14} className="shrink-0" style={{ ...props.style, flexShrink: 0 }} />;

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
    deleteFile,
    toggleChatMessageReaction,
    deleteChatMessage,
    editChatMessage,
    retryChatMessage
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
  const isOwner = workspace ? workspace.ownerId === user?.id : false;
  const currentUserRole = workspace ? (workspaceMembers[workspace.id]?.find(m => m.id === user?.id || m.userId === user?.id)?.role || 'Member').toLowerCase() : 'member';

  // Tab change wrapper
  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (!loading && workspace && activeTab === 'settings' && !isOwner) {
      alert("Only the workspace owner can access settings.");
      handleTabChange('overview');
    }
  }, [activeTab, isOwner, workspace, loading]);

  // Modals & Local states
  const [activeEmojiPickerMessageId, setActiveEmojiPickerMessageId] = useState(null);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
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
    if (!isOwner) {
      alert("Only the workspace owner can update settings.");
      return;
    }
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
    <div
      className="page-stack pb-8 min-w-0"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '24px',
        paddingTop: '24px',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        minWidth: 0
      }}
    >
      <div className="flex flex-col xl:flex-row gap-6 items-start min-w-0 w-full">
        <div className="flex-1 min-w-0 w-full max-w-full">
          <AnimatePresence mode="wait">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'static',
                  margin: 0,
                  width: '100%'
                }}
              >
                
                {/* Workspace Quick Actions */}
                <Card
                  padding={false}
                  className=""
                  style={{
                    position: 'static',
                    margin: 0,
                    height: 'auto',
                    padding: '20px 24px',
                    boxSizing: 'border-box'
                  }}
                >
                  <h3 className="section-label" style={{ marginBottom: '12px' }}>Workspace Actions</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {currentUserRole === 'owner' && (
                      <button onClick={() => setShowCreateTask(true)} className="workspace-action-btn">
                        <div className="workspace-action-icon-wrapper">
                          <CheckSquare size={18} strokeWidth={1.5} className="icon-glow" style={{ color: 'var(--text-tertiary)' }} />
                        </div>
                        <span className="text-truncate" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)', maxWidth: '100%' }}>Create Task</span>
                      </button>
                    )}
                    <label className="workspace-action-btn">
                      <input type="file" onChange={handleFileUpload} className="hidden" />
                      <div className="workspace-action-icon-wrapper">
                        <Upload size={18} strokeWidth={1.5} className="icon-glow" style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                      <span className="text-truncate" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)', maxWidth: '100%' }}>Upload File</span>
                    </label>
                    <button onClick={createNewNote} className="workspace-action-btn">
                      <div className="workspace-action-icon-wrapper">
                        <File size={18} strokeWidth={1.5} className="icon-glow" style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                      <span className="text-truncate" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)', maxWidth: '100%' }}>Create Note</span>
                    </button>
                    <button onClick={() => startCall(workspace.id)} className="workspace-action-btn">
                      <div className="workspace-action-icon-wrapper">
                        <PhoneCall size={18} strokeWidth={1.5} className="icon-glow" style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                      <span className="text-truncate" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)', maxWidth: '100%' }}>Start Call</span>
                    </button>
                    <button onClick={() => handleTabChange('chat')} className="workspace-action-btn">
                      <div className="workspace-action-icon-wrapper">
                        <MessageSquare size={18} strokeWidth={1.5} className="icon-glow" style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                      <span className="text-truncate" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)', maxWidth: '100%' }}>Text</span>
                    </button>
                    {currentUserRole === 'owner' && (
                      <button onClick={() => { handleTabChange('meetings'); setShowScheduleMeeting(true); }} className="workspace-action-btn">
                        <div className="workspace-action-icon-wrapper">
                          <Calendar size={18} strokeWidth={1.5} className="icon-glow" style={{ color: 'var(--text-tertiary)' }} />
                        </div>
                        <span className="text-truncate" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)', maxWidth: '100%' }}>Schedule Meeting</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowInvite(true);
                        setInviteError('');
                        setInviteSuccess(false);
                        setInviteEmail('');
                      }}
                      className="workspace-action-btn"
                    >
                      <div className="workspace-action-icon-wrapper">
                        <UserPlus size={18} strokeWidth={1.5} className="icon-glow" style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                      <span className="text-truncate" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)', maxWidth: '100%' }}>Invite Member</span>
                    </button>
                  </div>
                </Card>

                {/* Active Workspace Huddle Box (only if active) */}
                {activeCalls[workspace.id] && (
                  <div
                    className="glass-card animate-pulse"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '14px 20px',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      width: '100%',
                      borderColor: 'rgba(16,185,129,0.25)',
                      position: 'static',
                      margin: 0
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(16,185,129,0.15)',
                          color: '#34d399'
                        }}
                      >
                        <PhoneCall size={16} strokeWidth={1.5} />
                      </div>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <h3
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: 'var(--text-primary)',
                            margin: 0
                          }}
                        >
                          Ongoing Workspace Huddle
                        </h3>
                        <p
                          style={{
                            fontSize: '12px',
                            opacity: 0.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: 'var(--text-secondary)',
                            margin: '2px 0 0 0'
                          }}
                        >
                          Started by {activeCalls[workspace.id].callerName} · {activeCalls[workspace.id].participants?.length || 1} participant(s) in call
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      className="shrink-0"
                      style={{
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        padding: '8px 18px',
                        borderRadius: '10px',
                        background: 'rgba(16,185,129,0.5)',
                        borderColor: 'rgba(16,185,129,0.4)',
                        height: 'auto'
                      }}
                      onClick={() => joinCall(workspace.id)}
                    >
                      Join Huddle
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
                    position: 'static',
                    margin: 0
                  }}>
                    <span style={{ fontSize: '16px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>⚠️</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#fca5a5', marginBottom: '3px' }}>Call failed to start</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{callError}</p>
                    </div>
                    <button
                      onClick={clearCallError}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '16px', lineHeight: 1, padding: '0', flexShrink: 0 }}
                      title="Dismiss"
                    >×</button>
                  </div>
                )}

                {/* Stats & Activity — Balanced 2-column layout */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '320px 1fr',
                    gap: '16px',
                    alignItems: 'start',
                    width: '100%',
                    position: 'static',
                    margin: 0,
                    marginTop: 0
                  }}
                >
                  {/* Glass Stats Cards Stack */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'static', margin: 0 }}>
                    {[
                      { icon: Users, value: members.length, label: 'Total Members' },
                      { icon: CheckSquare, value: `${completedTasksCount}/${totalTasksCount}`, label: 'Tasks Completed' },
                      { icon: FileText, value: wsFiles.length, label: 'Shared Files' },
                    ].map((stat, i) => {
                      const StatIcon = stat.icon;
                      return (
                        <div
                          key={i}
                          className="glass-stat-card flex items-center gap-[10px]"
                          style={{
                            boxSizing: 'border-box',
                            position: 'static',
                            margin: 0
                          }}
                        >
                          <div className="stat-icon">
                            <StatIcon size={18} strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="text-base font-medium leading-none" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
                            <p className="text-[9px] uppercase font-medium tracking-wider mt-1" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Activity Timeline */}
                  <Card
                    padding={false}
                    style={{
                      boxSizing: 'border-box',
                      padding: '16px 20px',
                      overflow: 'hidden',
                      minWidth: 0,
                      position: 'static',
                      margin: 0
                    }}
                  >
                    <span className="section-label" style={{ paddingBottom: '12px', display: 'block', margin: 0 }}>Workspace Activity</span>
                    {workspaceActivities.length === 0 ? (
                      <div className="py-10 text-center rounded-[var(--radius-lg)]" style={{ border: '1px dashed var(--glass-border)', position: 'static', margin: 0 }}>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No recent activity.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', position: 'static', margin: 0 }}>
                        {workspaceActivities.map((act, index) => {
                          const localActor = members.find(m => m.id === act.user_id);
                          const actor = act.actor || act.profiles || (localActor ? { full_name: localActor.name, email: localActor.email, avatar: localActor.avatar } : null);
                          const actorName = actor?.full_name ?? actor?.name ?? actor?.email ?? 'A member';
                          const isLast = index === workspaceActivities.length - 1;
                          return (
                            <div
                              key={act.id}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '10px 0',
                                borderBottom: isLast ? 'none' : '1px solid var(--glass-bg-light)',
                                overflow: 'hidden',
                                position: 'static',
                                margin: 0
                              }}
                            >
                              <div style={{ flexShrink: 0, width: '28px', height: '28px' }}>
                                <Avatar name={actorName} initials={actorName.slice(0, 2).toUpperCase()} src={actor?.avatar} size="xs" />
                              </div>
                              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                <p
                                  style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    fontSize: '13px',
                                    color: 'var(--text-secondary)',
                                    margin: 0
                                  }}
                                >
                                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{actorName}</span>{' '}
                                  {act.details}
                                </p>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    opacity: 0.45,
                                    whiteSpace: 'nowrap',
                                    display: 'block',
                                    marginTop: '2px',
                                    color: 'var(--text-tertiary)'
                                  }}
                                >
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
              <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5" style={{ overflowX: 'hidden', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', gap: '16px', boxSizing: 'border-box', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'var(--glass-bg-light)', backdropFilter: 'blur(16px) saturate(160%)', border: '1px solid var(--glass-border)', borderRadius: '10px', width: 'fit-content', flexShrink: 1, minWidth: 0 }}>
                    {[
                      { id: 'all', label: 'All Tasks' },
                      { id: 'my', label: 'My Tasks' },
                      { id: 'completed', label: 'Completed' },
                      { id: 'overdue', label: 'Overdue' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setTasksFilter(tab.id)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          opacity: tasksFilter === tab.id ? 1 : 0.6,
                          background: tasksFilter === tab.id ? 'var(--glass-border)' : 'transparent',
                          backdropFilter: tasksFilter === tab.id ? 'blur(10px)' : 'none',
                          border: tasksFilter === tab.id ? '1px solid var(--glass-border)' : '1px solid transparent',
                          fontWeight: tasksFilter === tab.id ? 500 : 400,
                          transition: 'all 0.2s',
                          outline: 'none',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <Button
                    icon={Plus}
                    size="sm"
                    onClick={() => setShowCreateTask(true)}
                    style={{
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 18px',
                      borderRadius: '10px',
                      background: 'rgba(99,102,241,0.85)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid var(--glass-border)',
                      boxShadow: '0 4px 16px rgba(99,102,241,0.3)'
                    }}
                  >
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
                    style={{
                      padding: '48px 24px',
                      boxSizing: 'border-box',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      overflow: 'hidden'
                    }}
                    iconStyle={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '4px'
                    }}
                    titleStyle={{
                      fontSize: '16px',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%',
                      margin: 0
                    }}
                    descStyle={{
                      fontSize: '13px',
                      opacity: 0.55,
                      maxWidth: '320px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'normal',
                      padding: 0,
                      margin: 0
                    }}
                    buttonStyle={{
                      marginTop: '8px',
                      whiteSpace: 'nowrap',
                      padding: '9px 20px'
                    }}
                  />
                ) : (
                  <DragDropContext onDragEnd={onDragEnd}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '0 24px 24px', boxSizing: 'border-box' }}>
                      {Object.entries(KANBAN_COLS).map(([colId, cfg]) => {
                        const columnTasks = colId === 'todo' ? todoList : colId === 'inProgress' ? inProgressList : doneList;
                        return (
                          <div key={colId} style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, letterSpacing: '0.03em', color: 'var(--text-primary)' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: cfg.dotColor }} />
                                <span style={{ textTransform: 'uppercase' }}>{cfg.title}</span>
                                <span style={{ fontSize: '11px', opacity: 0.5, fontWeight: 400, marginLeft: '4px' }}>
                                  {columnTasks.length}
                                </span>
                              </div>
                            </div>

                            <Droppable droppableId={colId}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    minHeight: '320px',
                                    borderRadius: '16px',
                                    padding: '12px',
                                    background: snapshot.isDraggingOver ? cfg.accent : 'var(--bg-primary)',
                                    backdropFilter: 'blur(20px) saturate(160%)',
                                    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                                    border: snapshot.isDraggingOver ? `1px dashed ${cfg.dotColor}55` : '1px solid var(--glass-border-light)',
                                    boxShadow: 'inset 0 1px 0 var(--bg-hover)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
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
                                              className="glass-kanban-card"
                                              style={{
                                                boxShadow: snap.isDragging ? 'var(--shadow-md)' : undefined,
                                              }}
                                            >
                                              <h3 style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                                {task.title}
                                              </h3>
                                              {task.description && (
                                                <p
                                                  style={{
                                                    fontSize: '12px',
                                                    opacity: 0.5,
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    marginBottom: '10px',
                                                    color: 'var(--text-primary)',
                                                    lineHeight: '1.5'
                                                  }}
                                                >
                                                  {task.description}
                                                </p>
                                              )}
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--bg-hover)' }}>
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
                                    <div style={{ textAlign: 'center', padding: '40px 16px', opacity: 0.4, fontSize: '13px', color: 'var(--text-primary)' }}>
                                      No tasks
                                    </div>
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
              <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="notes-tab-container"
                style={{ height: 'clamp(450px, calc(100vh - 240px), 700px)' }}
              >
                <div style={{ display: 'flex', height: '100%', overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--glass-border-light)', background: 'var(--bg-subtle)' }}>
                  
                  {/* Notes List Panel */}
                  <div
                    className="notes-list-panel"
                    style={{
                      width: '280px',
                      flexShrink: 0,
                      height: '100%',
                      boxSizing: 'border-box',
                      padding: '16px',
                      background: 'var(--bg-primary)',
                      backdropFilter: 'blur(20px) saturate(160%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                      borderRight: '1px solid var(--glass-border-light)',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Label row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          opacity: 0.5,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      >
                        Notes list
                      </span>
                      <button
                        onClick={createNewNote}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '8px',
                          background: 'var(--bg-hover)',
                          border: '1px solid var(--glass-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          cursor: 'pointer',
                          color: 'var(--text-secondary)',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--glass-border)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      >
                        <Plus size={13} strokeWidth={2} />
                      </button>
                    </div>

                    {/* Note items */}
                    {notes.length === 0 ? (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', opacity: 0.6 }}>No workspace notes.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
                        {notes.map(n => {
                          const isActive = activeNoteId === n.id;
                          return (
                            <div
                              key={n.id}
                              onClick={() => setActiveNoteId(n.id)}
                              className="group"
                              style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '12px 14px',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                background: isActive ? 'var(--glass-border-light)' : 'transparent',
                                border: isActive ? '1px solid var(--glass-border)' : '1px solid transparent',
                              }}
                              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-primary)'; }}
                              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <p
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    marginBottom: '2px',
                                    color: 'var(--text-primary)',
                                    margin: '0 0 2px 0',
                                  }}
                                >
                                  {n.title || 'Untitled Note'}
                                </p>
                                <p
                                  style={{
                                    fontSize: '11px',
                                    opacity: 0.45,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: 'var(--text-primary)',
                                    margin: 0,
                                  }}
                                >
                                  {new Date(n.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteNote(n.id); }}
                                className="opacity-0 group-hover:opacity-100"
                                style={{
                                  padding: '4px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                  color: 'var(--text-tertiary)',
                                  background: 'transparent',
                                  border: 'none',
                                  transition: 'all 0.15s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Note Editor */}
                  <div
                    className={`notes-editor-panel ${activeNoteId ? 'active' : ''}`}
                    style={{
                      flex: 1,
                      padding: '24px',
                      boxSizing: 'border-box',
                      overflowY: 'auto',
                      minWidth: 0,
                    }}
                  >
                    {activeNote ? (
                      <div className="notes-editor-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div className="notes-mobile-back-bar">
                          <button
                            type="button"
                            onClick={() => setActiveNoteId(null)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '14px',
                              fontWeight: 500,
                            }}
                          >
                            <ArrowLeft size={16} /> Back
                          </button>
                        </div>
                        <div className="notes-editor-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                        {/* Header row */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            marginBottom: '16px',
                            paddingBottom: '16px',
                            borderBottom: '1px solid var(--glass-border-light)',
                            flexShrink: 0,
                          }}
                        >
                          <input
                            type="text"
                            value={activeNote.title}
                            onChange={(e) => handleEditNote(activeNote.id, e.target.value, activeNote.content)}
                            placeholder="Untitled Note"
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: '20px',
                              fontWeight: 700,
                              background: 'transparent',
                              border: 'none',
                              outline: 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              color: 'var(--text-primary)',
                              padding: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: '11px',
                              opacity: 0.4,
                              flexShrink: 0,
                              whiteSpace: 'nowrap',
                              letterSpacing: '0.04em',
                              color: 'var(--text-primary)',
                            }}
                          >
                            Auto-saved
                          </span>
                        </div>
                        {/* Textarea */}
                        <textarea
                          placeholder="Start typing note content here…"
                          value={activeNote.content}
                          onChange={(e) => handleEditNote(activeNote.id, activeNote.title, e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            minHeight: '400px',
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: '14px',
                            lineHeight: 1.7,
                            resize: 'none',
                            color: 'var(--text-secondary)',
                            padding: 0,
                          }}
                        />
                        </div>
                      </div>
                    ) : (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px' }}>
                        <Edit3 style={{ width: '40px', height: '40px', color: 'var(--text-tertiary)', marginBottom: '12px', opacity: 0.5 }} />
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>No note selected</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 16px 0', opacity: 0.6 }}>Select an existing note or click below to create one.</p>
                        <Button variant="secondary" size="sm" className="h-7.5 text-[11px]" onClick={createNewNote}>
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
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ height: isMobile ? (isKeyboardVisible ? 'calc(100dvh - 130px)' : 'calc(100dvh - 200px)') : 'clamp(400px, calc(100vh - 240px), 700px)' }}
              >
                {/* Main chat panel — glass card */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '16px',
                    background: 'var(--bg-primary)',
                    backdropFilter: 'blur(20px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                    border: '1px solid var(--glass-border-light)',
                    overflow: 'hidden',
                    height: '100%',
                  }}
                >
                  {/* Header row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--glass-border-light)',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <Hash size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>
                      #general
                    </span>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: '12px',
                        opacity: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                        color: 'var(--text-primary)',
                      }}
                    >
                      Company general workspace discussions
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        opacity: 0.4,
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {messages.length} messages
                    </span>
                  </div>

                  {/* Messages area */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
                    {messages.length === 0 ? (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <EmptyState
                          icon={MessageSquare}
                          title="No messages"
                          description="Send a message to start collaborating in #general."
                          compact
                        />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                              className="group"
                              style={{
                                display: 'flex',
                                gap: '10px',
                                padding: showHeader ? '8px 16px 4px 16px' : '2px 16px',
                                alignItems: 'flex-start',
                                overflow: 'visible',
                                position: 'relative',
                                marginTop: showHeader && i > 0 ? '8px' : '0',
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              {/* Avatar / hover timestamp */}
                              <div style={{ width: '32px', flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: showHeader ? '2px' : '0' }}>
                                {showHeader ? (
                                  <Avatar
                                    name={sender?.name}
                                    initials={sender?.initials}
                                    color={sender?.color || 'var(--accent)'}
                                    size="sm"
                                  />
                                ) : (
                                  <span
                                    className="opacity-0 group-hover:opacity-100"
                                    style={{
                                      fontSize: '10px',
                                      opacity: 0,
                                      color: 'var(--text-tertiary)',
                                      whiteSpace: 'nowrap',
                                      textAlign: 'right',
                                      width: '32px',
                                      alignSelf: 'center',
                                      transition: 'opacity 0.15s',
                                      userSelect: 'none',
                                    }}
                                  >
                                    {messageTime.includes('at') ? messageTime.split('at')[1].trim() : messageTime}
                                  </span>
                                )}
                              </div>
                              {/* Content */}
                              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                {showHeader && (
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>
                                      {sender?.name}
                                    </span>
                                    <span style={{ fontSize: '11px', opacity: 0.4, flexShrink: 0, whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                                      {messageTime}
                                    </span>
                                  </div>
                                )}
                                
                                {editingMessageId === msg.id ? (
                                  <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <textarea
                                      value={editingText}
                                      onChange={(e) => setEditingText(e.target.value)}
                                      rows={2}
                                      style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        background: 'var(--bg-hover)',
                                        border: '1px solid var(--glass-border)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        lineHeight: 1.4,
                                        resize: 'none',
                                        outline: 'none',
                                      }}
                                    />
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                      <button
                                        type="button"
                                        onClick={() => setEditingMessageId(null)}
                                        style={{
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          fontSize: '11px',
                                          fontWeight: 500,
                                          background: 'var(--glass-bg-light)',
                                          color: 'var(--text-secondary)',
                                          border: '1px solid var(--glass-border-light)',
                                          cursor: 'pointer',
                                          transition: 'all 0.1s',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--glass-border-light)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--glass-bg-light)'; }}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (editingText.trim()) {
                                            await editChatMessage(workspace.id, msg.id, editingText);
                                            setEditingMessageId(null);
                                          }
                                        }}
                                        style={{
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          fontSize: '11px',
                                          fontWeight: 500,
                                          background: 'rgba(99,102,241,0.3)',
                                          color: 'var(--accent)',
                                          border: '1px solid rgba(99,102,241,0.4)',
                                          cursor: 'pointer',
                                          transition: 'all 0.1s',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.4)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.3)'; }}
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p
                                      style={{
                                        fontSize: '14px',
                                        lineHeight: 1.5,
                                        color: msg.status === 'pending' ? '#ef4444' : msg.status === 'failed' ? '#f59e0b' : 'var(--text-secondary)',
                                        opacity: (msg.status === 'pending' || msg.status === 'failed') ? 0.85 : 1,
                                        transition: 'color 0.3s ease, opacity 0.3s ease',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        overflowWrap: 'break-word',
                                        margin: 0
                                      }}
                                    >
                                      {msg.text}
                                    </p>
                                    {msg.status === 'failed' && (
                                      <div style={{ marginTop: '4px' }}>
                                        <button
                                          type="button"
                                          onClick={() => retryChatMessage(workspace.id, msg.id)}
                                          style={{
                                            fontSize: '11px',
                                            color: '#f59e0b',
                                            background: 'transparent',
                                            border: 'none',
                                            padding: 0,
                                            textDecoration: 'underline',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                          }}
                                        >
                                          Tap to retry
                                        </button>
                                      </div>
                                    )}
                                    
                                    {/* Render Reactions */}
                                    {msg.reactions && msg.reactions.length > 0 && (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                                        {msg.reactions.map((r, ri) => {
                                          const hasReacted = r.users?.includes(user?.id);
                                          return (
                                            <button
                                              key={ri}
                                              type="button"
                                              onClick={() => toggleChatMessageReaction(workspace.id, msg.id, r.emoji)}
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '2px 6px',
                                                borderRadius: '6px',
                                                background: hasReacted ? 'rgba(99,102,241,0.15)' : 'var(--bg-primary)',
                                                border: hasReacted ? '1px solid rgba(99,102,241,0.35)' : '1px solid var(--glass-border-light)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                                fontSize: '11px',
                                                color: hasReacted ? 'var(--accent)' : 'var(--text-secondary)',
                                              }}
                                              onMouseEnter={(e) => {
                                                if (!hasReacted) {
                                                  e.currentTarget.style.background = 'var(--glass-border-light)';
                                                  e.currentTarget.style.borderColor = 'var(--glass-border)';
                                                }
                                              }}
                                              onMouseLeave={(e) => {
                                                if (!hasReacted) {
                                                  e.currentTarget.style.background = 'var(--bg-primary)';
                                                  e.currentTarget.style.borderColor = 'var(--glass-border-light)';
                                                }
                                              }}
                                            >
                                              <span style={{ fontSize: '12px' }}>{r.emoji}</span>
                                              <span style={{ fontWeight: 600 }}>{r.users?.length || 0}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Hover actions */}
                              <div
                                className="opacity-0 group-hover:opacity-100"
                                style={{
                                  position: 'absolute',
                                  right: '12px',
                                  top: '-4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  background: 'rgba(15,15,35,0.92)',
                                  backdropFilter: 'blur(12px)',
                                  border: '1px solid var(--glass-border)',
                                  borderRadius: '8px',
                                  padding: '2px',
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                                  zIndex: 10,
                                  transition: 'opacity 0.15s',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveEmojiPickerMessageId(prev => prev === msg.id ? null : msg.id);
                                    setActiveMenuMessageId(null);
                                  }}
                                  style={{ padding: '4px', borderRadius: '5px', cursor: 'pointer', background: activeEmojiPickerMessageId === msg.id ? 'var(--glass-border)' : 'transparent', border: 'none', color: activeEmojiPickerMessageId === msg.id ? 'var(--text-primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                  title="React with emoji"
                                  onMouseEnter={(e) => { if (activeEmojiPickerMessageId !== msg.id) { e.currentTarget.style.background = 'var(--glass-border-light)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                                  onMouseLeave={(e) => { if (activeEmojiPickerMessageId !== msg.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                                >
                                  <Smile size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuMessageId(prev => prev === msg.id ? null : msg.id);
                                    setActiveEmojiPickerMessageId(null);
                                  }}
                                  style={{ padding: '4px', borderRadius: '5px', cursor: 'pointer', background: activeMenuMessageId === msg.id ? 'var(--glass-border)' : 'transparent', border: 'none', color: activeMenuMessageId === msg.id ? 'var(--text-primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                  title="More options"
                                  onMouseEnter={(e) => { if (activeMenuMessageId !== msg.id) { e.currentTarget.style.background = 'var(--glass-border-light)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                                  onMouseLeave={(e) => { if (activeMenuMessageId !== msg.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                                >
                                  <MoreHorizontal size={13} />
                                </button>
                              </div>

                              {/* Custom Glassmorphic Emoji Picker Popover */}
                              {activeEmojiPickerMessageId === msg.id && (
                                <>
                                  <div
                                    style={{
                                      position: 'fixed',
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                      bottom: 0,
                                      zIndex: 40,
                                      background: 'transparent',
                                      cursor: 'default',
                                    }}
                                    onClick={() => setActiveEmojiPickerMessageId(null)}
                                  />
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: '24px',
                                      right: '12px',
                                      zIndex: 50,
                                      width: '240px',
                                      padding: '10px',
                                      borderRadius: '12px',
                                      background: 'rgba(15,15,35,0.92)',
                                      backdropFilter: 'blur(20px) saturate(160%)',
                                      border: '1px solid var(--glass-border)',
                                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                    }}
                                  >
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                                      {[
                                        '👍', '❤️', '🔥', '😂', '🎉', '✅', '👀',
                                        '💡', '🚀', '👏', '🥳', '💯', '🤔', '🌟',
                                        '✨', '🙏', '🤷', '🙅', '🙌', '😍', '😎',
                                        '🤣', '😭', '😢', '👎', '💔', '💩', '🍻'
                                      ].map((emojiChar) => (
                                        <button
                                          key={emojiChar}
                                          type="button"
                                          onClick={() => {
                                            toggleChatMessageReaction(workspace.id, msg.id, emojiChar);
                                            setActiveEmojiPickerMessageId(null);
                                          }}
                                          style={{
                                            fontSize: '16px',
                                            padding: '4px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            transition: 'transform 0.1s, background 0.1s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--glass-border-light)';
                                            e.currentTarget.style.transform = 'scale(1.2)';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.transform = 'scale(1)';
                                          }}
                                        >
                                          {emojiChar}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Custom Options Popover (3-dot Menu) */}
                              {activeMenuMessageId === msg.id && (
                                <>
                                  <div
                                    style={{
                                      position: 'fixed',
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                      bottom: 0,
                                      zIndex: 40,
                                      background: 'transparent',
                                      cursor: 'default',
                                    }}
                                    onClick={() => setActiveMenuMessageId(null)}
                                  />
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: '24px',
                                      right: '12px',
                                      zIndex: 50,
                                      width: '140px',
                                      padding: '4px',
                                      borderRadius: '10px',
                                      background: 'rgba(15,15,35,0.92)',
                                      backdropFilter: 'blur(20px) saturate(160%)',
                                      border: '1px solid var(--glass-border)',
                                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '2px',
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(msg.text);
                                        setActiveMenuMessageId(null);
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        padding: '6px 8px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: 'transparent',
                                        color: 'var(--text-secondary)',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'background 0.15s, color 0.15s',
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-hover)';
                                        e.currentTarget.style.color = 'var(--text-primary)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                      }}
                                    >
                                      <Copy size={12} />
                                      Copy Text
                                    </button>
                                    
                                    {msg.userId === user?.id && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingMessageId(msg.id);
                                          setEditingText(msg.text);
                                          setActiveMenuMessageId(null);
                                        }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          width: '100%',
                                          padding: '6px 8px',
                                          borderRadius: '6px',
                                          border: 'none',
                                          background: 'transparent',
                                          color: 'var(--text-secondary)',
                                          fontSize: '12px',
                                          cursor: 'pointer',
                                          textAlign: 'left',
                                          transition: 'background 0.15s, color 0.15s',
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = 'var(--bg-hover)';
                                          e.currentTarget.style.color = 'var(--text-primary)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'transparent';
                                          e.currentTarget.style.color = 'var(--text-secondary)';
                                        }}
                                      >
                                        <Edit3 size={12} />
                                        Edit Message
                                      </button>
                                    )}

                                    {msg.userId === user?.id && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await deleteChatMessage(workspace.id, msg.id);
                                          setActiveMenuMessageId(null);
                                        }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          width: '100%',
                                          padding: '6px 8px',
                                          borderRadius: '6px',
                                          border: 'none',
                                          background: 'transparent',
                                          color: '#ef4444',
                                          fontSize: '12px',
                                          cursor: 'pointer',
                                          textAlign: 'left',
                                          transition: 'background 0.15s, color 0.15s',
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'transparent';
                                        }}
                                      >
                                        <Trash2 size={12} />
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Typing indicator */}
                  {activeTyping.length > 0 && (
                    <div style={{ padding: '6px 16px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', borderTop: '1px solid var(--bg-hover)', flexShrink: 0 }}>
                      <span style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)' }} className="animate-bounce" />
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)', animationDelay: '150ms' }} className="animate-bounce" />
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)', animationDelay: '300ms' }} className="animate-bounce" />
                      </span>
                      <span>
                        {activeTyping.join(', ')} {activeTyping.length === 1 ? 'is' : 'are'} typing…
                      </span>
                    </div>
                  )}

                  {/* Message input bar */}
                  <form
                    onSubmit={handleSendMessage}
                    style={{
                      padding: '12px 16px',
                      borderTop: '1px solid var(--glass-border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexShrink: 0,
                    }}
                  >
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message in #general…"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        boxSizing: 'border-box',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        lineHeight: 1.5,
                        resize: 'none',
                        maxHeight: '120px',
                        outline: 'none',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!message.trim()}
                      style={{
                        flexShrink: 0,
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '10px',
                        border: 'none',
                        background: message.trim() ? 'rgba(99,102,241,0.3)' : 'var(--bg-hover)',
                        color: message.trim() ? 'var(--accent)' : 'var(--text-tertiary)',
                        cursor: message.trim() ? 'pointer' : 'default',
                        transition: 'all 0.15s',
                        opacity: message.trim() ? 1 : 0.4,
                      }}
                      title="Send message"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* MEETINGS TAB */}
            {activeTab === 'meetings' && (
              <motion.div
                key="meetings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}
              >
                
                {/* Voice Calling / Huddle Launcher Panel */}
                <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden', boxSizing: 'border-box', margin: 0, width: '100%' }}>
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
                    <Button
                      variant="primary"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
                      style={{
                        padding: '10px 20px',
                        boxSizing: 'border-box',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderRadius: '10px',
                        minWidth: 'fit-content',
                        height: 'auto'
                      }}
                      onClick={() => joinCall(workspace.id)}
                    >
                      Join Huddle
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      className="shrink-0"
                      style={{
                        padding: '10px 20px',
                        boxSizing: 'border-box',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderRadius: '10px',
                        minWidth: 'fit-content',
                        height: 'auto'
                      }}
                      onClick={() => startCall(workspace.id)}
                    >
                      <PhoneCall size={16} className="shrink-0" style={{ flexShrink: 0 }} />
                      <span>Start Huddle</span>
                    </Button>
                  )}
                  </div>
                </div>

                {/* Scheduled Meetings list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: 0, padding: 0, width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', boxSizing: 'border-box', padding: 0, margin: 0 }} className="pb-2 border-b border-[var(--border-light)]">
                    <div className="flex items-center gap-2">
                      <Calendar size={15} style={{ color: 'var(--text-tertiary)' }} />
                      <h3 className="section-label">Scheduled Meetings</h3>
                    </div>
                    <Button
                      size="sm"
                      style={{
                        padding: '9px 18px',
                        boxSizing: 'border-box',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderRadius: '10px',
                        minWidth: 'fit-content',
                        fontSize: '14px',
                        height: 'auto'
                      }}
                      onClick={() => setShowScheduleMeeting(true)}
                    >
                      <Plus size={14} className="shrink-0" style={{ flexShrink: 0 }} />
                      <span>Schedule Meeting</span>
                    </Button>
                  </div>

                  {meetings.length === 0 ? (
                    <EmptyState
                      icon={Video}
                      title="No meetings scheduled"
                      description="Create a meeting timeline to synchronize with workspace partners."
                      actionLabel="Schedule Meeting"
                      onAction={() => setShowScheduleMeeting(true)}
                      actionIcon={PlusIcon14}
                      style={{
                        padding: '32px 24px',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        height: 'auto',
                        minHeight: 'auto',
                        width: '100%',
                        margin: 0
                      }}
                      iconStyle={{ marginBottom: '4px' }}
                      titleStyle={{ margin: 0 }}
                      descStyle={{ margin: '0 0 8px 0' }}
                      buttonStyle={{
                        padding: '9px 18px',
                        boxSizing: 'border-box',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderRadius: '10px',
                        minWidth: 'fit-content',
                        fontSize: '14px',
                        height: 'auto',
                        marginTop: '4px',
                        marginBottom: '0px'
                      }}
                    />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', width: '100%', boxSizing: 'border-box', margin: 0 }}>
                      {meetings.map(m => {
                        const mtgDateTime = new Date(`${m.date}T${m.time}`);
                        const timeStr = mtgDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const dateStr = mtgDateTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                        
                        return (
                          <div
                            key={m.id}
                            className="surface-panel border border-[var(--border-color)] hover:border-[var(--border-focus)] transition-colors"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '16px 18px', borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
                                <h4 style={{ fontSize: '15px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, margin: 0, color: 'var(--text-primary)' }}>{m.title}</h4>
                                <button onClick={() => handleDeleteMeeting(m.id)} className="text-[var(--text-tertiary)] hover:text-red-500 p-1 rounded hover:bg-[var(--bg-hover)]" style={{ flexShrink: 0, margin: 0 }}>
                                  <Trash2 size={11} />
                                </button>
                              </div>
                              {m.description && (
                                <p style={{ fontSize: '13px', opacity: 0.6, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word', width: '100%', boxSizing: 'border-box', margin: 0, color: 'var(--text-secondary)' }}>
                                  {m.description}
                                </p>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--glass-border-light)', width: '100%', boxSizing: 'border-box' }}>
                              <span style={{ fontSize: '12px', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0, color: 'var(--text-tertiary)' }}>
                                <Calendar size={12} style={{ flexShrink: 0 }} /> {dateStr} at {timeStr}
                              </span>
                              <span style={{ fontSize: '12px', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px', flexShrink: 1, color: 'var(--accent)', fontWeight: 600 }}>
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
                <div style={{ padding: '0 0 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', boxSizing: 'border-box' }} className="border-b border-[var(--border-light)]">
                  <h3 className="section-label">Workspace Members ({members.length})</h3>
                  <Button
                    icon={UserPlus}
                    size="sm"
                    style={{ padding: '9px 18px', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
                    onClick={() => { setShowInvite(true); setInviteError(''); setInviteSuccess(false); setInviteEmail(''); }}
                  >
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
                <Card className="space-y-6" style={{ boxSizing: 'border-box', padding: '24px', overflow: 'hidden', borderRadius: '16px' }} padding={false}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                      Workspace configurations
                    </h3>
                    <p style={{ fontSize: '13px', opacity: 0.5, margin: '0 0 16px 0', color: 'var(--text-secondary)' }}>
                      Rename the workspace or update theme colors.
                    </p>
                  </div>
                  
                  <form onSubmit={handleUpdateSettings} className="space-y-5 pt-3 border-t border-[var(--border-light)]">
                    <Input
                      label="Workspace name"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      required
                    />
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', width: '100%', boxSizing: 'border-box', flexWrap: 'wrap' }}>
                      <div className="space-y-2" style={{ flex: 1, minWidth: 0 }}>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]" style={{ margin: '0 0 8px 0' }}>
                          Workspace Theme color
                        </label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
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
                      
                      <Button
                        type="submit"
                        size="sm"
                        style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '9px 18px', borderRadius: '10px' }}
                      >
                        Save changes
                      </Button>
                    </div>
                  </form>

                  <div
                    className="glass-card"
                    style={{
                      boxSizing: 'border-box',
                      padding: '20px',
                      overflow: 'hidden',
                      border: '1px solid rgba(239, 68, 68, 0.15)',
                      background: 'rgba(239, 68, 68, 0.02)',
                      borderRadius: '16px',
                      marginTop: '24px'
                    }}
                  >
                    <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Danger Zone</h4>
                    <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                      Permanently delete this workspace, including all messages, tasks, notes, files, comments, and member profiles.
                    </p>
                    <Button
                      variant="danger"
                      size="sm"
                      style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '9px 18px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => { setShowDeleteModal(true); setDeleteConfirmName(''); setDeleteError(''); }}
                    >
                      Delete Workspace
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Desktop RIGHT SIDEBAR - COLLABORATORS - Visible only for CHAT tab */}
        {activeTab === 'chat' && (
          <motion.aside
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden xl:block"
            style={{ flexShrink: 0 }}
          >
            <div
              style={{
                width: '240px',
                flexShrink: 0,
                boxSizing: 'border-box',
                padding: '16px',
                overflow: 'hidden',
                borderRadius: '16px',
                background: 'var(--glass-bg-light)',
                backdropFilter: 'blur(20px) saturate(160%)',
                WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                border: '1px solid var(--glass-border)',
              }}
            >
              {/* Header — sits fully inside card padding */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                  padding: 0,
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-primary)',
                    opacity: 0.7,
                  }}
                >
                  Members
                </span>
                <button
                  onClick={() => {
                    setShowInvite(true);
                    setInviteError('');
                    setInviteSuccess(false);
                    setInviteEmail('');
                  }}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '8px',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <UserPlus size={13} />
                </button>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  opacity: 0.45,
                  marginBottom: '12px',
                  display: 'block',
                  color: 'var(--text-primary)',
                }}
              >
                {members.length} total
              </span>

              {members.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px 0', opacity: 0.6 }}>No members found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {/* Online section */}
                  {onlineMembers.length > 0 && (
                    <div>
                      <span
                        style={{
                          fontSize: '10px',
                          opacity: 0.5,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '8px',
                          display: 'block',
                          color: '#10b981',
                          fontWeight: 600,
                        }}
                      >
                        Online · {onlineMembers.length}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {onlineMembers.map((member) => (
                          <div
                            key={member.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '6px 0',
                              overflow: 'hidden',
                            }}
                          >
                            <Avatar
                              name={member.name}
                              initials={member.initials}
                              color={member.color || 'var(--accent)'}
                              size="xs"
                              status="online"
                            />
                            <div style={{ minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                <span style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                                  {member.name}
                                </span>
                                {member.id === workspace.ownerId && (
                                  <span
                                    style={{
                                      fontSize: '9px',
                                      padding: '1px 6px',
                                      borderRadius: '999px',
                                      background: 'rgba(251,191,36,0.15)',
                                      color: '#fbbf24',
                                      flexShrink: 0,
                                      whiteSpace: 'nowrap',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                    }}
                                  >
                                    Owner
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '11px', opacity: 0.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                                {member.role}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Away section */}
                  {awayMembers.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          opacity: 0.5,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '8px',
                          display: 'block',
                          color: '#f59e0b',
                          fontWeight: 600,
                        }}
                      >
                        Away · {awayMembers.length}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {awayMembers.map((member) => (
                          <div
                            key={member.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '6px 0',
                              overflow: 'hidden',
                            }}
                          >
                            <Avatar
                              name={member.name}
                              initials={member.initials}
                              color={member.color || 'var(--accent)'}
                              size="xs"
                              status="away"
                            />
                            <div style={{ minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                <span style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                                  {member.name}
                                </span>
                                {member.id === workspace.ownerId && (
                                  <span
                                    style={{
                                      fontSize: '9px',
                                      padding: '1px 6px',
                                      borderRadius: '999px',
                                      background: 'rgba(251,191,36,0.15)',
                                      color: '#fbbf24',
                                      flexShrink: 0,
                                      whiteSpace: 'nowrap',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                    }}
                                  >
                                    Owner
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '11px', opacity: 0.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                                {member.role}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Offline section */}
                  {offlineMembers.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          opacity: 0.5,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '8px',
                          display: 'block',
                          color: 'var(--text-tertiary)',
                          fontWeight: 600,
                        }}
                      >
                        Offline · {offlineMembers.length}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {offlineMembers.map((member) => (
                          <div
                            key={member.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '6px 0',
                              overflow: 'hidden',
                              opacity: 0.7,
                            }}
                          >
                            <Avatar
                              name={member.name}
                              initials={member.initials}
                              color={member.color || 'var(--accent)'}
                              size="xs"
                              status="offline"
                            />
                            <div style={{ minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                <span style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                                  {member.name}
                                </span>
                                {member.id === workspace.ownerId && (
                                  <span
                                    style={{
                                      fontSize: '9px',
                                      padding: '1px 6px',
                                      borderRadius: '999px',
                                      background: 'rgba(251,191,36,0.15)',
                                      color: '#fbbf24',
                                      flexShrink: 0,
                                      whiteSpace: 'nowrap',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                    }}
                                  >
                                    Owner
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '11px', opacity: 0.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                                {formatLastSeen(member.lastSeen)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </div>

      {/* Global MODALS */}

      {/* Invite member modal */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} noPadding={true}>
        <form
          onSubmit={handleInviteSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            padding: '24px',
            boxSizing: 'border-box'
          }}
        >
          {/* Section 1 — Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0 }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, flex: 1 }}>Invite member</h2>
            <button
              onClick={() => setShowInvite(false)}
              type="button"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
              }}
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Section 2 — Description text */}
          <p style={{ fontSize: '13px', opacity: 0.55, lineHeight: 1.5, margin: 0, color: 'var(--text-primary)' }}>
            Enter the email address of the team member to add them directly to this workspace.
          </p>

          {/* Section 3 — Email field group */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
              Email address
            </label>
            <input
              type="email"
              placeholder="colleague@domain.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="input-base"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '12px' }}
            />
          </div>

          {inviteError && (
            <p className="text-xs font-semibold text-[var(--color-danger)]" style={{ margin: 0 }}>
              {inviteError}
            </p>
          )}

          {inviteSuccess && (
            <div
              className="p-2.5 rounded-md flex items-center gap-2 text-xs font-medium bg-emerald-500/5 text-emerald-500 border border-emerald-500/15"
              style={{ margin: 0 }}
            >
              <Check size={13} />
              <span>Added successfully</span>
            </div>
          )}

          {/* Section 4 — Invite code group */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
              OR SHARE INVITE CODE
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
              <input
                type="text"
                readOnly
                value={workspace?.inviteCode || 'N/A'}
                className="input-base font-mono text-center tracking-wider text-xs select-all"
                style={{ flex: 1, boxSizing: 'border-box', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '12px' }}
              />
              <Button
                variant="secondary"
                type="button"
                onClick={handleCopyCode}
                icon={copiedCode ? Check : Copy}
                style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                {copiedCode ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Section 5 — Action buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <Button
              variant="secondary"
              type="button"
              style={{ flex: 1 }}
              onClick={() => setShowInvite(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              style={{ flex: 1 }}
              disabled={inviteSuccess}
            >
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
        noPadding={true}
        size="md"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            padding: '24px',
            boxSizing: 'border-box'
          }}
        >
          {/* Header row (title + close button) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0 }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, flex: 1 }}>Delete Workspace</h2>
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmName('');
                setDeleteError('');
              }}
              type="button"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
              }}
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Warning text block */}
          <p style={{ fontSize: '13px', opacity: 0.6, lineHeight: 1.5, margin: 0, color: 'var(--text-secondary)' }}>
            This action is permanent and cannot be undone. All database items associated with <strong>{workspace?.name}</strong> will be permanently wiped.
          </p>

          {/* Confirmation input field group */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 0 }}>
            <label style={{ fontSize: '13px', opacity: 0.7, margin: 0, color: 'var(--text-primary)' }}>
              Please type <strong>{workspace?.name}</strong> to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="Type workspace name here"
              className="input-base"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '12px', margin: 0 }}
            />
            {deleteError && (
              <p style={{ fontSize: '12px', color: 'var(--color-danger)', fontWeight: 500, margin: 0 }}>{deleteError}</p>
            )}
          </div>

          {/* Action buttons row */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <Button
              variant="secondary"
              style={{
                flex: 1,
                padding: '10px 24px',
                boxSizing: 'border-box',
                height: 'auto'
              }}
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
              style={{
                flex: 1,
                padding: '10px 24px',
                boxSizing: 'border-box',
                height: 'auto'
              }}
              onClick={handleDeleteWorkspace}
              disabled={deleteConfirmName !== workspace.name}
            >
              Delete Permanent
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Task Modal */}
      <Modal isOpen={showCreateTask} onClose={() => setShowCreateTask(false)} noPadding={true}>
        <form
          onSubmit={handleCreateTaskSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            padding: '24px',
            boxSizing: 'border-box'
          }}
        >
          {/* Section 1 — Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0 }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, flex: 1 }}>Create task</h2>
            <button
              onClick={() => setShowCreateTask(false)}
              type="button"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
              }}
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Task title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
              Task title
            </label>
            <input
              type="text"
              placeholder="e.g. Implement Oauth authentication"
              value={newTaskData.title}
              onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
              required
              className="input-base"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '12px', margin: 0 }}
            />
          </div>

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
              Description
            </label>
            <textarea
              placeholder="What needs to be done?"
              value={newTaskData.description}
              onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
              className="input-base resize-none h-20"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '12px', margin: 0 }}
            />
          </div>

          {/* Assignee */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
              Assignee
            </label>
            <CustomSelect
              value={newTaskData.assignee}
              onChange={(val) => setNewTaskData({ ...newTaskData, assignee: val })}
              options={[
                { value: '', label: 'Unassigned' },
                ...members.map(m => ({ value: m.id, label: m.name }))
              ]}
              placeholder="Unassigned"
            />
          </div>

          {/* Priority + Due Date row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
                Priority
              </label>
              <CustomSelect
                value={newTaskData.priority}
                onChange={(val) => setNewTaskData({ ...newTaskData, priority: val })}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' }
                ]}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
                Due Date
              </label>
              <input
                type="date"
                value={newTaskData.dueDate}
                onChange={(e) => setNewTaskData({ ...newTaskData, dueDate: e.target.value })}
                className="input-base"
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '12px', margin: 0 }}
              />
            </div>
          </div>

          {/* Action buttons row */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <Button
              variant="secondary"
              type="button"
              style={{ flex: 1 }}
              onClick={() => setShowCreateTask(false)}
            >
              Cancel
            </Button>
            <Button type="submit" style={{ flex: 1 }}>
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
          noPadding={true}
          size="lg"
        >
          <form
            onSubmit={handleEditTaskSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              padding: '24px',
              boxSizing: 'border-box'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0 }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, flex: 1 }}>
                {isOwner ? "Edit Task" : "Task Details"}
              </h2>
              <button
                onClick={() => setSelectedTask(null)}
                type="button"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  padding: 0,
                }}
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Two-column layout grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 280px',
                gap: '24px',
                alignItems: 'start'
              }}
            >
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
                {/* Title */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={selectedTask.title}
                    onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                    disabled={!isOwner}
                    required
                    className="input-base"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '12px', margin: 0 }}
                  />
                </div>

                {/* Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
                    Description
                  </label>
                  <textarea
                    value={selectedTask.description || ''}
                    onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
                    disabled={!isOwner}
                    placeholder="Add task description..."
                    className="input-base resize-none h-20"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '12px', margin: 0 }}
                  />
                </div>

                {/* Discussion Stream */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                    <MessageSquare size={10} />
                    <span>Discussion Stream</span>
                  </div>

                  {/* Comments list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                    {(taskComments[selectedTask.id] || []).length === 0 ? (
                      <p style={{ fontSize: '12px', opacity: 0.4, margin: 0, fontStyle: 'italic', color: 'var(--text-primary)' }}>No comments yet.</p>
                    ) : (
                      (taskComments[selectedTask.id] || []).map(comment => {
                        const commSender = members.find(m => m.id === comment.userId) || { name: 'Member', initials: 'M' };
                        return (
                          <div
                            key={comment.id}
                            style={{
                              display: 'flex',
                              gap: '10px',
                              alignItems: 'start',
                              padding: '10px',
                              borderRadius: '8px',
                              border: '1px solid var(--glass-border-light)',
                              backgroundColor: 'var(--bg-secondary)'
                            }}
                          >
                            <Avatar name={commSender.name} initials={commSender.initials} size="xs" />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>{commSender.name}</span>
                                <span style={{ fontSize: '9px', opacity: 0.4, color: 'var(--text-primary)' }}>
                                  {new Date(comment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p style={{ fontSize: '11px', opacity: 0.7, margin: '4px 0 0 0', wordBreak: 'break-word', lineHeight: 1.4, color: 'var(--text-primary)' }}>
                                {comment.text}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Comment Input row */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                    <input
                      type="text"
                      placeholder="Add a comment…"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="input-base"
                      style={{ flex: 1, boxSizing: 'border-box', minWidth: 0, padding: '10px 14px', borderRadius: '12px' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTaskCommentSubmit(e);
                        }
                      }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={handleAddTaskCommentSubmit}
                      disabled={!commentText.trim()}
                      style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                    >
                      Comment
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '11px', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block', color: 'var(--text-primary)' }}>
                  TASK PROPERTIES
                </span>

                {/* Status Field Group */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
                    Status
                  </label>
                  <CustomSelect
                    value={selectedTask.status}
                    onChange={(val) => setSelectedTask({ ...selectedTask, status: val })}
                    disabled={!isOwner && selectedTask.assignee !== user?.id}
                    options={[
                      { value: 'todo', label: 'To do' },
                      { value: 'inProgress', label: 'In progress' },
                      { value: 'done', label: 'Done' }
                    ]}
                  />
                </div>

                {/* Assignee Field Group */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
                    Assignee
                  </label>
                  <CustomSelect
                    value={selectedTask.assignee || ''}
                    onChange={(val) => setSelectedTask({ ...selectedTask, assignee: val || null })}
                    disabled={!isOwner}
                    options={[
                      { value: '', label: 'Unassigned' },
                      ...members.map(m => ({ value: m.id, label: m.name }))
                    ]}
                    placeholder="Unassigned"
                  />
                </div>

                {/* Priority Field Group */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
                    Priority
                  </label>
                  <CustomSelect
                    value={selectedTask.priority}
                    onChange={(val) => setSelectedTask({ ...selectedTask, priority: val })}
                    disabled={!isOwner}
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' }
                    ]}
                  />
                </div>

                {/* Due Date Field Group */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={selectedTask.dueDate || ''}
                    onChange={(e) => setSelectedTask({ ...selectedTask, dueDate: e.target.value })}
                    disabled={!isOwner}
                    className="input-base"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '12px', margin: 0 }}
                  />
                </div>
              </div>

              {/* Bottom action row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  width: '100%',
                  marginTop: '8px',
                  gridColumn: '1 / -1'
                }}
              >
                <div>
                  {isOwner ? (
                    <Button
                      variant="danger"
                      size="sm"
                      type="button"
                      icon={Trash2}
                      onClick={() => handleTaskDelete(selectedTask.id)}
                      style={{
                        padding: '9px 16px',
                        boxSizing: 'border-box',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0,
                        borderRadius: '10px',
                        height: 'auto'
                      }}
                    >
                      Delete Task
                    </Button>
                  ) : (
                    <div />
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    style={{
                      padding: '10px 24px',
                      boxSizing: 'border-box',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 500,
                      height: 'auto'
                    }}
                  >
                    Cancel
                  </Button>
                  {(isOwner || selectedTask.assignee === user?.id) && (
                    <Button
                      variant="primary"
                      size="sm"
                      type="submit"
                      style={{
                        padding: '10px 24px',
                        boxSizing: 'border-box',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 500,
                        height: 'auto'
                      }}
                    >
                      Save
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Schedule Meeting Modal */}
      <Modal isOpen={showScheduleMeeting} onClose={() => setShowScheduleMeeting(false)} noPadding={true}>
        <form
          onSubmit={handleScheduleMeetingSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            padding: '24px',
            boxSizing: 'border-box'
          }}
        >
          {/* Header row (title + close button) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0 }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, flex: 1 }}>Schedule meeting</h2>
            <button
              onClick={() => setShowScheduleMeeting(false)}
              type="button"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
              }}
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Meeting title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
              Meeting title
            </label>
            <input
              type="text"
              placeholder="e.g. Design review session"
              value={newMeeting.title}
              onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
              required
              className="input-base"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '12px', margin: 0 }}
            />
          </div>

          {/* Date + Time row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
                Date
              </label>
              <input
                type="date"
                value={newMeeting.date}
                onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                required
                className="input-base"
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '12px', margin: 0 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
                Time
              </label>
              <input
                type="time"
                value={newMeeting.time}
                onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                className="input-base"
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '12px', margin: 0 }}
              />
            </div>
          </div>

          {/* Description / Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 0 }}>
            <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
              Description / Notes
            </label>
            <textarea
              placeholder="e.g. Discussing the upcoming UI adjustments"
              value={newMeeting.description}
              onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
              className="input-base text-xs p-3 w-full bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)] focus:border-[var(--accent)]"
              style={{ width: '100%', boxSizing: 'border-box', minHeight: '90px', resize: 'vertical', borderRadius: '12px', margin: 0 }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <Button
              variant="secondary"
              type="button"
              style={{
                flex: 1,
                padding: '10px 24px',
                boxSizing: 'border-box',
                height: 'auto'
              }}
              onClick={() => setShowScheduleMeeting(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              style={{
                flex: 1,
                padding: '10px 24px',
                boxSizing: 'border-box',
                height: 'auto'
              }}
            >
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
