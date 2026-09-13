// Calendar, Planner, Study Deadlines & Localized Holidays Manager

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  startTime?: string; // "09:00"
  endTime?: string; // "10:30"
  category: 'birthday' | 'anniversary' | 'study' | 'work' | 'personal' | 'deadline' | 'holiday';
  description?: string;
  isCompleted?: boolean;
  isWished?: boolean; // For birthdays: whether the user has marked as wished
  wishedDate?: string; // Date or timestamp when marked as wished
}

export interface HolidayItem {
  date: string; // "YYYY-MM-DD" or "MM-DD"
  name: string;
  kannadaName: string;
  type: 'public' | 'cultural' | 'regional';
}

// Fixed annual solar holidays that occur on the same day every year
export const FIXED_ANNUAL_HOLIDAYS: HolidayItem[] = [
  { date: '01-01', name: "New Year's Day", kannadaName: 'ಹೊಸ ವರ್ಷದ ದಿನ 🎊', type: 'public' },
  { date: '01-14', name: 'Makara Sankranti / Pongal / Ellu Bella', kannadaName: 'ಮಕರ ಸಂಕ್ರಾಂತಿ (ಎಳ್ಳು-ಬೆಲ್ಲ) 🌾', type: 'public' },
  { date: '01-26', name: 'Republic Day', kannadaName: 'ಗಣರಾಜ್ಯೋತ್ಸವ 🇮🇳', type: 'public' },
  { date: '04-14', name: 'Dr. B.R. Ambedkar Jayanti', kannadaName: 'ಡಾ. ಬಿ.ಆರ್. ಅಂಬೇಡ್ಕರ್ ಜಯಂತಿ ⚖️', type: 'public' },
  { date: '05-01', name: 'May Day / Labor Day', kannadaName: 'ಕಾರ್ಮಿಕರ ದಿನಾಚರಣೆ ⚒️', type: 'public' },
  { date: '08-15', name: 'Independence Day', kannadaName: 'ಸ್ವಾತಂತ್ರ್ಯ ದಿನಾಚರಣೆ 🇮🇳', type: 'public' },
  { date: '10-02', name: 'Mahatma Gandhi Jayanti', kannadaName: 'ಮಹಾತ್ಮ ಗಾಂಧಿ ಜಯಂತಿ 🕊️', type: 'public' },
  { date: '11-01', name: 'Kannada Rajyotsava', kannadaName: 'ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವ (ಕರ್ನಾಟಕ ಹಬ್ಬ) 🟡🔴', type: 'public' },
  { date: '12-25', name: 'Christmas Day', kannadaName: 'ಕ್ರಿಸ್‌ಮಸ್ ಹಬ್ಬ 🎄', type: 'public' },
];

