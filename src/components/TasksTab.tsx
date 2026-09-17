import React, { useState, useEffect } from 'react';
import {
  TaskItem,
  TaskPriority,
  TaskCategory,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  getStoredTasks,
  saveStoredTasks,
  getDueDateBadge,
} from '../lib/tasksStorage';
import { syncTasksToNative } from '../lib/widgetSyncBridge';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Filter,
  Check,
  ListTodo,
} from 'lucide-react';

export function TasksTab() {
  const [tasks, setTasks] = useState<TaskItem[]>(() => getStoredTasks());
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(() => {
    try {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const params = new URLSearchParams(hash.split('?')[1] || '');
      return params.get('action') === 'new';
    } catch {}
    return false;
  });

  // New task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('12:00');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState<TaskCategory>('study');

  useEffect(() => {
    saveStoredTasks(tasks);
    syncTasksToNative(tasks);
  }, [tasks]);

  useEffect(() => {
    const handleCreate = () => {
      setIsAdding(true);
    };
    window.addEventListener('create-new-task', handleCreate);
    return () => window.removeEventListener('create-new-task', handleCreate);
  }, []);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      priority,
      category,
      isCompleted: false,
      createdAt: Date.now(),
    };

    setTasks([newTask, ...tasks]);
    setTitle('');
    setDescription('');
    setIsAdding(false);
  };

  const handleToggleTask = (id: string) => {
    setTasks(
      tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              isCompleted: !t.isCompleted,
              completedAt: !t.isCompleted ? Date.now() : undefined,
            }
          : t
      )
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  // Filtered tasks
  const filteredTasks = tasks.filter((t) => {
    if (filterMode === 'pending' && t.isCompleted) return false;
    if (filterMode === 'completed' && !t.isCompleted) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    return true;
  });

  const totalTasks = tasks.length;
  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const pendingCount = totalTasks - completedCount;
  const percentDone = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Header Glass Panel */}
      <div className="liquid-glass-card liquid-specular rounded-3xl p-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl liquid-glass-accent flex items-center justify-center font-bold">
            <ListTodo className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Tasks & Focus Agenda
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {pendingCount} pending • {completedCount} completed ({percentDone}% done)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="liquid-glass-accent inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          {isAdding ? 'Close' : 'New Task'}
        </button>
      </div>

      {/* Quick Task Creation Card */}
      {isAdding && (
        <form
          onSubmit={handleCreateTask}
          className="liquid-glass-card liquid-specular rounded-3xl p-6 shadow-lg space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              Create New Task
            </h3>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you need to get done?"
              className="liquid-glass-input w-full px-4 py-3 rounded-2xl text-slate-900 dark:text-slate-100 text-sm font-semibold outline-none transition"
              autoFocus
            />

            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes or details..."
              className="liquid-glass-input w-full px-4 py-2.5 rounded-xl text-slate-900 dark:text-slate-100 text-xs outline-none transition"
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Category */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TaskCategory)}
                  className="liquid-glass-input w-full px-3 py-2 rounded-xl text-slate-800 dark:text-slate-200 text-xs font-semibold outline-none"
                >
                  <option value="study">Study</option>
                  <option value="kannada">Kannada Project</option>
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="liquid-glass-input w-full px-3 py-2 rounded-xl text-slate-800 dark:text-slate-200 text-xs font-semibold outline-none"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="liquid-glass-input w-full px-3 py-2 rounded-xl text-slate-800 dark:text-slate-200 text-xs outline-none"
                />
              </div>

              {/* Due Time */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Due Time</label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="liquid-glass-input w-full px-3 py-2 rounded-xl text-slate-800 dark:text-slate-200 text-xs outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10 dark:border-white/5">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="liquid-glass-btn px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="liquid-glass-accent px-6 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition"
            >
              Add Task
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs & Category Selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="liquid-glass-dock liquid-specular flex items-center gap-1.5 p-1 rounded-2xl">
          {(['pending', 'all', 'completed'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilterMode(mode)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                filterMode === mode
                  ? 'liquid-glass-accent shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="liquid-glass-input px-3 py-1.5 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-medium outline-none"
          >
            <option value="all">All Categories</option>
            <option value="study">Study</option>
            <option value="kannada">Kannada Project</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
          </select>
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="liquid-glass-card liquid-specular rounded-3xl p-12 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {filterMode === 'completed'
                ? 'No completed tasks yet.'
                : 'No pending tasks on your agenda!'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tap "New Task" above to schedule revision, font conversion targets, or study sessions.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const dueBadge = getDueDateBadge(task.dueDate);
            const prioInfo = TASK_PRIORITIES[task.priority];
            const catInfo = TASK_CATEGORIES[task.category];

            return (
              <div
                key={task.id}
                className={`liquid-glass-card liquid-specular group rounded-2xl p-4 transition-all duration-200 flex items-start justify-between gap-3 border ${
                  task.isCompleted
                    ? 'opacity-60'
                    : 'hover:border-black/40 dark:hover:border-white/40 shadow-sm'
                }`}
              >
                {/* Left: Checkbox + Content */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task.id)}
                    className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 ${
                      task.isCompleted
                        ? 'liquid-glass-accent shadow-sm'
                        : 'border-white/30 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50 bg-white/40 dark:bg-black/40'
                    }`}
                  >
                    {task.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs sm:text-sm font-bold break-words ${
                          task.isCompleted
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-[11.5px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Badges strip */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {/* Category */}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catInfo.color}`}>
                        {catInfo.labelEn}
                      </span>

                      {/* Priority */}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${prioInfo.badgeColor}`}>
                        {prioInfo.label} Priority
                      </span>

                      {/* Due Date */}
                      {dueBadge && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${dueBadge.color}`}>
                          <Calendar className="w-3 h-3" />
                          {dueBadge.text} {task.dueTime ? `at ${task.dueTime}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Delete Action */}
                <button
                  type="button"
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-slate-400 hover:text-black dark:hover:text-white p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition opacity-80 group-hover:opacity-100"
                  title="Delete Task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
