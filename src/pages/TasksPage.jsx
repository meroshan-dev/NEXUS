import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Calendar, Trash2, Clock, CheckSquare } from 'lucide-react';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Badge, { PriorityBadge } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
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
    <div className="pb-8 min-w-0">
      <header className="page-header flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="page-eyebrow">Tasks</p>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Kanban board
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {totalTasks} task{totalTasks !== 1 ? 's' : ''} in this view · drag to update progress
          </p>
        </div>
        {isOwner && (
          <Button icon={Plus} size="sm" onClick={() => setShowCreate(true)}>
            New task
          </Button>
        )}
      </header>

      {/* Tabs list */}
      <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] self-start shadow-sm mb-6 relative">
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
              className="relative px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-150 cursor-pointer"
              style={{
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                zIndex: 1
              }}
            >
              {active && (
                <motion.div
                  layoutId="activeTaskTabGlow"
                  className="absolute inset-0 rounded-md border"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    boxShadow: 'var(--shadow-xs)',
                    zIndex: -1
                  }}
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          );
        })}
      </div>

      {totalTasks === 0 ? (
        <EmptyState
          icon={Plus}
          title="No tasks found"
          description={isOwner ? "Create a task to get started." : "No tasks assigned to you here."}
          actionLabel={isOwner ? "Create task" : undefined}
          actionIcon={isOwner ? Plus : undefined}
          onAction={isOwner ? () => setShowCreate(true) : undefined}
        />
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div
            className="flex gap-5 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory"
            style={{ minHeight: 'clamp(350px, calc(100vh - 280px), 680px)' }}
          >
            {Object.entries(COLS).map(([colId, cfg]) => {
              const columnTasks = colId === 'todo' ? todoList : colId === 'inProgress' ? inProgressList : doneList;
              return (
                <div key={colId} className="flex flex-col shrink-0 w-[min(88vw,280px)] sm:w-[280px] snap-start">
                  <div className="flex items-center justify-between mb-3.5 px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dotColor }} />
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        {cfg.title}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                        {columnTasks.length}
                      </span>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => setShowCreate(true)}
                        className="w-6 h-6 rounded-md flex items-center justify-center border border-[var(--border-color)] transition-colors cursor-pointer text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
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
                        className="flex-1 rounded-[var(--radius-lg)] space-y-3.5 p-3 transition-all duration-200"
                        style={{
                          background: snapshot.isDraggingOver ? cfg.accent : 'var(--bg-secondary)',
                          border: snapshot.isDraggingOver
                            ? `1px dashed ${cfg.dotColor}55`
                            : '1px solid var(--border-color)',
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
                                    className="group bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--accent)] rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-sm"
                                    style={{
                                      boxShadow: snap.isDragging ? 'var(--shadow-md)' : 'var(--shadow-card)',
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

                                    <h3 className="text-xs font-semibold leading-snug mb-1.5 text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors break-words">
                                      {task.title}
                                    </h3>
                                    {task.description && (
                                      <p className="text-[10px] leading-relaxed line-clamp-2 mb-3 text-[var(--text-tertiary)]">
                                        {task.description}
                                      </p>
                                    )}

                                    <div
                                      className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--border-light)]"
                                    >
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

                        {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <p className="text-[10px] text-[var(--text-tertiary)] font-medium">No tasks here</p>
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
          }} className="space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-color)]">
              <PriorityBadge priority={selectedTask.priority} />
              {isOwner && (
                <Button
                  variant="ghost"
                  type="button"
                  icon={Trash2}
                  className="!text-[var(--color-danger)] hover:bg-red-500/5 transition-colors text-xs font-semibold px-2"
                  onClick={() => {
                    if (window.confirm("Delete this task permanently?")) {
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

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Description
              </label>
              <textarea
                placeholder="Add task description..."
                value={selectedTask.description || ''}
                onChange={(e) => isOwner && setSelectedTask({ ...selectedTask, description: e.target.value })}
                className="input-base resize-none focus:ring-2 focus:ring-[var(--accent-muted)] transition-all"
                style={{ height: 80 }}
                disabled={!isOwner}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Assignee
                </label>
                <select
                  value={selectedTask.assignee || ''}
                  onChange={(e) => isOwner && setSelectedTask({ ...selectedTask, assignee: e.target.value })}
                  className="input-base focus:ring-2 focus:ring-[var(--accent-muted)] transition-all"
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

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Priority
                </label>
                <select
                  value={selectedTask.priority}
                  onChange={(e) => isOwner && setSelectedTask({ ...selectedTask, priority: e.target.value })}
                  className="input-base focus:ring-2 focus:ring-[var(--accent-muted)] transition-all"
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

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Status
                </label>
                <select
                  value={selectedTask.status || 'todo'}
                  onChange={(e) => isOwner && setSelectedTask({ ...selectedTask, status: e.target.value })}
                  className="input-base focus:ring-2 focus:ring-[var(--accent-muted)] transition-all"
                  disabled={!isOwner}
                >
                  <option value="todo">To Do</option>
                  <option value="inProgress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-[var(--border-light)]">
              <Button variant="secondary" type="button" size="sm" onClick={() => setSelectedTask(null)}>
                Cancel
              </Button>
              {isOwner && (
                <Button type="submit" size="sm">
                  Save Changes
                </Button>
              )}
            </div>

            {/* Comments Section */}
            <div className="border-t pt-5 border-[var(--border-color)]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">Comments</h4>
              
              <div className="flex gap-2.5 mb-4">
                <Input
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
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

              <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1">
                {(!taskComments[selectedTask.id] || taskComments[selectedTask.id].length === 0) ? (
                  <p className="text-xs text-center py-4 text-[var(--text-tertiary)] border border-dashed border-[var(--border-color)] rounded-md bg-[var(--bg-secondary)]">
                    No comments yet.
                  </p>
                ) : (
                  taskComments[selectedTask.id].map(comm => {
                    const commenter = members.find(m => m.id === comm.userId) || { name: 'Member', initials: 'M', color: '#6366f1' };
                    return (
                      <div key={comm.id} className="flex gap-2.5 items-start text-xs bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-color)]">
                        <Avatar name={commenter.name} initials={commenter.initials} color={commenter.color} size="xs" />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-0.5 gap-2">
                            <span className="font-semibold text-[var(--text-primary)] truncate">{commenter.name}</span>
                            <span className="text-[9px] text-[var(--text-tertiary)] shrink-0 font-medium">
                              {new Date(comm.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[var(--text-secondary)] whitespace-pre-wrap break-words">{comm.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Task History Section */}
            <div className="border-t pt-5 border-[var(--border-color)]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
                <Clock size={12} /> Task History
              </h4>
              <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1">
                {(() => {
                  const taskHistory = (activityFeed[workspaceId] || []).filter(act => 
                    act.details?.toLowerCase().includes(selectedTask.title.toLowerCase())
                  );
                  if (taskHistory.length === 0) {
                    return <p className="text-[10px] text-center py-2 text-[var(--text-tertiary)]">No logs recorded.</p>;
                  }
                  return (
                    <div className="relative pl-3 border-l border-[var(--border-color)] ml-1.5 space-y-2.5 py-0.5">
                      {taskHistory.map((act, idx) => {
                        const actorName = act.user_id === user?.id ? 'You' : (members.find(m => m.id === act.user_id)?.name || 'Someone');
                        return (
                          <div key={act.id || idx} className="text-[10px] relative flex items-start justify-between gap-4">
                            <span className="absolute -left-[16.5px] top-1.5 w-1.5 h-1.5 rounded-full bg-[var(--bg-primary)] border border-[var(--accent)] shrink-0" />
                            <span className="text-[var(--text-secondary)]">
                              <span className="font-semibold text-[var(--text-primary)]">{actorName}</span>{' '}
                              {act.details}
                            </span>
                            <span className="text-[9px] text-[var(--text-tertiary)] shrink-0 font-medium whitespace-nowrap">
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
          </form>
        </Modal>
      )}

      {/* New Task modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create task">
        <form onSubmit={createTask} className="space-y-4">
          <Input
            label="Task title"
            placeholder="Title of task"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Description
            </label>
            <textarea
              placeholder="Add more description details…"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="input-base resize-none"
              style={{ height: 80 }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
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
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
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
          <div className="flex gap-3 pt-3 border-t border-[var(--border-light)]">
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