// Year-specific lunar/Panchanga calendar festival dates (Karnataka & India)
export const YEAR_SPECIFIC_FESTIVALS: Record<number, HolidayItem[]> = {
  2025: [
    { date: '2025-02-26', name: 'Maha Shivaratri', kannadaName: 'ಮಹಾ ಶಿವರಾತ್ರಿ 🕉️', type: 'cultural' },
    { date: '2025-03-14', name: 'Holi Festival of Colors / Kamadahana', kannadaName: 'ಹೋಳಿ ಹಬ್ಬ / ಕಾಮದಹನ 🎨', type: 'cultural' },
    { date: '2025-03-30', name: 'Ugadi (Kannada New Year)', kannadaName: 'ಯುಗಾದಿ ಹಬ್ಬ (ಕನ್ನಡ ಹೊಸ ವರ್ಷ) 🥭', type: 'public' },
    { date: '2025-03-31', name: 'Eid-ul-Fitr (Ramzan)', kannadaName: 'ರಂಜಾನ್ ಹಬ್ಬ (ಈದ್) 🌙', type: 'public' },
    { date: '2025-04-06', name: 'Sri Rama Navami', kannadaName: 'ಶ್ರೀ ರಾಮ ನವಮಿ 🏹', type: 'cultural' },
    { date: '2025-04-10', name: 'Mahaveera Jayanti', kannadaName: 'ಮಹಾವೀರ ಜಯಂತಿ 🕊️', type: 'public' },
    { date: '2025-04-18', name: 'Good Friday', kannadaName: 'ಗುಡ್ ಫ್ರೈಡೇ ✝️', type: 'public' },
    { date: '2025-05-09', name: 'Basava Jayanti & Akshaya Tritiya', kannadaName: 'ಬಸವ ಜಯಂತಿ & ಅಕ್ಷಯ ತೃತೀಯ 🐂', type: 'public' },
    { date: '2025-05-12', name: 'Buddha Purnima', kannadaName: 'ಬುದ್ಧ ಪೂರ್ಣಿಮೆ ☸️', type: 'cultural' },
    { date: '2025-06-07', name: 'Bakrid (Eid-al-Adha)', kannadaName: 'ಬಕ್ರೀದ್ ಹಬ್ಬ 🕌', type: 'public' },
    { date: '2025-07-06', name: 'Muharram', kannadaName: 'ಮೊಹರಂ ☪️', type: 'public' },
    { date: '2025-07-29', name: 'Nagara Panchami', kannadaName: 'ನಾಗರ ಪಂಚಮಿ 🐍', type: 'cultural' },
    { date: '2025-08-08', name: 'Varamahalakshmi Vrata', kannadaName: 'ವರಮಹಾಲಕ್ಷ್ಮಿ ವ್ರತ (ಕನ್ನಡ ನಾಡಹಬ್ಬ) 🪷', type: 'cultural' },
    { date: '2025-08-16', name: 'Sri Krishna Janmashtami', kannadaName: 'ಶ್ರೀ ಕೃಷ್ಣ ಜನ್ಮಾಷ್ಟಮಿ 🦚', type: 'cultural' },
    { date: '2025-08-26', name: 'Swarna Gauri Habba', kannadaName: 'ಸ್ವರ್ಣ ಗೌರಿ ಹಬ್ಬ 🌺', type: 'cultural' },
    { date: '2025-08-27', name: 'Ganesh Chaturthi (Vinayaka Chavithi)', kannadaName: 'ಗಣೇಶ ಚತುರ್ಥಿ (ವಿನಾಯಕ ಹಬ್ಬ) 🐘', type: 'public' },
    { date: '2025-09-06', name: 'Anantha Chaturdashi (Ganesh Visarjan)', kannadaName: 'ಅನಂತ ಚತುರ್ದಶಿ (ಗಣೇಶ ವಿಸರ್ಜನೆ) 🌊', type: 'cultural' },
    { date: '2025-10-01', name: 'Maha Navami / Ayudha Pooja', kannadaName: 'ಮಹಾ ನವಮಿ / ಆಯುಧ ಪೂಜೆ 🛠️', type: 'public' },
    { date: '2025-10-02', name: 'Vijaya Dashami (Mysore Dasara)', kannadaName: 'ವಿಜಯದಶಮಿ (ದಸರಾ ಜಂಬೂ ಸವಾರಿ) 🐘🏹', type: 'public' },
    { date: '2025-10-20', name: 'Maharshi Valmiki Jayanti', kannadaName: 'ಮಹರ್ಷಿ ವಾಲ್ಮೀಕಿ ಜಯಂತಿ 📜', type: 'public' },
    { date: '2025-10-20', name: 'Deepavali / Naraka Chaturdashi', kannadaName: 'ದೀಪಾವಳಿ / ನರಕ ಚತುರ್ದಶಿ 🪔', type: 'public' },
    { date: '2025-10-22', name: 'Balipadyami / Gopuja', kannadaName: 'ಬಲಿಪಾಡ್ಯಮಿ (ಗೋ ಪೂಜೆ) 🐄', type: 'public' },
    { date: '2025-11-18', name: 'Bhakta Kanakadasa Jayanti', kannadaName: 'ಭಕ್ತ ಕನಕದಾಸ ಜಯಂತಿ 🪕', type: 'public' },
  ],
  2026: [
    { date: '2026-02-15', name: 'Maha Shivaratri', kannadaName: 'ಮಹಾ ಶಿವರಾತ್ರಿ 🕉️', type: 'cultural' },
    { date: '2026-03-03', name: 'Holi Festival of Colors / Kamadahana', kannadaName: 'ಹೋಳಿ ಹಬ್ಬ / ಕಾಮದಹನ 🎨', type: 'cultural' },
    { date: '2026-03-19', name: 'Ugadi (Kannada New Year)', kannadaName: 'ಯುಗಾದಿ ಹಬ್ಬ (ಕನ್ನಡ ಹೊಸ ವರ್ಷ) 🥭', type: 'public' },
    { date: '2026-03-20', name: 'Eid-ul-Fitr (Ramzan)', kannadaName: 'ರಂಜಾನ್ ಹಬ್ಬ (ಈದ್) 🌙', type: 'public' },
    { date: '2026-03-27', name: 'Sri Rama Navami', kannadaName: 'ಶ್ರೀ ರಾಮ ನವಮಿ 🏹', type: 'cultural' },
    { date: '2026-03-31', name: 'Mahaveera Jayanti', kannadaName: 'ಮಹಾವೀರ ಜಯಂತಿ 🕊️', type: 'public' },
    { date: '2026-04-02', name: 'Hanuman Jayanti', kannadaName: 'ಶ್ರೀ ಹನುಮ ಜಯಂತಿ 🚩', type: 'cultural' },
    { date: '2026-04-03', name: 'Good Friday', kannadaName: 'ಗುಡ್ ಫ್ರೈಡೇ ✝️', type: 'public' },
    { date: '2026-04-19', name: 'Basava Jayanti & Akshaya Tritiya', kannadaName: 'ಬಸವ ಜಯಂತಿ & ಅಕ್ಷಯ ತೃತೀಯ 🐂', type: 'public' },
    { date: '2026-05-02', name: 'Buddha Purnima', kannadaName: 'ಬುದ್ಧ ಪೂರ್ಣಿಮೆ ☸️', type: 'cultural' },
    { date: '2026-05-27', name: 'Bakrid (Eid-al-Adha)', kannadaName: 'ಬಕ್ರೀದ್ ಹಬ್ಬ 🕌', type: 'public' },
    { date: '2026-06-26', name: 'Muharram', kannadaName: 'ಮೊಹರಂ ☪️', type: 'public' },
    { date: '2026-07-29', name: 'Guru Purnima / Vyasa Purnima', kannadaName: 'ಗುರು ಪೂರ್ಣಿಮೆ 🙏', type: 'cultural' },
    { date: '2026-08-18', name: 'Nagara Panchami', kannadaName: 'ನಾಗರ ಪಂಚಮಿ 🐍', type: 'cultural' },
    { date: '2026-08-21', name: 'Varamahalakshmi Vrata', kannadaName: 'ವರಮಹಾಲಕ್ಷ್ಮಿ ವ್ರತ (ಕನ್ನಡ ನಾಡಹಬ್ಬ) 🪷', type: 'cultural' },
    { date: '2026-08-25', name: 'Milad-un-Nabi (Eid Milad)', kannadaName: 'ಈದ್ ಮಿಲಾದ್ 🌙', type: 'public' },
    { date: '2026-09-04', name: 'Sri Krishna Janmashtami (Gokulashtami)', kannadaName: 'ಶ್ರೀ ಕೃಷ್ಣ ಜನ್ಮಾಷ್ಟಮಿ (ಗೋಕುಲಾಷ್ಟಮಿ) 🦚', type: 'cultural' },
    { date: '2026-09-13', name: 'Swarna Gauri Habba', kannadaName: 'ಸ್ವರ್ಣ ಗೌರಿ ಹಬ್ಬ 🌺', type: 'cultural' },
    { date: '2026-09-14', name: 'Ganesh Chaturthi (Vinayaka Chavithi)', kannadaName: 'ಗಣೇಶ ಚತುರ್ಥಿ (ವಿನಾಯಕ ಹಬ್ಬ) 🐘', type: 'public' },
    { date: '2026-09-24', name: 'Anantha Chaturdashi (Ganesh Visarjan)', kannadaName: 'ಅನಂತ ಚತುರ್ದಶಿ (ಗಣೇಶ ವಿಸರ್ಜನೆ) 🌊', type: 'cultural' },
    { date: '2026-10-11', name: 'Navaratri Prarambha (Dasara Begins)', kannadaName: 'ನವರಾತ್ರಿ ಪ್ರಾರಂಭ (ಮೈಸೂರು ದಸರಾ) 🚩', type: 'cultural' },
    { date: '2026-10-19', name: 'Maha Navami / Ayudha Pooja / Saraswati Pooja', kannadaName: 'ಮಹಾ ನವಮಿ / ಆಯುಧ ಪೂಜೆ / ಸರಸ್ವತಿ ಪೂಜೆ 📚🛠️', type: 'public' },
    { date: '2026-10-20', name: 'Vijaya Dashami (Mysore Dasara Jumboo Savari)', kannadaName: 'ವಿಜಯದಶಮಿ (ದಸರಾ ಜಂಬೂ ಸವಾರಿ) 🐘🏹', type: 'public' },
    { date: '2026-10-26', name: 'Maharshi Valmiki Jayanti', kannadaName: 'ಮಹರ್ಷಿ ವಾಲ್ಮೀಕಿ ಜಯಂತಿ 📜', type: 'public' },
    { date: '2026-11-08', name: 'Deepavali / Naraka Chaturdashi', kannadaName: 'ದೀಪಾವಳಿ / ನರಕ ಚತುರ್ದಶಿ (ಎಣ್ಣೆ ಸ್ನಾನ) 🪔', type: 'public' },
    { date: '2026-11-09', name: 'Lakshmi Puja (Deepavali)', kannadaName: 'ಲಕ್ಷ್ಮೀ ಪೂಜೆ (ದೀಪಾವಳಿ ದೀಪೋತ್ಸವ) ✨', type: 'cultural' },
    { date: '2026-11-10', name: 'Balipadyami / Gopuja', kannadaName: 'ಬಲಿಪಾಡ್ಯಮಿ (ಗೋವುಗಳ ಪೂಜೆ) 🐄', type: 'public' },
    { date: '2026-11-27', name: 'Bhakta Kanakadasa Jayanti', kannadaName: 'ಭಕ್ತ ಕನಕದಾಸ ಜಯಂತಿ 🪕', type: 'public' },
    { date: '2026-12-15', name: 'Subrahmanya Shashti (Kukke Shashti)', kannadaName: 'ಸುಬ್ರಹ್ಮಣ್ಯ ಷಷ್ಠಿ (ಕುಕ್ಕೆ ಷಷ್ಠಿ) 🦚', type: 'cultural' },
  ],
  2027: [
    { date: '2027-03-06', name: 'Maha Shivaratri', kannadaName: 'ಮಹಾ ಶಿವರಾತ್ರಿ 🕉️', type: 'cultural' },
    { date: '2027-03-22', name: 'Holi Festival of Colors', kannadaName: 'ಹೋಳಿ ಹಬ್ಬ 🎨', type: 'cultural' },
    { date: '2027-04-07', name: 'Ugadi (Kannada New Year)', kannadaName: 'ಯುಗಾದಿ ಹಬ್ಬ (ಕನ್ನಡ ಹೊಸ ವರ್ಷ) 🥭', type: 'public' },
    { date: '2027-04-16', name: 'Sri Rama Navami', kannadaName: 'ಶ್ರೀ ರಾಮ ನವಮಿ 🏹', type: 'cultural' },
    { date: '2027-04-29', name: 'Basava Jayanti & Akshaya Tritiya', kannadaName: 'ಬಸವ ಜಯಂತಿ & ಅಕ್ಷಯ ತೃತೀಯ 🐂', type: 'public' },
    { date: '2027-08-13', name: 'Varamahalakshmi Vrata', kannadaName: 'ವರಮಹಾಲಕ್ಷ್ಮಿ ವ್ರತ 🪷', type: 'cultural' },
    { date: '2027-08-25', name: 'Sri Krishna Janmashtami', kannadaName: 'ಶ್ರೀ ಕೃಷ್ಣ ಜನ್ಮಾಷ್ಟಮಿ 🦚', type: 'cultural' },
    { date: '2027-09-03', name: 'Swarna Gauri Habba', kannadaName: 'ಸ್ವರ್ಣ ಗೌರಿ ಹಬ್ಬ 🌺', type: 'cultural' },
    { date: '2027-09-04', name: 'Ganesh Chaturthi (Vinayaka Chavithi)', kannadaName: 'ಗಣೇಶ ಚತುರ್ಥಿ (ವಿನಾಯಕ ಹಬ್ಬ) 🐘', type: 'public' },
    { date: '2027-09-14', name: 'Anantha Chaturdashi (Ganesh Visarjan)', kannadaName: 'ಅನಂತ ಚತುರ್ದಶಿ 🌊', type: 'cultural' },
    { date: '2027-10-09', name: 'Maha Navami / Ayudha Pooja', kannadaName: 'ಆಯುಧ ಪೂಜೆ 🛠️', type: 'public' },
    { date: '2027-10-10', name: 'Vijaya Dashami (Mysore Dasara)', kannadaName: 'ವಿಜಯದಶಮಿ (ದಸರಾ ಜಂಬೂ ಸವಾರಿ) 🐘🏹', type: 'public' },
    { date: '2027-10-29', name: 'Deepavali / Naraka Chaturdashi', kannadaName: 'ದೀಪಾವಳಿ / ನರಕ ಚತುರ್ದಶಿ 🪔', type: 'public' },
    { date: '2027-10-31', name: 'Balipadyami / Gopuja', kannadaName: 'ಬಲಿಪಾಡ್ಯಮಿ 🐄', type: 'public' },
    { date: '2027-11-16', name: 'Bhakta Kanakadasa Jayanti', kannadaName: 'ಭಕ್ತ ಕನಕದಾಸ ಜಯಂತಿ 🪕', type: 'public' },
  ],
};

