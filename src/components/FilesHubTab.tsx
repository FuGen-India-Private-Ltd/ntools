import React, { useState } from 'react';
import { PdfMergerTab } from './PdfMergerTab';
import { PdfCompressorTab } from './PdfCompressorTab';
import { PdfSplitterTab } from './PdfSplitterTab';
import { DocxPptToPdfConverter } from './DocxPptToPdfConverter';
import { ExcelToPdfConverter } from './ExcelToPdfConverter';
import { ImageToPdfConverter } from './ImageToPdfConverter';
import { ImageCompressorTab } from './ImageCompressorTab';
import { PdfEditorTab } from './PdfEditorTab';
import {
  Layers,
  Minimize2,
  Scissors,
  FileText,
  FileSpreadsheet,
  Images,
  Image as ImageIcon,
  FileEdit,
  Sparkles,
} from 'lucide-react';

export type FileToolType =
  | 'pdf-merge'
  | 'pdf-compress'
  | 'pdf-split'
  | 'pdf-edit'
  | 'pdf-convert'
  | 'excel-convert'
  | 'image-to-pdf'
  | 'image-compress';

interface ToolDef {
  id: FileToolType;
  label: string;
  icon: React.ElementType;
  category: 'core' | 'convert' | 'image';
  colorClass: string;
  activeClass: string;
}

const TOOLS: ToolDef[] = [
  {
    id: 'pdf-merge',
    label: 'Merge PDFs',
    icon: Layers,
    category: 'core',
    colorClass: 'text-slate-800 dark:text-slate-200',
    activeClass: 'liquid-glass-accent shadow-sm',
  },
  {
    id: 'pdf-compress',
    label: 'Compress PDF',
    icon: Minimize2,
    category: 'core',
    colorClass: 'text-slate-800 dark:text-slate-200',
    activeClass: 'liquid-glass-accent shadow-sm',
  },
  {
    id: 'pdf-split',
    label: 'Split PDF',
    icon: Scissors,
    category: 'core',
    colorClass: 'text-slate-800 dark:text-slate-200',
    activeClass: 'liquid-glass-accent shadow-sm',
  },
  {
    id: 'pdf-edit',
    label: 'Edit & Annotate PDF',
    icon: FileEdit,
    category: 'core',
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    activeClass: 'liquid-glass-accent shadow-sm',
  },
  {
    id: 'pdf-convert',
    label: 'Doc & PPT to PDF',
    icon: FileText,
    category: 'convert',
    colorClass: 'text-slate-800 dark:text-slate-200',
    activeClass: 'liquid-glass-accent shadow-sm',
  },
  {
    id: 'excel-convert',
    label: 'Excel to PDF',
    icon: FileSpreadsheet,
    category: 'convert',
    colorClass: 'text-slate-800 dark:text-slate-200',
    activeClass: 'liquid-glass-accent shadow-sm',
  },
  {
    id: 'image-to-pdf',
    label: 'Photos to PDF',
    icon: Images,
    category: 'convert',
    colorClass: 'text-slate-800 dark:text-slate-200',
    activeClass: 'liquid-glass-accent shadow-sm',
  },
  {
    id: 'image-compress',
    label: 'Compress Photos',
    icon: ImageIcon,
    category: 'image',
    colorClass: 'text-slate-800 dark:text-slate-200',
    activeClass: 'liquid-glass-accent shadow-sm',
  },
];

export const FilesHubTab = React.memo(function FilesHubTab() {
  const [activeSubTab, setActiveSubTab] = useState<FileToolType>('pdf-merge');
  const [editingPdf, setEditingPdf] = useState<{ blob: Blob; fileName: string } | null>(null);

  const handleEditInEditor = (blob: Blob, fileName: string) => {
    setEditingPdf({ blob, fileName });
    setActiveSubTab('pdf-edit');
  };

  return (
    <div className="space-y-5 pb-24 max-w-6xl mx-auto">
      {/* Top Concentrated Tools Bar */}
      <div className="p-2 rounded-3xl liquid-glass-dock liquid-specular shadow-sm max-w-4xl mx-auto">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 no-scrollbar scroll-smooth">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeSubTab === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveSubTab(tool.id)}
                className={`py-2 px-3 sm:px-4 rounded-2xl text-xs font-bold transition-all duration-150 active:scale-95 flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  isActive
                    ? tool.activeClass
                    : 'liquid-glass-btn text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-inherit' : tool.colorClass}`} />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Sub-Tab Tool View */}
      <div key={activeSubTab} className="animate-in fade-in duration-150">
        {activeSubTab === 'pdf-merge' && <PdfMergerTab onEditInEditor={handleEditInEditor} />}
        {activeSubTab === 'pdf-compress' && <PdfCompressorTab onEditInEditor={handleEditInEditor} />}
        {activeSubTab === 'pdf-split' && <PdfSplitterTab onEditInEditor={handleEditInEditor} />}
        {activeSubTab === 'pdf-edit' && (
          <PdfEditorTab
            initialBlob={editingPdf?.blob}
            initialFileName={editingPdf?.fileName}
            onClearInitial={() => setEditingPdf(null)}
          />
        )}
        {activeSubTab === 'pdf-convert' && <DocxPptToPdfConverter onEditInEditor={handleEditInEditor} />}
        {activeSubTab === 'excel-convert' && <ExcelToPdfConverter onEditInEditor={handleEditInEditor} />}
        {activeSubTab === 'image-to-pdf' && <ImageToPdfConverter onEditInEditor={handleEditInEditor} />}
        {activeSubTab === 'image-compress' && <ImageCompressorTab />}
      </div>
    </div>
  );
});

