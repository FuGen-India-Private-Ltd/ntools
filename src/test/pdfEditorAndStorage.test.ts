import { describe, it, expect } from 'vitest';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import { exportNoteAsPdf, NoteItem } from '../lib/notesStorage';

describe('PDF Editor Engine & Public Phone Storage Verification', () => {
  it('loads, rotates, annotates, and saves PDF documents with pdf-lib', async () => {
    // 1. Create a blank test PDF document
    const doc = await PDFDocument.create();
    const page1 = doc.addPage([595, 842]); // A4
    const page2 = doc.addPage([595, 842]);
    expect(doc.getPageCount()).toBe(2);

    // 2. Rotate page 1 by 90 degrees
    page1.setRotation(degrees(90));
    expect(page1.getRotation().angle).toBe(90);

    // 3. Add text stamp / annotation
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    page1.drawText('APPROVED', {
      x: 100,
      y: 800,
      size: 16,
      font,
      color: rgb(0.88, 0.15, 0.25),
    });

    // 4. Add diagonal watermark
    page2.drawText('CONFIDENTIAL', {
      x: 150,
      y: 400,
      size: 40,
      font,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.25,
      rotate: degrees(45),
    });

    // 5. Delete a page
    doc.removePage(1);
    expect(doc.getPageCount()).toBe(1);

    // 6. Save modified PDF bytes
    const pdfBytes = await doc.save();
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(500);
  });

  it('exports rich notes to PDF with custom title and author metadata', () => {
    const sampleNote: NoteItem = {
      id: 'test_note_1',
      title: 'Project Roadmap 2026',
      content: '# High Priority Goals\n- [ ] Deliver Liquid Glass Voice Recorder\n- [x] Integrate Public Phone Storage',
      category: 'work',
      isPinned: true,
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const result = exportNoteAsPdf(sampleNote, {
      customTitle: 'Custom Executive Roadmap',
      author: 'Product Team',
      fontSize: 12,
    });

    expect(result).toBeDefined();
    expect(result.fileName).toBe('Custom_Executive_Roadmap.pdf');
    expect(result.blob).toBeDefined();
    expect(result.blob.size).toBeGreaterThan(500);
  });
});