const holidaysByYearCache = new Map<number, HolidayItem[]>();
const holidaysByMonthCache = new Map<string, { day: number; holiday: HolidayItem }[]>();
const holidayDateMapCache = new Map<number, Map<string, HolidayItem>>();

export function getHolidaysForYear(year: number): HolidayItem[] {
  const cached = holidaysByYearCache.get(year);
  if (cached) return cached;

  const fixed = FIXED_ANNUAL_HOLIDAYS.map((h) => ({
    ...h,
    date: `${year}-${h.date}`,
  }));
  const specific = YEAR_SPECIFIC_FESTIVALS[year] || YEAR_SPECIFIC_FESTIVALS[2026] || [];
  const map = new Map<string, HolidayItem>();
  fixed.forEach((h) => map.set(h.date, h));
  specific.forEach((h) => map.set(h.date, h));
  const sorted = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  
  holidaysByYearCache.set(year, sorted);
  
  // Also build quick date lookup map
  const dateMap = new Map<string, HolidayItem>();
  sorted.forEach((item) => dateMap.set(item.date, item));
  holidayDateMapCache.set(year, dateMap);

  return sorted;
}

// Master collection for 2026 for backward compatibility with static imports
export const KARNATAKA_INDIAN_HOLIDAYS: HolidayItem[] = getHolidaysForYear(2026).map((h) => ({
  ...h,
  date: h.date.slice(5), // "MM-DD"
}));

