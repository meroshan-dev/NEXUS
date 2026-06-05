import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Calendar, Trash2, Check } from 'lucide-react';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Badge, { PriorityBadge } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';

const COLS = {
  todo: { title: 'To do', dotColor: '#71717a', accent: 'var(--bg-subtle)' },
  inProgress: { title: 'In progress', dotColor: '#f59e0b', accent: 'rgba(245,158,11,0.06)' },
  done: { title: 'Done', dotColor: '#22c55e', accent: 'rgba(34,197,94,0.06)' },
};

export default function TasksPage() {
  const { id } = useParams();
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
    addTaskComment
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

  // State for tabs, selected task and commenting
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (workspaceId) fetchWorkspaceDetails(workspaceId);
  }, [workspaceId]);

  const workspace = workspaces.find((w) => w.id === workspaceId);
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

  // Pre-filter the tasks for listing and drag-and-drop snap counting
  const todoList = data.todo?.filter(filterTask) || [];
  const inProgressList = data.inProgress?.filter(filterTask) || [];
  const doneList = data.done?.filter(filterTask) || [];

  const totalTasks = todoList.length + inProgressList.length + doneList.length;

  const onDragEnd = ({ source: s, destination: d }) => {
    if (!d) return;

    // Permissions: members can only move tasks assigned to them
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
      
      // Update task status inside the object representation
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
    <div className="pb-8 min-w-0">
      <header className="page-header flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
        <div className="min-w-0">
          <p className="page-eyebrow">Tasks</p>
          <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>
            Kanban board
          </h1>
          <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            {totalTasks} task{totalTasks !== 1 ? 's' : ''} · drag cards to update status
          </p>
        </div>
        {isOwner && (
          <Button icon={Plus} onClick={() => setShowCreate(true)}>
            New task
          </Button>
        )}
      </header>

      {/* Tabs list */}
      <div className="flex gap-2 mb-6 border-b pb-1" style={{ borderColor: 'var(--border-color)' }}>
        {[
          { id: 'all', label: 'All Tasks' },
          { id: 'my', label: 'My Tasks' },
          { id: 'completed', label: 'Completed' },
          { id: 'overdue', label: 'Overdue' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="px-4 py-2 border-b-2 font-medium text-xs transition-colors cursor-pointer"
            style={{
              borderColor: activeTab === t.id ? 'var(--text-brand)' : 'transparent',
              color: activeTab === t.id ? 'var(--text-brand)' : 'var(--text-secondary)'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {totalTasks === 0 ? (
        <EmptyState
          icon={Plus}
          title="No tasks found"
          description={isOwner ? "Create a task or change your filters." : "No tasks assigned to you here."}
          actionLabel={isOwner ? "Create task" : undefined}
          actionIcon={isOwner ? Plus : undefined}
          onAction={isOwner ? () => setShowCreate(true) : undefined}
        />
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div
            className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory"
            style={{ minHeight: 'min(60vh, 520px)' }}
          >
            {Object.entries(COLS).map(([colId, cfg]) => {
              const columnTasks = colId === 'todo' ? todoList : colId === 'inProgress' ? inProgressList : doneList;
              return (
                <div key={colId} className="flex flex-col shrink-0 w-[min(88vw,300px)] sm:w-[300px] snap-start">
                  <div className="flex items-center justify-between mb-4 px-0.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: cfg.dotColor }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {cfg.title}
                      </span>
                      <span
                        className="min-w-[22px] h-[22px] px-2 rounded-[var(--radius-sm)] text-[11px] font-medium flex items-center justify-center"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
                      >
                        {columnTasks.length}
                      </span>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => setShowCreate(true)}
                        className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center transition-colors cursor-pointer"
                        style={{ color: 'var(--text-tertiary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-hover)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-tertiary)';
                        }}
                      >
                        <Plus size={15} strokeWidth={2} />
                      </button>
                    )}
                  </div>

                  <Droppable droppableId={colId}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 rounded-[var(--radius-lg)] space-y-3 p-3 sm:p-4 transition-all duration-200"
                        style={{
                          background: snapshot.isDraggingOver ? cfg.accent : 'var(--bg-subtle)',
                          border: snapshot.isDraggingOver
                            ? `1px dashed ${cfg.dotColor}66`
                            : '1px solid var(--border-light)',
                          minHeight: 180,
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
                                    className="group surface-panel p-4 sm:p-5 min-w-0 cursor-pointer hover:border-indigo-500/50 transition-colors"
                                    style={{
                                      boxShadow: snap.isDragging ? 'var(--shadow-lg)' : 'var(--shadow-card)',
                                      opacity: isDragDisabled ? 0.85 : 1
                                    }}
                                  >
                                    {task.labels?.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mb-3">
                                        {task.labels.slice(0, 2).map((l) => (
                                          <Badge key={l} variant="brand">{l}</Badge>
                                        ))}
                                      </div>
                                    )}

                                    <h3 className="text-sm font-semibold leading-snug mb-2 overflow-safe" style={{ color: 'var(--text-primary)' }}>
                                      {task.title}
                                    </h3>
                                    {task.description && (
                                      <p className="text-xs leading-relaxed line-clamp-2 mb-4" style={{ color: 'var(--text-tertiary)' }}>
                                        {task.description}
                                      </p>
                                    )}

                                    <div
                                      className="flex flex-wrap items-center justify-between gap-2 pt-4"
                                      style={{ borderTop: '1px solid var(--border-light)' }}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        {assignee && (
                                          <Avatar
                                            name={assignee.name}
                                            initials={assignee.initials}
                                            color={assignee.color || '#5e6ad2'}
                                            size="xs"
                                          />
                                        )}
                                        <PriorityBadge priority={task.priority} />
                                      </div>
                                      {task.dueDate && (
                                        <span
                                          className="flex items-center gap-1 text-[11px] font-medium shrink-0"
                                          style={{ color: dueDateColor(task.dueDate) }}
                                        >
                                          <Calendar size={11} strokeWidth={2} />
                                          {new Date(task.dueDate).toLocaleDateString('en-US', {
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

                        {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex flex-col items-center justify-center py-14 text-center">
                            <p className="text-caption">No tasks here</p>
                            {isOwner && (
                              <button
                                onClick={() => setShowCreate(true)}
                                className="text-xs mt-2 font-medium cursor-pointer"
                                style={{ color: 'var(--text-brand)' }}
                              >
                                Add task
                              </button>
                            )}
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

      {/* Selected Task Details & Comments Modal */}
      {selectedTask && (
        <Modal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title={isOwner ? "Edit Task" : "Task Details"}
          size="lg"
        >
          <form onSubmit={(e) => {
            e.preventDefault();
            if (isOwner) {
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
          }} className="space-y-6">
            <div className="flex items-center justify-between">
              <PriorityBadge priority={selectedTask.priority} />
              {isOwner && (
                <Button
                  variant="ghost"
                  type="button"
                  icon={Trash2}
                  className="!text-danger"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this task?")) {
                      deleteTask(workspaceId, selectedTask.id);
                      setSelectedTask(null);
                    }
                  }}
                >
                  Delete Task
                </Button>
              )}
            </div>

            <Input
              label="Task title"
              value={selectedTask.title}
              onChange={(e) => isOwner && setSelectedTask({ ...selectedTask, title: e.target.value })}
              required
              disabled={!isOwner}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Description
              </label>
              <textarea
                placeholder="No description provided."
                value={selectedTask.description || ''}
                onChange={(e) => isOwner && setSelectedTask({ ...selectedTask, description: e.target.value })}
                className="input-base resize-none"
                style={{ height: 88 }}
                disabled={!isOwner}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Assignee
                </label>
                <select
                  value={selectedTask.assignee || ''}
                  onChange={(e) => isOwner && setSelectedTask({ ...selectedTask, assignee: e.target.value })}
                  className="input-base"
                  disabled={!isOwner}
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Priority
                </label>
                <select
                  value={selectedTask.priority}
                  onChange={(e) => isOwner && setSelectedTask({ ...selectedTask, priority: e.target.value })}
                  className="input-base"
                  disabled={!isOwner}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Due date"
                type="date"
                icon={Calendar}
                value={selectedTask.dueDate || ''}
                onChange={(e) => isOwner && setSelectedTask({ ...selectedTask, dueDate: e.target.value })}
                disabled={!isOwner}
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Status
                </label>
                <select
                  value={selectedTask.status || 'todo'}
                  onChange={(e) => isOwner && setSelectedTask({ ...selectedTask, status: e.target.value })}
                  className="input-base"
                  disabled={!isOwner}
                >
                  <option value="todo">To Do</option>
                  <option value="inProgress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>

            {isOwner && (
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="secondary" type="button" onClick={() => setSelectedTask(null)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </div>
            )}

            {/* Comments Section */}
            <div className="border-t pt-6" style={{ borderColor: 'var(--border-color)' }}>
              <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Comments</h4>
              
              {/* Comment Input */}
              <div className="flex gap-3 mb-4">
                <Input
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (commentText.trim()) {
                      addTaskComment(selectedTask.id, commentText);
                      setCommentText('');
                    }
                  }}
                >
                  Comment
                </Button>
              </div>

              {/* Comments list */}
              <div className="space-y-4 max-h-48 overflow-y-auto pr-1">
                {(!taskComments[selectedTask.id] || taskComments[selectedTask.id].length === 0) ? (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--text-tertiary)' }}>No comments yet.</p>
                ) : (
                  taskComments[selectedTask.id].map(comm => {
                    const commenter = members.find(m => m.id === comm.userId) || { name: 'Someone', initials: 'S', color: '#6366f1' };
                    return (
                      <div key={comm.id} className="flex gap-2.5 items-start text-xs bg-[var(--bg-subtle)] p-2.5 rounded-lg border" style={{ borderColor: 'var(--border-light)' }}>
                        <Avatar name={commenter.name} initials={commenter.initials} color={commenter.color} size="xs" />
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{commenter.name}</span>
                            <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>
                              {new Date(comm.createdAt).toLocaleDateString()} {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{comm.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </form>
        </Modal>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create task">
        <form onSubmit={createTask} className="space-y-5">
          <Input
            label="Task title"
            placeholder="What needs to be done?"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            required
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Description
            </label>
            <textarea
              placeholder="Add more context…"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="input-base resize-none"
              style={{ height: 88 }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Assignee
              </label>
              <select
                value={newTask.assignee}
                onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                className="input-base"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Priority
              </label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="input-base"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <Input
            label="Due date"
            type="date"
            icon={Calendar}
            value={newTask.dueDate}
            onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
