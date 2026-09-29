import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Utensils, 
  Pill, 
  Droplet, 
  Activity, 
  Sparkles, 
  Check, 
  RefreshCw,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { caregiverApi } from '../../services/api';
import { offlineQueue } from '../../services/offlineQueue';
import type { CareTask, TimeOfDay, ShiftDetails } from '../../types';

interface TasksScreenProps {
  shiftDetails: ShiftDetails | null;
}

export const TasksScreen: React.FC<TasksScreenProps> = ({ shiftDetails }) => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTime, setFilterTime] = useState<TimeOfDay | 'ALL'>('ALL');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [noteInputTaskId, setNoteInputTaskId] = useState<string | null>(null);
  const [taskNote, setTaskNote] = useState<string>('');

  const [syncStatusMap, setSyncStatusMap] = useState<Record<string, 'SYNCING' | 'SYNCED' | 'FAILED' | 'OFFLINE'>>({});

  const shiftId = shiftDetails?.shift?.id;

  const loadTasks = async () => {
    if (!shiftId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await caregiverApi.getShiftTasks(shiftId);
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [shiftId]);

  const toggleTaskCompletion = async (task: CareTask) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    setUpdatingTaskId(task.id);
    setSyncStatusMap((prev) => ({ ...prev, [task.id]: 'SYNCING' }));

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, status: newStatus, recordedAt: new Date().toISOString() }
          : t
      )
    );

    try {
      await caregiverApi.updateCareTask(task.id, {
        status: newStatus,
        details: task.details,
        notes: task.notes,
        idempotencyKey: offlineQueue.generateIdempotencyKey(),
      });
      setSyncStatusMap((prev) => ({
        ...prev,
        [task.id]: offlineQueue.isOnline ? 'SYNCED' : 'OFFLINE',
      }));
    } catch (err) {
      console.error('Error updating task:', err);
      setSyncStatusMap((prev) => ({ ...prev, [task.id]: 'FAILED' }));
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleWaterQuickIntake = async (task: CareTask) => {
    const currentMl = (task.details?.waterMl as number) || 0;
    const newMl = currentMl + 250;
    const newDetails = { ...task.details, waterMl: newMl };
    setUpdatingTaskId(task.id);
    setSyncStatusMap((prev) => ({ ...prev, [task.id]: 'SYNCING' }));

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: 'COMPLETED',
              details: newDetails,
              recordedAt: new Date().toISOString(),
            }
          : t
      )
    );

    try {
      await caregiverApi.updateCareTask(task.id, {
        status: 'COMPLETED',
        details: newDetails,
        idempotencyKey: offlineQueue.generateIdempotencyKey(),
      });
      setSyncStatusMap((prev) => ({
        ...prev,
        [task.id]: offlineQueue.isOnline ? 'SYNCED' : 'OFFLINE',
      }));
    } catch (err) {
      console.error('Error recording water intake:', err);
      setSyncStatusMap((prev) => ({ ...prev, [task.id]: 'FAILED' }));
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleSaveNote = async (taskId: string) => {
    if (!taskNote.trim()) return;
    setUpdatingTaskId(taskId);

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, notes: taskNote.trim() } : t))
    );

    try {
      await caregiverApi.updateCareTask(taskId, {
        status: 'COMPLETED',
        notes: taskNote.trim(),
        idempotencyKey: offlineQueue.generateIdempotencyKey(),
      });
      setNoteInputTaskId(null);
      setTaskNote('');
    } catch (err) {
      console.error('Failed to update notes:', err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterTime === 'ALL') return true;
    return t.timeOfDay === filterTime;
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'MEAL':
        return <Utensils className="w-4 h-4 text-amber-600" />;
      case 'MEDICATION_OBSERVATION':
        return <Pill className="w-4 h-4 text-indigo-600" />;
      case 'WATER_INTAKE':
        return <Droplet className="w-4 h-4 text-sky-600" />;
      case 'MOBILITY':
        return <Activity className="w-4 h-4 text-emerald-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-teal-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-xs font-semibold">Loading daily care checklist...</p>
      </div>
    );
  }

  if (!shiftId) {
    return (
      <div className="p-4 max-w-md mx-auto text-center py-12 text-slate-500">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h3 className="font-bold text-sm text-slate-800">No Active Shift</h3>
        <p className="text-xs mt-1">Please start or check into a shift on the Today tab first.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto pb-24">
      {/* Header & Progress Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-base text-slate-900">{t('tasksTitle')}</h2>
          <span className="text-xs font-bold text-primary">
            {completedTasks}/{totalTasks} ({progressPercent}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-3">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Time of Day Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(['ALL', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'] as const).map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => setFilterTime(time)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filterTime === time
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {time === 'ALL'
                ? 'All Tasks'
                : time === 'MORNING'
                ? t('morning')
                : time === 'AFTERNOON'
                ? t('afternoon')
                : time === 'EVENING'
                ? t('evening')
                : t('night')}
            </button>
          ))}
        </div>
      </div>

      {/* Task Items List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl text-center border border-slate-200 text-slate-500 text-xs">
            No care activities recorded for this time slot.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'COMPLETED';
            const isUpdating = updatingTaskId === task.id;
            const syncStatus = syncStatusMap[task.id];

            return (
              <div
                key={task.id}
                className={`bg-white rounded-2xl p-4 border transition-all ${
                  isCompleted
                    ? 'border-emerald-200/90 bg-emerald-50/20'
                    : 'border-slate-200/90 shadow-xs'
                }`}
              >
                {/* Header row: Category, Time, Sync Status */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    {getCategoryIcon(task.category)}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {task.category.replace(/_/g, ' ')} • {task.timeOfDay}
                    </span>
                  </div>

                  {/* Sync State Badge */}
                  {syncStatus === 'SYNCING' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Syncing...
                    </span>
                  )}
                  {syncStatus === 'SYNCED' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <Check className="w-2.5 h-2.5" /> Synced
                    </span>
                  )}
                  {syncStatus === 'OFFLINE' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Offline Queued
                    </span>
                  )}
                  {syncStatus === 'FAILED' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                      Sync Failed
                    </span>
                  )}
                  {!syncStatus && isCompleted && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Completed
                    </span>
                  )}
                  {!syncStatus && !isCompleted && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                      Pending
                    </span>
                  )}
                </div>

                {/* Main Task Title */}
                <h4
                  className={`text-sm font-bold leading-snug mb-1 ${
                    isCompleted ? 'text-slate-600 line-through' : 'text-slate-900'
                  }`}
                >
                  {task.taskName}
                </h4>

                {/* Water intake measurement info */}
                {task.category === 'WATER_INTAKE' && task.details?.waterMl && (
                  <div className="mt-1 text-xs text-sky-800 font-semibold flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5 fill-sky-200 text-sky-600" />
                    <span>Hydration recorded: {task.details.waterMl} ml</span>
                  </div>
                )}

                {/* Task Note Display */}
                {task.notes && (
                  <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 italic">
                    "{task.notes}"
                  </div>
                )}

                {/* Action Row: Primary Action Button + Quick Note / Water buttons */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {/* Primary Complete / Undo Button */}
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => toggleTaskCompletion(task)}
                    aria-label={`${isCompleted ? 'Undo' : 'Complete'} task: ${task.taskName}`}
                    className={`flex-1 py-2.5 px-3 min-h-[46px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all touch-action-manipulation ${
                      isCompleted
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-primary hover:bg-primary-hover text-white shadow-xs'
                    }`}
                  >
                    {isUpdating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : isCompleted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>✓ Completed {task.recordedAt ? `(${new Date(task.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}</span>
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4" />
                        <span>[ COMPLETE TASK ]</span>
                      </>
                    )}
                  </button>

                  {/* Water intake quick action */}
                  {task.category === 'WATER_INTAKE' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleWaterQuickIntake(task)}
                      aria-label="Add 250ml water"
                      className="py-2.5 px-3 min-h-[46px] bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-xl text-xs font-bold flex items-center gap-1 touch-action-manipulation shrink-0"
                    >
                      <Droplet className="w-3.5 h-3.5 fill-sky-200" />
                      <span>+250ml</span>
                    </button>
                  )}

                  {/* Observation note toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      setNoteInputTaskId(noteInputTaskId === task.id ? null : task.id);
                      setTaskNote(task.notes || '');
                    }}
                    aria-label={`Add observation note for ${task.taskName}`}
                    className="p-2.5 min-h-[46px] min-w-[46px] flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-colors touch-action-manipulation shrink-0"
                    title="Add observation note"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>

                {/* Inline Note Editor Modal/Box */}
                {noteInputTaskId === task.id && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Care Observation Note
                    </label>
                    <textarea
                      rows={2}
                      value={taskNote}
                      onChange={(e) => setTaskNote(e.target.value)}
                      placeholder="e.g., patient ate half porridge, in cheerful mood, requested extra water..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setNoteInputTaskId(null)}
                        className="py-2 px-3 min-h-[40px] text-xs text-slate-600 hover:bg-slate-200 rounded-lg font-semibold touch-action-manipulation"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleSaveNote(task.id)}
                        className="py-2 px-3.5 min-h-[40px] text-xs bg-primary hover:bg-primary-hover text-white rounded-lg font-bold shadow-xs touch-action-manipulation"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