const CALENDAR_STORAGE_KEY = 'app_calendar_events_v1';

export function getStoredCalendarEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredCalendarEvents(events: CalendarEvent[]) {
  try {
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(events));
  } catch (e) {
    console.error('Failed to save calendar events', e);
  }
}

export function getHolidaysForMonth(year: number, monthIndex: number): { day: number; holiday: HolidayItem }[] {
  const cacheKey = `${year}-${monthIndex}`;
  const cached = holidaysByMonthCache.get(cacheKey);
  if (cached) return cached;

  const monthStr = (monthIndex + 1).toString().padStart(2, '0');
  const targetPrefix = `${year}-${monthStr}-`;
  const yearHolidays = getHolidaysForYear(year);

  const results: { day: number; holiday: HolidayItem }[] = [];
  yearHolidays.forEach((h) => {
    if (h.date.startsWith(targetPrefix)) {
      const day = parseInt(h.date.slice(targetPrefix.length), 10);
      results.push({ day, holiday: h });
    }
  });

  const sorted = results.sort((a, b) => a.day - b.day);
  holidaysByMonthCache.set(cacheKey, sorted);
  return sorted;
}

export function getHolidayForDate(year: number, monthIndex: number, day: number): HolidayItem | undefined {
  const monthStr = (monthIndex + 1).toString().padStart(2, '0');
  const dayStr = day.toString().padStart(2, '0');
  const fullDate = `${year}-${monthStr}-${dayStr}`;
  
  if (!holidayDateMapCache.has(year)) {
    getHolidaysForYear(year);
  }
  return holidayDateMapCache.get(year)?.get(fullDate);
}

