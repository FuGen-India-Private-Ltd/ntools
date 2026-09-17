// Widget and Shortcut Deep-Linking Route Parser & Dispatcher
export type AppModule =
  | 'dashboard'
  | 'converter'
  | 'files'
  | 'tasks'
  | 'clock'
  | 'notes'
  | 'calc'
  | 'calendar'
  | 'widgets'
  | 'recorder'
  | 'compass'
  | 'settings';

export interface ParsedRoute {
  raw: string;
  module: AppModule | null;
  params: Record<string, string>;
  subtab?: string;
  noteId?: string;
  action?: string;
  tab?: string;
  date?: string;
}

export const VALID_APP_MODULES: AppModule[] = [
  'dashboard',
  'converter',
  'files',
  'tasks',
  'clock',
  'notes',
  'calc',
  'calendar',
  'widgets',
  'recorder',
  'compass',
  'settings',
];

/**
 * Parses deep-link raw string from Android intents, URL hash, or custom scheme.
 * Examples:
 *   "app://unicodeascii.converter/#calendar" -> { module: "calendar" }
 *   "calendar?date=2026-09-18" -> { module: "calendar", date: "2026-09-18" }
 *   "pdf-compress" -> { module: "files", tab: "pdf-compress" }
 *   "notes?noteId=note-123" -> { module: "notes", noteId: "note-123" }
 *   "notes?action=new" -> { module: "notes", action: "new" }
 *   "tasks?action=new" -> { module: "tasks", action: "new" }
 *   "clock?subtab=alarm" -> { module: "clock", subtab: "alarm" }
 */
export function parseDeepLinkRoute(rawRoute: string | null | undefined): ParsedRoute {
  if (!rawRoute || typeof rawRoute !== 'string') {
    return { raw: '', module: null, params: {} };
  }

  // Strip Android scheme / domain prefix if present
  let clean = rawRoute
    .replace(/^app:\/\/unicodeascii\.converter\/?/i, '')
    .replace(/^https?:\/\/[^/]+\/?/i, '')
    .replace(/^#\/?/, '')
    .trim();

  // If there was a hash inside after path, take that
  if (clean.includes('#')) {
    clean = clean.split('#').pop() || '';
  }

  if (!clean) {
    return { raw: rawRoute, module: null, params: {} };
  }

  const [routePartRaw, queryPart] = clean.split('?');
  let routePart = (routePartRaw || '').toLowerCase().trim();
  const searchParams = new URLSearchParams(queryPart || '');

  // Route alias mappings
  if (routePart === 'pdf-compress' || routePart === 'pdf' || routePart === 'compress-pdf') {
    routePart = 'files';
    if (!searchParams.has('tab')) searchParams.set('tab', 'pdf-compress');
  } else if (routePart === 'compressor' || routePart === 'image-compress') {
    routePart = 'files';
    if (!searchParams.has('tab')) searchParams.set('tab', 'image-compress');
  } else if (routePart === 'alarm' || routePart === 'alarms') {
    routePart = 'clock';
    if (!searchParams.has('subtab')) searchParams.set('subtab', 'alarm');
  } else if (routePart === 'timer' || routePart === 'pomodoro') {
    routePart = 'clock';
    if (!searchParams.has('subtab')) searchParams.set('subtab', 'timer');
  }

  const params: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    params[key] = val;
  });

  const module = VALID_APP_MODULES.includes(routePart as AppModule)
    ? (routePart as AppModule)
    : null;

  return {
    raw: rawRoute,
    module,
    params,
    subtab: params.subtab,
    noteId: params.noteId,
    action: params.action,
    tab: params.tab,
    date: params.date,
  };
}

/**
 * Dispatches browser window events for subtabs and actions
 */
export function dispatchRouteFeatureEvents(parsed: ParsedRoute, delayMs: number = 80) {
  if (typeof window === 'undefined') return;

  setTimeout(() => {
    if (parsed.module === 'notes') {
      if (parsed.noteId) {
        window.dispatchEvent(new CustomEvent('open-specific-note', { detail: { noteId: parsed.noteId } }));
      } else if (parsed.action === 'new') {
        window.dispatchEvent(new CustomEvent('create-new-note'));
      }
    } else if (parsed.module === 'tasks') {
      if (parsed.action === 'new') {
        window.dispatchEvent(new CustomEvent('create-new-task'));
      }
    } else if (parsed.module === 'clock') {
      if (parsed.subtab) {
        window.dispatchEvent(new CustomEvent('open-clock-subtab', { detail: { subtab: parsed.subtab } }));
      }
    } else if (parsed.module === 'files') {
      if (parsed.tab) {
        window.dispatchEvent(new CustomEvent('open-files-tool', { detail: { tab: parsed.tab } }));
      }
    } else if (parsed.module === 'calendar') {
      if (parsed.date) {
        window.dispatchEvent(new CustomEvent('open-calendar-date', { detail: { date: parsed.date } }));
      }
    }
  }, delayMs);
}
