import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Calendar, Trash2, Clock, CheckSquare, X, MessageSquare } from 'lucide-react';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Badge, { PriorityBadge } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import CustomSelect from '../components/ui/CustomSelect';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';

const COLS = {
  todo: { title: 'To do', dotColor: '#9ca3af', accent: 'var(--bg-secondary)' },
  inProgress: { title: 'In progress', dotColor: '#f59e0b', accent: 'rgba(245,158,11,0.04)' },
  done: { title: 'Done', dotColor: '#10b981', accent: 'rgba(16,185,129,0.04)' },
};

export default function TasksPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const workspaceId = id;
  const {
    tasks,
    addTask,
    updateTasks,
    fetchWorkspaceDetails,
    workspaceMembers,
    workspaces,
    deleteTask,
    updateTaskDetails,
    taskComments,
    addTaskComment,
    loading,
    activityFeed
  } = useWorkspace();
  const { user } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignee: '',
    priority: 'medium',
    dueDate: '',
  });

  const [activeTab, setActiveTab] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (workspaceId) fetchWorkspaceDetails(workspaceId);
  }, [workspaceId, fetchWorkspaceDetails]);

  const workspace = workspaces.find((w) => w.id === workspaceId);

  if (loading) return <LoadingState label="Loading tasks…" />;

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <EmptyState
          icon={CheckSquare}
          title="Workspace not found"
          description="The workspace you are trying to access does not exist or you don't have access to it."
          actionLabel="Go to Dashboard"
          onAction={() => navigate('/dashboard')}
        />
      </div>
    );
  }

  const isOwner = workspace?.ownerId === user?.id;
  const members = workspaceMembers[workspaceId] || [];
  const data = tasks[workspaceId] || { todo: [], inProgress: [], done: [] };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'done') return false;
    return new Date(dueDate) < new Date();
  };

  const filterTask = (task) => {
    if (activeTab === 'my') return task.assignee === user?.id;
    if (activeTab === 'completed') return task.status === 'done';
    if (activeTab === 'overdue') return isOverdue(task.dueDate, task.status);
    return true;
  };

  const todoList = data.todo?.filter(filterTask) || [];
  const inProgressList = data.inProgress?.filter(filterTask) || [];
  const doneList = data.done?.filter(filterTask) || [];

  const totalTasks = todoList.length + inProgressList.length + doneList.length;

  const onDragEnd = ({ source: s, destination: d }) => {
    if (!d) return;

    const movedTaskId = data[s.droppableId][s.index].id;
    const movedTaskObj = [...data[s.droppableId], ...data[d.droppableId]].find(t => t.id === movedTaskId);
    if (!isOwner && movedTaskObj?.assignee !== user?.id) {
      alert("You only have permission to update tasks assigned to you.");
      return;
    }

    if (s.droppableId === d.droppableId) {
      const col = [...data[s.droppableId]];
      const [item] = col.splice(s.index, 1);
      col.splice(d.index, 0, item);
      updateTasks(workspaceId, { ...data, [s.droppableId]: col });
    } else {
      const src = [...data[s.droppableId]];
      const dst = [...data[d.droppableId]];
      const [item] = src.splice(s.index, 1);
      
      const updatedItem = { ...item, status: d.droppableId };
      dst.splice(d.index, 0, updatedItem);
      updateTasks(workspaceId, { ...data, [s.droppableId]: src, [d.droppableId]: dst });
    }
  };

  const createTask = (e) => {
    e.preventDefault();
    addTask(workspaceId, newTask);
    setNewTask({ title: '', description: '', assignee: '', priority: 'medium', dueDate: '' });
    setShowCreate(false);
  };

  const dueDateColor = (ds) => {
    if (!ds) return 'var(--text-tertiary)';
    const d = (new Date(ds) - new Date()) / 86400000;
    if (d < 0) return 'var(--color-danger)';
    if (d < 3) return 'var(--color-warning)';
    return 'var(--text-tertiary)';
  };

  return (
    <div className="pb-8 min-w-0" style={{ overflowX: 'hidden', width: '100%', paddingRight: '24px', boxSizing: 'border-box' }}>
      <header className="page-header mb-2">
        <div className="min-w-0">
          <p className="page-eyebrow">Tasks</p>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Kanban board
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {totalTasks} task{totalTasks !== 1 ? 's' : ''} in this view · drag to update progress
          </p>
        </div>
      </header>

      {/* Tabs list and Create Task button row */}
      <div className="tasks-top-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', gap: '16px', boxSizing: 'border-box', width: '100%' }}>
        <div className="filter-tabs" style={{ display: 'flex', gap: '4px', padding: '4px', background: 'var(--glass-bg-light)', backdropFilter: 'blur(16px) saturate(160%)', border: '1px solid var(--glass-border)', borderRadius: '10px', width: 'fit-content', flexShrink: 1, minWidth: 0 }}>
          {[
            { id: 'all', label: 'All Tasks' },
            { id: 'my', label: 'My Tasks' },
            { id: 'completed', label: 'Completed' },
            { id: 'overdue', label: 'Overdue' }
          ].map(t => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  opacity: active ? 1 : 0.6,
                  background: active ? 'var(--glass-border)' : 'transparent',
                  backdropFilter: active ? 'blur(10px)' : 'none',
                  border: active ? '1px solid var(--glass-border)' : '1px solid transparent',
                  fontWeight: active ? 500 : 400,
                  transition: 'all 0.2s',
                  outline: 'none',
                  color: 'var(--text-primary)',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {isOwner && (
          <Button
            icon={Plus}
            size="sm"
            onClick={() => setShowCreate(true)}
            className="create-task-btn"
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
            New task
          </Button>
        )}
      </div>

      {totalTasks === 0 ? (
        <EmptyState
          icon={Plus}
          title="No tasks found"
          description={isOwner ? "Create a task to get started." : "No tasks assigned to you here."}
          actionLabel={isOwner ? "Create task" : undefined}
          actionIcon={isOwner ? Plus : undefined}
          onAction={isOwner ? () => setShowCreate(true) : undefined}
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
          <div className="kanban-board" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '0 24px 24px', boxSizing: 'border-box' }}>
            {Object.entries(COLS).map(([colId, cfg]) => {
              const columnTasks = colId === 'todo' ? todoList : colId === 'inProgress' ? inProgressList : doneList;
              return (
                <div key={colId} className="kanban-column" style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, letterSpacing: '0.03em', color: 'var(--text-primary)' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: cfg.dotColor }} />
                      <span style={{ textTransform: 'uppercase' }}>{cfg.title}</span>
                      <span style={{ fontSize: '11px', opacity: 0.5, fontWeight: 400, marginLeft: '4px' }}>
                        {columnTasks.length}
                      </span>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => setShowCreate(true)}
                        className="transition-colors cursor-pointer text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--glass-border-light)',
                          background: 'var(--bg-primary)',
                          outline: 'none',
                        }}
                      >
                        <Plus size={12} />
                      </button>
                    )}
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
                                  <motion.div
                                    layout
                                    onClick={() => setSelectedTask({ ...task, status: colId })}
                                    className="glass-kanban-card"
                                    style={{
                                      boxShadow: snap.isDragging ? 'var(--shadow-md)' : undefined,
                                      opacity: isDragDisabled ? 0.8 : 1
                                    }}
                                    whileHover={{ y: -1 }}
                                  >
                                    {task.labels?.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mb-2">
                                        {task.labels.slice(0, 2).map((l) => (
                                          <Badge key={l} variant="brand">{l}</Badge>
                                        ))}
                                      </div>
                                    )}

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
                                      <div className="flex items-center gap-2 min-w-0">
                                        {assignee && (
                                          <Avatar
                                            name={assignee.name}
                                            initials={assignee.initials}
                                            color={assignee.color || 'var(--accent)'}
                                            size="xs"
                                          />
                                        )}
                                        <PriorityBadge priority={task.priority} />
                                      </div>
                                      {task.dueDate && (
                                        <span
                                          className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0 border"
                                          style={{
                                            color: dueDateColor(task.dueDate),
                                            borderColor: dueDateColor(task.dueDate) + '1c',
                                            background: dueDateColor(task.dueDate) + '08'
                                          }}
                                        >
                                          <Calendar size={9} />
                                          {new Date(task.dueDate).toLocaleDateString([], {
                                            month: 'short',
                                            day: 'numeric',
                                          })}
                                        </span>
                                      )}
                                    </div>
                                  </motion.div>
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

      {/* Selected Task Details Modal */}
      {selectedTask && (
        <Modal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          noPadding={true}
          size="lg"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedTask?.title.trim()) return;
              if (isOwner || selectedTask.assignee === user?.id) {
                updateTaskDetails(workspaceId, selectedTask.id, {
                  title: selectedTask.title,
                  description: selectedTask.description,
                  assignee: selectedTask.assignee,
                  priority: selectedTask.priority,
                  dueDate: selectedTask.dueDate,
                  status: selectedTask.status === 'inProgress' ? 'in_progress' : selectedTask.status
                });
                setSelectedTask(null);
              }
            }}
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
                    onChange={(e) => isOwner && setSelectedTask({ ...selectedTask, title: e.target.value })}
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
                    onChange={(e) => isOwner && setSelectedTask({ ...selectedTask, description: e.target.value })}
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
                    {(!taskComments[selectedTask.id] || taskComments[selectedTask.id].length === 0) ? (
                      <p style={{ fontSize: '12px', opacity: 0.4, margin: 0, fontStyle: 'italic', color: 'var(--text-primary)' }}>No comments yet.</p>
                    ) : (
                      taskComments[selectedTask.id].map(comm => {
                        const commenter = members.find(m => m.id === comm.userId) || { name: 'Member', initials: 'M', color: '#6366f1' };
                        return (
                          <div
                            key={comm.id}
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
                            <Avatar name={commenter.name} initials={commenter.initials} color={commenter.color} size="xs" />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>{commenter.name}</span>
                                <span style={{ fontSize: '9px', opacity: 0.4, color: 'var(--text-primary)' }}>
                                  {new Date(comm.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p style={{ fontSize: '11px', opacity: 0.7, margin: '4px 0 0 0', wordBreak: 'break-word', lineHeight: 1.4, color: 'var(--text-primary)' }}>
                                {comm.text}
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
                          if (commentText.trim()) {
                            addTaskComment(selectedTask.id, commentText);
                            setCommentText('');
                          }
                        }
                      }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() => {
                        if (commentText.trim()) {
                          addTaskComment(selectedTask.id, commentText);
                          setCommentText('');
                        }
                      }}
                      disabled={!commentText.trim()}
                      style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                    >
                      Comment
                    </Button>
                  </div>
                </div>

                {/* Task History Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
                    <Clock size={10} /> Task History
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto', paddingRight: '4px' }}>
                    {(() => {
                      const taskHistory = (activityFeed[workspaceId] || []).filter(act => 
                        act.details?.toLowerCase().includes(selectedTask.title.toLowerCase())
                      );
                      if (taskHistory.length === 0) {
                        return <p style={{ fontSize: '12px', opacity: 0.4, margin: 0, fontStyle: 'italic', color: 'var(--text-primary)' }}>No logs recorded.</p>;
                      }
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px', borderLeft: '1px solid var(--glass-border-light)' }}>
                          {taskHistory.map((act, idx) => {
                            const actorName = act.user_id === user?.id ? 'You' : (members.find(m => m.id === act.user_id)?.name || 'Someone');
                            return (
                              <div key={act.id || idx} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '16px' }}>
                                <span style={{ opacity: 0.7, color: 'var(--text-primary)' }}>
                                  <span style={{ fontWeight: 600 }}>{actorName}</span>{' '}
                                  {act.details}
                                </span>
                                <span style={{ fontSize: '9px', opacity: 0.4, shrink: 0, fontMedium: true, whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                                  {new Date(act.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
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
                    value={selectedTask.status || 'todo'}
                    onChange={(val) => isOwner && setSelectedTask({ ...selectedTask, status: val })}
                    disabled={!isOwner && selectedTask.assignee !== user?.id}
                    options={[
                      { value: 'todo', label: 'To Do' },
                      { value: 'inProgress', label: 'In Progress' },
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
                    onChange={(val) => isOwner && setSelectedTask({ ...selectedTask, assignee: val })}
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
                    onChange={(val) => isOwner && setSelectedTask({ ...selectedTask, priority: val })}
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
                    onChange={(e) => isOwner && setSelectedTask({ ...selectedTask, dueDate: e.target.value })}
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
                      onClick={() => {
                        if (window.confirm("Delete this task permanently?")) {
                          deleteTask(workspaceId, selectedTask.id);
                          setSelectedTask(null);
                        }
                      }}
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

      {/* New Task modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} noPadding={true}>
        <form
          onSubmit={createTask}
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
              onClick={() => setShowCreate(false)}
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
              placeholder="Title of task"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
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
              placeholder="Add more description details…"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
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
              value={newTask.assignee}
              onChange={(val) => setNewTask({ ...newTask, assignee: val })}
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
                value={newTask.priority}
                onChange={(val) => setNewTask({ ...newTask, priority: val })}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' }
                ]}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)' }}>
                Due date
              </label>
              <input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
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
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button type="submit" style={{ flex: 1 }}>
              Create task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