export interface UpcomingEventSummary {
  title: string;
  daysRemaining: number;
  category: CalendarEvent['category'];
  dateFormatted: string;
}

export function getNextUpcomingEvent(events: CalendarEvent[], currentDate = new Date()): UpcomingEventSummary | null {
  const currentYear = currentDate.getFullYear();

  // Combine user events and holidays
  const allCandidates: { title: string; date: Date; category: CalendarEvent['category'] }[] = [];

  // 1. User events
  events.forEach((e) => {
    const d = new Date(e.date + 'T00:00:00');
    if (!isNaN(d.getTime()) && d >= currentDate) {
      allCandidates.push({ title: e.title, date: d, category: e.category });
    }
  });

  // 2. Public holidays for current year
  const yearHolidays = getHolidaysForYear(currentYear);
  yearHolidays.forEach((h) => {
    const d = new Date(`${h.date}T00:00:00`);
    if (d >= currentDate) {
      allCandidates.push({ title: h.name, date: d, category: 'holiday' });
    }
  });

  if (allCandidates.length === 0) return null;

  allCandidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  const next = allCandidates[0];

  const diffMs = next.date.getTime() - currentDate.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  return {
    title: next.title,
    daysRemaining,
    category: next.category,
    dateFormatted: next.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  };
}

export function getTomorrowDateString(currentDate = new Date()): string {
  const tomorrow = new Date(currentDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

export function getTodayDateString(currentDate = new Date()): string {
  return currentDate.toISOString().split('T')[0];
}

export interface PriorDayNotificationItem {
  id: string;
  title: string;
  category: CalendarEvent['category'];
  date: string;
  time?: string;
  isTomorrow: boolean;
  isToday: boolean;
  isBirthday: boolean;
  isWished?: boolean;
}

export function getUpcomingPriorDayAlerts(
  events: CalendarEvent[],
  currentDate = new Date()
): PriorDayNotificationItem[] {
  const todayStr = getTodayDateString(currentDate);
  const tomorrowStr = getTomorrowDateString(currentDate);
  const results: PriorDayNotificationItem[] = [];

  events.forEach((e) => {
    if (e.isCompleted) return;
    const isToday = e.date === todayStr;
    const isTomorrow = e.date === tomorrowStr;

    if (isToday || isTomorrow) {
      results.push({
        id: e.id,
        title: e.title,
        category: e.category,
        date: e.date,
        time: e.startTime,
        isTomorrow,
        isToday,
        isBirthday: e.category === 'birthday',
        isWished: e.isWished,
      });
    }
  });

  return results;
}
