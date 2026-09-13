// Offline Rich Notes Storage & Export Manager
// Supports Markdown, Category Color Tags, Pinning, Search, and PDF/MD Export

import { jsPDF } from 'jspdf';
import { downloadBlob } from './docxProcessor';

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: 'personal' | 'work' | 'study' | 'kannada' | 'ideas';
  isPinned: boolean;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export const NOTE_CATEGORIES: Record<
  NoteItem['category'],
  {
    label: string;
    color: string;
    badgeBg: string;
    textColor: string;
    borderColor: string;
    dotColor: string;
  }
> = {
  study: {
    label: 'Study',
    color: '#0284c7',
    badgeBg: 'bg-sky-500/15 dark:bg-sky-400/20',
    textColor: 'text-sky-700 dark:text-sky-300',
    borderColor: 'border-sky-500/30 dark:border-sky-400/30',
    dotColor: 'bg-sky-500',
  },
  work: {
    label: 'Work',
    color: '#f59e0b',
    badgeBg: 'bg-amber-500/15 dark:bg-amber-400/20',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-500/30 dark:border-amber-400/30',
    dotColor: 'bg-amber-500',
  },
  personal: {
    label: 'Personal',
    color: '#10b981',
    badgeBg: 'bg-emerald-500/15 dark:bg-emerald-400/20',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-500/30 dark:border-emerald-400/30',
    dotColor: 'bg-emerald-500',
  },
  kannada: {
    label: 'ಕನ್ನಡ (Kannada)',
    color: '#6366f1',
    badgeBg: 'bg-indigo-500/15 dark:bg-indigo-400/20',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    borderColor: 'border-indigo-500/30 dark:border-indigo-400/30',
    dotColor: 'bg-indigo-500',
  },
  ideas: {
    label: 'Ideas',
    color: '#f43f5e',
    badgeBg: 'bg-rose-500/15 dark:bg-rose-400/20',
    textColor: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-500/30 dark:border-rose-400/30',
    dotColor: 'bg-rose-500',
  },
};

const STORAGE_KEY = 'app_productivity_notes_v1';

const INITIAL_SAMPLE_NOTES: NoteItem[] = [
  {
    id: 'sample-kannada-1',
    title: 'ಕುವೆಂಪು & ಬೇಂದ್ರೆ ಕಾವ್ಯ ಚಿಂತನೆ',
    content: `# ಕನ್ನಡ ಸಾಹಿತ್ಯ ಮತ್ತು ಕಾವ್ಯ ಸಂಗ್ರಹ

> "ಎಲ್ಲಾದರೂ ಇರು, ಎಂತಾದರೂ ಇರು, ಎಂದೆಂದಿಗೂ ನೀ ಕನ್ನಡವಾಗಿರು." — ರಾಷ್ಟ್ರಕವಿ ಕುವೆಂಪು

## ಅಧ್ಯಯನದ ಮುಖ್ಯಾಂಶಗಳು
- [x] ನವೋದಯ ಸಾಹಿತ್ಯದ ಪರಿಚಯ
- [x] ಬೇಂದ್ರೆಯವರ ನಾದಲೀಲೆ ಮತ್ತು ಶ್ರಾವಣ ಗೀತೆಗಳು
- [ ] ಕುವೆಂಪು ಅವರ ಕಾನೂರು ಹೆಗ್ಗಡಿತಿ ವಿಶ್ಲೇಷಣೆ

ಈ ಟಿಪ್ಪಣಿಯಲ್ಲಿ ನೀವು ಬರಾಹ ಅಥವಾ ನುಡಿ ಅಕ್ಷರಗಳನ್ನು ನೇರವಾಗಿ **Convert Kannada Script** ಮೂಲಕ ಯುನಿಕೋಡ್‌ಗೆ ಬದಲಾಯಿಸಬಹುದು.`,
    category: 'kannada',
    isPinned: true,
    isFavorite: true,
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'sample-welcome-2',
    title: 'Welcome to Liquid Notes Studio',
    content: `# Apple VisionOS Liquid Glass Notes

Welcome to your offline **Markdown Notes & Kannada Document Studio**!

### Key Features:
- **Markdown & Checklists**: Format headings, quotes, bullet points and interactive checklist items.
- **1-Tap Kannada Converter**: Instant conversion between ASCII/Nudi/Baraha and standard Unicode.
- **Offline Persistence**: Everything saves locally to your device storage and syncs with native Android widgets.
- **Export Anywhere**: Download your notes as clean \`.md\` files or publication-ready formatted \`.pdf\` documents.

- [x] Explore liquid glass design
- [ ] Create your first custom note`,
    category: 'ideas',
    isPinned: true,
    isFavorite: false,
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 5,
  },
];

export function getStoredNotes(): NoteItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw !== null ? JSON.parse(raw) : INITIAL_SAMPLE_NOTES;
  } catch (e) {
    return INITIAL_SAMPLE_NOTES;
  }
}

export function saveStoredNotes(notes: NoteItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save notes to storage', e);
  }
}

export function searchAndFilterNotes(
  notes: NoteItem[],
  query: string,
  categoryFilter: string
): NoteItem[] {
  return notes
    .filter((note) => {
      if (categoryFilter !== 'all' && note.category !== categoryFilter) {
        return false;
      }
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
}

export function exportNoteAsPdf(note: NoteItem) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Header Bar
  pdf.setFillColor(245, 158, 11);
  pdf.rect(0, 0, pageWidth, 4, 'F');

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(15, 23, 42);
  const titleLines = pdf.splitTextToSize(note.title || 'Untitled Note', contentWidth);
  pdf.text(titleLines, margin, 24);

  let currentY = 24 + titleLines.length * 8 + 4;

  // Category & Timestamp
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(148, 163, 184);
  const catLabel = NOTE_CATEGORIES[note.category]?.label || 'Note';
  const dateStr = new Date(note.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  pdf.text(`${catLabel.toUpperCase()} • Last modified: ${dateStr}`, margin, currentY);

  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, currentY + 3, pageWidth - margin, currentY + 3);
  currentY += 12;

  // Content lines
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(51, 65, 85);

  const cleanContent = note.content
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^-\s+/gm, '• ')
    .replace(/\[ \]\s+/g, '☐ ')
    .replace(/\[x\]\s+/g, '☑ ');

  const contentLines = pdf.splitTextToSize(cleanContent, contentWidth);

  contentLines.forEach((line: string) => {
    if (currentY > pageHeight - 20) {
      pdf.addPage('a4', 'portrait');
      currentY = 20;
    }
    pdf.text(line, margin, currentY);
    currentY += 6;
  });

  const blob = pdf.output('blob');
  const safeName = (note.title || 'Note').replace(/[^a-zA-Z0-9_\u0C80-\u0CFF]/g, '_');
  downloadBlob(blob, `${safeName}.pdf`);
}

export function exportNoteAsMarkdown(note: NoteItem) {
  const mdContent = `# ${note.title}\n\n*Category: ${NOTE_CATEGORIES[note.category]?.label}*\n*Updated: ${new Date(note.updatedAt).toLocaleString()}*\n\n---\n\n${note.content}\n`;
  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  const safeName = (note.title || 'Note').replace(/[^a-zA-Z0-9_\u0C80-\u0CFF]/g, '_');
  downloadBlob(blob, `${safeName}.md`);
}
