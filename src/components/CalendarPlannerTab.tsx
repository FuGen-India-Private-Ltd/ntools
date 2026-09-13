import React, { useState, useEffect, useMemo, useRef, useTransition } from 'react';
import {
  CalendarEvent,
  getStoredCalendarEvents,
  saveStoredCalendarEvents,
  getHolidaysForMonth,
  getHolidayForDate,
  HolidayItem,
  KARNATAKA_INDIAN_HOLIDAYS,
  getNextUpcomingEvent,
  getUpcomingPriorDayAlerts,
} from '../lib/calendarStorage';
import { getStoredTasks, TaskItem } from '../lib/tasksStorage';
import { syncCalendarToNative } from '../lib/widgetSyncBridge';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  CalendarDays,
  X,
  ListTodo,
  Check,
  Cake,
  Heart,
  Sparkles,
  Tag,
  AlignLeft,
  Gift,
} from 'lucide-react';

export const CalendarPlannerTab = React.memo(function CalendarPlannerTab() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(() => getStoredCalendarEvents());
  const [tasks] = useState<TaskItem[]>(() => getStoredTasks());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [, startTransition] = useTransition();

  const handleSelectDate = (dateStr: string) => {
    startTransition(() => {
      setSelectedDateStr(dateStr);
    });
  };


  // Add Event / Birthday Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'event' | 'birthday' | 'anniversary'>('event');
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState<CalendarEvent['category']>('personal');
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndTime, setEventEndTime] = useState('10:00');
  const [eventDesc, setEventDesc] = useState('');

  // Avoid running blocking native sync during initial component mount
  const isFirstMountRef = useRef(true);
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    saveStoredCalendarEvents(events);
    syncCalendarToNative(events);
  }, [events]);

  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();

  const firstDayOfWeek = useMemo(() => new Date(year, monthIndex, 1).getDay(), [year, monthIndex]);
  const daysInMonth = useMemo(() => new Date(year, monthIndex + 1, 0).getDate(), [year, monthIndex]);

  const monthHolidays = useMemo(() => getHolidaysForMonth(year, monthIndex), [year, monthIndex]);

  const prevMonth = () => setCurrentDate(new Date(year, monthIndex - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, monthIndex + 1, 1));
  const todayMonth = () => {
    const today = new Date();
    setCurrentDate(today);
    handleSelectDate(today.toISOString().split('T')[0]);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const todayStr = new Date().toISOString().split('T')[0];

  const openAddModal = (mode: 'event' | 'birthday' | 'anniversary') => {
    setModalMode(mode);
    if (mode === 'birthday') {
      setEventCategory('birthday');
      setEventTitle('');
      setEventDesc('Annual Birthday Celebration 🎂');
    } else if (mode === 'anniversary') {
      setEventCategory('anniversary');
      setEventTitle('');
      setEventDesc('Anniversary Celebration 💍');
    } else {
      setEventCategory('personal');
      setEventTitle('');
      setEventDesc('');
    }
    setIsModalOpen(true);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const newEvt: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: eventTitle.trim(),
      date: selectedDateStr,
      startTime: eventCategory === 'birthday' || eventCategory === 'anniversary' ? undefined : eventStartTime,
      endTime: eventCategory === 'birthday' || eventCategory === 'anniversary' ? undefined : eventEndTime,
      category: eventCategory,
      description: eventDesc.trim() || undefined,
      isCompleted: false,
    };

    setEvents([newEvt, ...events]);
    setEventTitle('');
    setEventDesc('');
    setIsModalOpen(false);
  };

  const handleToggleComplete = (id: string) => {
    setEvents(
      events.map((evt) =>
        evt.id === id ? { ...evt, isCompleted: !evt.isCompleted } : evt
      )
    );
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter((evt) => evt.id !== id));
  };

  const handleToggleWished = (id: string) => {
    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id === id) {
          const newWished = !evt.isWished;
          if (newWished) {
            window.dispatchEvent(
              new CustomEvent('app-toast', {
                detail: {
                  id: `wished-${Date.now()}`,
                  type: 'success',
                  title: '🎉 Marked as Wished!',
                  description: `Birthday wish recorded for "${evt.title}". 🎉`,
                },
              })
            );
          }
          return {
            ...evt,
            isWished: newWished,
            wishedDate: newWished ? new Date().toISOString() : undefined,
          };
        }
        return evt;
      })
    );
  };

  // Pre-index items by date for O(1) instantaneous calendar grid lookups
  const { activeEventDates, birthdayDates, activeTaskDates, holidayDaysMap } = useMemo(() => {
    const evDates = new Set<string>();
    const bdayDates = new Set<string>();
    for (const e of events) {
      if (!e.isCompleted) {
        evDates.add(e.date);
        if (e.category === 'birthday') bdayDates.add(e.date);
      }
    }
    const tDates = new Set<string>();
    for (const t of tasks) {
      if (!t.isCompleted && t.dueDate) tDates.add(t.dueDate);
    }
    const hDays = new Map<number, HolidayItem>();
    for (const h of monthHolidays) {
      hDays.set(h.day, h.holiday);
    }
    return {
      activeEventDates: evDates,
      birthdayDates: bdayDates,
      activeTaskDates: tDates,
      holidayDaysMap: hDays,
    };
  }, [events, tasks, monthHolidays]);

  // Active uncompleted events and tasks for the selected date (no completed events shown in list)
  const activeDateEvents = useMemo(() => {
    return events.filter((e) => e.date === selectedDateStr && !e.isCompleted);
  }, [events, selectedDateStr]);

  const activeDateTasks = useMemo(() => {
    return tasks.filter((t) => t.dueDate === selectedDateStr && !t.isCompleted);
  }, [tasks, selectedDateStr]);

  const selectedHoliday = useMemo(() => {
    const [sYear, sMonth, sDay] = selectedDateStr.split('-').map(Number);
    return getHolidayForDate(sYear, sMonth - 1, sDay);
  }, [selectedDateStr]);

  const formattedSelectedDate = useMemo(() => {
    return new Date(selectedDateStr + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDateStr]);

  const upcoming = useMemo(() => getNextUpcomingEvent(events), [events]);
  const priorDayAlerts = useMemo(() => getUpcomingPriorDayAlerts(events), [events]);

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto select-none">
      {/* Proactive Prior-Day Alerts & Compulsory Birthday Notifications */}
      {priorDayAlerts.length > 0 && (
        <div className="space-y-2">
          {priorDayAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3.5 sm:p-4 rounded-3xl border flex items-center justify-between gap-3 shadow-sm ${
                alert.isBirthday
                  ? alert.isWished
                    ? 'liquid-glass-card border-emerald-500/30 dark:border-emerald-500/20'
                    : 'liquid-glass-card border-rose-500/40 bg-rose-500/[0.04]'
                  : 'liquid-glass-card border-black/15 dark:border-white/15'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                    alert.isBirthday
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      : 'liquid-glass text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {alert.isBirthday ? <Cake className="w-5 h-5" /> : <CalendarDays className="w-5 h-5" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        alert.isTomorrow
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25'
                      }`}
                    >
                      {alert.isTomorrow ? 'Tomorrow' : 'Today'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                      {alert.title}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {alert.isBirthday
                      ? alert.isWished
                        ? '🎉 Wished! Reminder completed.'
                        : alert.isTomorrow
                        ? 'Tomorrow is their birthday 🎂'
                        : 'Today is their birthday 🎉'
                      : alert.time
                      ? `Scheduled at ${alert.time}`
                      : 'Prior-day upcoming event notice'}
                  </p>
                </div>
              </div>

              {alert.isBirthday && (
                <button
                  type="button"
                  onClick={() => handleToggleWished(alert.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                    alert.isWished
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-600 text-white shadow-sm hover:bg-rose-700'
                  }`}
                >
                  {alert.isWished ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Wished 🎉</span>
                    </>
                  ) : (
                    <>
                      <Gift className="w-3.5 h-3.5" />
                      <span>Mark Wished</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Month Navigation & Actions Header */}
      <div className="liquid-glass-card liquid-specular rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="liquid-glass-btn p-2 rounded-xl text-slate-700 dark:text-slate-300 transition active:scale-95 cursor-pointer"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 px-1 select-none min-w-[140px] text-center">
            {monthName}
          </h2>

          <button
            type="button"
            onClick={nextMonth}
            className="liquid-glass-btn p-2 rounded-xl text-slate-700 dark:text-slate-300 transition active:scale-95 cursor-pointer"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={todayMonth}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 ml-1 transition cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Quick Add Buttons & View Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => openAddModal('birthday')}
            className="liquid-glass-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-slate-800 dark:text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <Cake className="w-4 h-4" />
            <span>+ Birthday</span>
          </button>

          <button
            type="button"
            onClick={() => openAddModal('event')}
            className="liquid-glass-accent inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Event</span>
          </button>
        </div>
      </div>

      {/* Upcoming Event Alert Banner */}
      {upcoming && (
        <div className="liquid-glass-card liquid-specular px-4 py-2.5 rounded-2xl flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" />
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
              Upcoming: {upcoming.title}
            </span>
          </div>
          <span className="shrink-0 px-2.5 py-0.5 rounded-full liquid-glass-accent text-[10px] font-bold shadow-sm">
            {upcoming.daysRemaining === 0 ? 'Today!' : `In ${upcoming.daysRemaining} days (${upcoming.dateFormatted})`}
          </span>
        </div>
      )}

      {/* Month Calendar Grid */}
      <div className="liquid-glass-card liquid-specular rounded-3xl p-4 sm:p-6 space-y-2">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-bold text-slate-400 py-1">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`blank-${i}`} className="h-11 sm:h-14 rounded-xl bg-transparent" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNumber = i + 1;
            const dateStr = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}-${dayNumber.toString().padStart(2, '0')}`;
            const isSelected = dateStr === selectedDateStr;
            const isToday = dateStr === todayStr;

            const hasBirthdays = birthdayDates.has(dateStr);
            const hasHoliday = holidayDaysMap.has(dayNumber);
            const hasAnyItem = activeEventDates.has(dateStr) || activeTaskDates.has(dateStr) || hasHoliday;

            return (
              <div
                key={dateStr}
                onClick={() => handleSelectDate(dateStr)}
                className={`h-11 sm:h-14 p-1 rounded-xl cursor-pointer transition-colors duration-100 flex flex-col items-center justify-between relative select-none border active:scale-95 ${
                  isSelected
                    ? 'liquid-glass-accent shadow-md border-transparent text-white'
                    : isToday
                    ? 'bg-black/10 dark:bg-white/20 border-black/30 dark:border-white/30'
                    : 'bg-black/[0.03] dark:bg-white/[0.04] border-black/5 dark:border-white/10 hover:bg-black/[0.07] dark:hover:bg-white/[0.08]'
                }`}
              >
                <div className="w-full flex justify-center items-center">
                  <span
                    className={`text-xs sm:text-sm font-bold ${
                      isToday && !isSelected
                        ? 'w-6 h-6 rounded-full bg-black/10 dark:bg-white/20 flex items-center justify-center font-black'
                        : 'font-bold'
                    }`}
                  >
                    {dayNumber}
                  </span>
                </div>

                {/* Status Dot / Birthday / Festival Indicator */}
                <div className="h-2.5 flex items-center justify-center gap-0.5">
                  {hasBirthdays ? (
                    <span className="text-[10px] leading-none" title="Birthday">🎂</span>
                  ) : hasHoliday ? (
                    <span className="text-[9px] leading-none" title="Festival / Holiday">🌟</span>
                  ) : hasAnyItem ? (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected
                          ? 'bg-current opacity-70'
                          : 'bg-black/50 dark:bg-white/50'
                      }`}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Regional & Local Festivals of the Month */}
      {monthHolidays.length > 0 && (
        <div className="liquid-glass-card liquid-specular rounded-3xl p-4 sm:p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl liquid-glass-accent shrink-0">
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Festivals &amp; Holidays • {monthName}
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Tap any festival to select the date
                </span>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full liquid-glass-dock text-slate-700 dark:text-slate-300 shrink-0">
              {monthHolidays.length} {monthHolidays.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {monthHolidays.map(({ day, holiday }) => {
              const hDateStr = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              const isHolidaySelected = hDateStr === selectedDateStr;
              return (
                <div
                  key={`${holiday.name}-${day}`}
                  onClick={() => handleSelectDate(hDateStr)}
                  className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 active:scale-[0.98] ${
                    isHolidaySelected
                      ? 'liquid-glass-accent shadow-md border-transparent'
                      : 'bg-black/[0.03] dark:bg-white/[0.04] border-black/10 dark:border-white/10 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                  }`}
                  title="Click to view details for this date"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex flex-col items-center justify-center shrink-0 border border-black/10 dark:border-white/15">
                      <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 leading-none">
                        {currentDate.toLocaleString('default', { month: 'short' })}
                      </span>
                      <span className="text-sm font-black text-slate-900 dark:text-slate-100 leading-none mt-0.5">
                        {day}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                        {holiday.name}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold truncate">
                        {holiday.kannadaName}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                      holiday.type === 'public'
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {holiday.type === 'public' ? 'Public Holiday' : 'Festival'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Date Agenda View (Directly Visible Inline on Date Selection) */}
      <div className="liquid-glass-card liquid-specular rounded-3xl p-5 sm:p-6 space-y-4">
        {/* Date Header & Inline Action Bar */}
        <div className="flex items-center justify-between border-b border-white/10 dark:border-white/5 pb-3 flex-wrap gap-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Agenda & Events
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
              {formattedSelectedDate}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openAddModal('birthday')}
              className="liquid-glass-btn px-3 py-1.5 rounded-xl text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Cake className="w-3.5 h-3.5" />
              <span>Add Birthday</span>
            </button>

            <button
              type="button"
              onClick={() => openAddModal('event')}
              className="liquid-glass-accent px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event</span>
            </button>
          </div>
        </div>

        {/* Holiday Banner if applicable */}
        {selectedHoliday && (
          <div className="p-4 rounded-2xl liquid-glass-dock border border-black/15 dark:border-white/15 text-xs space-y-0.5">
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              <span>{selectedHoliday.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/15 text-slate-900 dark:text-slate-100 uppercase font-bold">
                Holiday
              </span>
            </div>
            <div className="text-slate-600 dark:text-slate-300 text-[11px] font-semibold pl-6">
              {selectedHoliday.kannadaName}
            </div>
          </div>
        )}

        {/* Active Events, Birthdays & Tasks for Selected Date (Excludes Completed) */}
        <div className="space-y-2.5">
          {activeDateEvents.length === 0 && activeDateTasks.length === 0 && !selectedHoliday ? (
            <div className="py-8 text-center text-xs text-slate-400 space-y-2">
              <CalendarDays className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p>No active events or birthdays scheduled for this date.</p>
              <div className="flex justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openAddModal('birthday')}
                  className="text-slate-700 dark:text-slate-300 font-bold hover:underline"
                >
                  + Add Birthday
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => openAddModal('event')}
                  className="text-slate-700 dark:text-slate-300 font-bold hover:underline"
                >
                  + Add Event
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Active Event & Birthday Cards */}
              {activeDateEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3.5 sm:p-4 rounded-2xl border transition space-y-1.5 bg-black/[0.03] dark:bg-white/[0.04] border-black/10 dark:border-white/10"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {evt.category === 'birthday' ? (
                        <div className="p-2 rounded-xl liquid-glass-accent shrink-0">
                          <Cake className="w-4 h-4" />
                        </div>
                      ) : evt.category === 'anniversary' ? (
                        <div className="p-2 rounded-xl liquid-glass-accent shrink-0">
                          <Heart className="w-4 h-4" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(evt.id)}
                          className="w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 border-white/30 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50 bg-white/40 dark:bg-black/40 cursor-pointer"
                          title="Click to complete event"
                        >
                          {evt.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                            {evt.title}
                          </span>

                          <span
                            className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              evt.category === 'birthday' || evt.category === 'anniversary'
                                ? 'bg-black/5 dark:bg-white/10 text-slate-800 dark:text-slate-200'
                                : 'bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {evt.category}
                          </span>

                          {evt.category === 'birthday' && (
                            evt.isWished ? (
                              <span className="text-[9.5px] px-2 py-0.5 rounded-full font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 flex items-center gap-1">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                <span>Wished</span>
                              </span>
                            ) : (
                              <span className="text-[9.5px] px-2 py-0.5 rounded-full font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                                Birthday 🎂
                              </span>
                            )
                          )}
                        </div>

                        {evt.startTime && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>
                              {evt.startTime} {evt.endTime ? `- ${evt.endTime}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {evt.category === 'birthday' && (
                        <button
                          type="button"
                          onClick={() => handleToggleWished(evt.id)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 ${
                            evt.isWished
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                          }`}
                          title={evt.isWished ? 'Mark as not wished' : 'Mark as wished'}
                        >
                          {evt.isWished ? (
                            <>
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Wished 🎉</span>
                            </>
                          ) : (
                            <>
                              <Gift className="w-3 h-3" />
                              <span>Mark Wished</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(evt.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-black dark:hover:text-white transition shrink-0 cursor-pointer"
                        title="Delete event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {evt.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 pl-8 leading-relaxed">
                      {evt.description}
                    </p>
                  )}
                </div>
              ))}

              {/* Active Tasks for Selected Date */}
              {activeDateTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {t.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-black/5 dark:border-white/10">
                    Task Reminder
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Add Event / Birthday Dialog Modal (Non-clipping, fully scrollable, z-[100] on top of all navs) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <form
            onSubmit={handleAddEvent}
            className="liquid-glass-card liquid-specular w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[88dvh] flex flex-col shadow-2xl border border-white/30 dark:border-white/15 relative z-[100]"
          >
            {/* Sticky Header */}
            <div className="p-5 border-b border-white/10 dark:border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {modalMode === 'birthday' ? (
                  <div className="p-2 rounded-xl liquid-glass-accent">
                    <Cake className="w-4 h-4" />
                  </div>
                ) : modalMode === 'anniversary' ? (
                  <div className="p-2 rounded-xl liquid-glass-accent">
                    <Heart className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-2 rounded-xl liquid-glass-accent">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    {modalMode === 'birthday'
                      ? 'Add Birthday Reminder'
                      : modalMode === 'anniversary'
                      ? 'Add Anniversary Reminder'
                      : 'Create Calendar Event'}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-semibold block">
                    {formattedSelectedDate}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Type Category Picker */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1.5">Category</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {(['personal', 'birthday', 'anniversary', 'study', 'work'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEventCategory(cat)}
                      className={`py-2 px-1 rounded-xl text-[11px] font-bold capitalize transition flex items-center justify-center gap-1 ${
                        eventCategory === cat
                          ? 'liquid-glass-accent font-bold shadow-sm'
                          : 'liquid-glass-btn text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {cat === 'birthday' && <Cake className="w-3 h-3" />}
                      {cat === 'anniversary' && <Heart className="w-3 h-3" />}
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title / Name */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  {eventCategory === 'birthday'
                    ? "Person's Name"
                    : eventCategory === 'anniversary'
                    ? 'Anniversary Name'
                    : 'Event Title'}
                </label>
                <input
                  type="text"
                  placeholder={
                    eventCategory === 'birthday'
                      ? "e.g. Rahul's Birthday"
                      : eventCategory === 'anniversary'
                      ? 'e.g. Parents Anniversary'
                      : 'e.g. Project Review Meeting'
                  }
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="liquid-glass-input w-full px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none"
                  required
                  autoFocus
                />
              </div>

              {/* Timing (for non-all-day events) */}
              {eventCategory !== 'birthday' && eventCategory !== 'anniversary' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Start Time</label>
                    <input
                      type="time"
                      value={eventStartTime}
                      onChange={(e) => setEventStartTime(e.target.value)}
                      className="liquid-glass-input w-full px-3 py-2 rounded-xl font-mono text-xs font-bold text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">End Time</label>
                    <input
                      type="time"
                      value={eventEndTime}
                      onChange={(e) => setEventEndTime(e.target.value)}
                      className="liquid-glass-input w-full px-3 py-2 rounded-xl font-mono text-xs font-bold text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Notes / Description</label>
                <textarea
                  rows={3}
                  placeholder="Optional notes or reminder details..."
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  className="liquid-glass-input w-full px-4 py-2.5 rounded-2xl text-xs text-slate-900 dark:text-slate-100 outline-none resize-none"
                />
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="p-4 sm:p-5 border-t border-white/10 dark:border-white/5 shrink-0 flex gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="liquid-glass-btn flex-1 py-3 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="liquid-glass-accent flex-1 py-3 rounded-2xl text-xs font-black shadow-sm active:scale-95 transition"
              >
                Save {eventCategory === 'birthday' ? 'Birthday' : 'Event'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
});
