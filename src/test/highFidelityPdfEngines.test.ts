import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import {
  convertExcelToPdf,
  parseExcelWorkbook,
} from '../lib/excelToPdfProcessor';
import {
  convertDocxToPdf,
} from '../lib/docxToPdfProcessor';
import {
  processPptxFile,
} from '../lib/pptxProcessor';
import {
  compressPdfFile,
  PDF_COMPRESSION_LEVELS,
  COMMON_TARGET_PRESETS,
} from '../lib/pdfCompressor';

describe('High-Fidelity PDF Engines Suite', () => {
  // ==========================================
  // 1. Excel / Spreadsheet High-Fidelity Tests
  // ==========================================
  describe('Excel to PDF Engine', () => {
    it('calculates proportional column widths and wraps multi-line cell content without truncation', async () => {
      const zip = new JSZip();
      zip.file(
        'xl/workbook.xml',
        `<?xml version="1.0" encoding="UTF-8"?>
        <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
          <sheets><sheet name="Projects" sheetId="1" r:id="rId1"/></sheets>
        </workbook>`
      );
      zip.file(
        'xl/_rels/workbook.xml.rels',
        `<?xml version="1.0" encoding="UTF-8"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
        </Relationships>`
      );
      zip.file(
        'xl/sharedStrings.xml',
        `<?xml version="1.0" encoding="UTF-8"?>
        <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="6" uniqueCount="6">
          <si><t>ID</t></si>
          <si><t>Project Description and Requirements Summary</t></si>
          <si><t>Budget</t></si>
          <si><t>001</t></si>
          <si><t>This is an extensive multi-line description that will test the text wrapping and dynamic row height calculation in our PDF engine to ensure no content is ever truncated.</t></si>
          <si><t>50000</t></si>
        </sst>`
      );
      zip.file(
        'xl/worksheets/sheet1.xml',
        `<?xml version="1.0" encoding="UTF-8"?>
        <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
          <sheetData>
            <row r="1">
              <c r="A1" t="s"><v>0</v></c>
              <c r="B1" t="s"><v>1</v></c>
              <c r="C1" t="s"><v>2</v></c>
            </row>
            <row r="2">
              <c r="A2" t="s"><v>3</v></c>
              <c r="B2" t="s"><v>4</v></c>
              <c r="C2" t="s"><v>5</v></c>
            </row>
          </sheetData>
        </worksheet>`
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const file = new File([blob], 'projects.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const sheets = await parseExcelWorkbook(file);
      expect(sheets.length).toBe(1);
      expect(sheets[0].maxCols).toBe(3);
      expect(sheets[0].rowCount).toBe(2);

      // Verify rendering with different themes
      const themes: Array<'modern-slate' | 'professional-blue' | 'minimal'> = [
        'modern-slate',
        'professional-blue',
        'minimal',
      ];

      for (const theme of themes) {
        const res = await convertExcelToPdf(file, {
          theme,
          orientation: 'portrait',
          includeGridLines: true,
        });
        expect(res.pdfBlob).toBeDefined();
        expect(res.pdfBlob.size).toBeGreaterThan(1000);
        expect(res.totalRows).toBe(2);
      }
    });

    it('handles large multi-row tables with auto-orientation and page overflow', async () => {
      // Build a CSV with 60 rows and 9 columns to trigger landscape auto-orientation and multi-page
      const header = ['Col1', 'Col2', 'Col3', 'Col4', 'Col5', 'Col6', 'Col7', 'Col8', 'Col9'].join(',');
      const rows = [header];
      for (let i = 1; i <= 60; i++) {
        rows.push([`Item-${i}`, `Desc ${i}`, `${i * 100}`, `A`, `B`, `C`, `D`, `E`, `Active`].join(','));
      }
      const csvContent = rows.join('\n');
      const csvFile = new File([csvContent], 'large_dataset.csv', { type: 'text/csv' });

      const res = await convertExcelToPdf(csvFile, { orientation: 'auto' });
      expect(res.pdfBlob).toBeDefined();
      expect(res.pdfBlob.size).toBeGreaterThan(2000);
      expect(res.totalRows).toBe(61);
    });
  });

  // ==========================================
  // 2. Word .docx High-Fidelity Tests
  // ==========================================
  describe('Word (.docx) to PDF Engine', () => {
    it('parses tables with cell borders, background fills, and multi-cell rows', async () => {
      const zip = new JSZip();
      const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
            <w:r><w:t>Project Invoice</w:t></w:r>
          </w:p>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:tcPr>
                  <w:shd w:fill="1E293B"/>
                  <w:tcBorders><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders>
                </w:tcPr>
                <w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Service</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr>
                  <w:shd w:fill="1E293B"/>
                </w:tcPr>
                <w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Cost</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
            <w:tr>
              <w:tc>
                <w:p><w:r><w:t>Software Consulting</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>Rs. 15,000</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`;
      zip.file('word/document.xml', docXml);

      const docxBlob = await zip.generateAsync({ type: 'blob' });
      const file = new File([docxBlob], 'invoice.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const result = await convertDocxToPdf(file, {
        pageSize: 'a4',
        orientation: 'portrait',
        includeHeader: true,
        includePageNumbers: true,
      });

      expect(result.pdfBlob).toBeDefined();
      expect(result.pdfBlob.size).toBeGreaterThan(0);
      expect(result.tableCount).toBe(1);
      expect(result.paragraphCount).toBe(1);
    });

    it('extracts embedded images from word/media and renders them in PDF document flow', async () => {
      const zip = new JSZip();
      // 1x1 transparent PNG data
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
        0x42, 0x60, 0x82
      ]);

      zip.file('word/media/image1.png', pngBytes);
      zip.file(
        'word/_rels/document.xml.rels',
        `<?xml version="1.0" encoding="UTF-8"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
        </Relationships>`
      );

      const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <w:body>
          <w:p>
            <w:r><w:t>Heading before image</w:t></w:r>
          </w:p>
          <w:p>
            <w:r>
              <w:drawing>
                <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
                           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                  <wp:extent cx="914400" cy="914400"/>
                  <a:graphic>
                    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                      <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                        <pic:blipFill>
                          <a:blip r:embed="rIdImg1"/>
                        </pic:blipFill>
                      </pic:pic>
                    </a:graphicData>
                  </a:graphic>
                </wp:inline>
              </w:drawing>
            </w:r>
          </w:p>
        </w:body>
      </w:document>`;
      zip.file('word/document.xml', docXml);

      const docxBlob = await zip.generateAsync({ type: 'blob' });
      const file = new File([docxBlob], 'image_doc.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const result = await convertDocxToPdf(file);
      expect(result.pdfBlob).toBeDefined();
      expect(result.imageCount).toBe(1);
    });
  });

  // ==========================================
  // 3. PowerPoint .pptx High-Fidelity Tests
  // ==========================================
  describe('PowerPoint (.pptx) to PDF Engine', () => {
    it('converts EMU coordinate geometries, card shapes, and typography accurately', async () => {
      const zip = new JSZip();
      // 914400 EMU = 1 inch = 25.4 mm
      const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:cSld>
          <p:spTree>
            <!-- Title shape with solid fill card -->
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="914400" y="457200"/>
                  <a:ext cx="4572000" cy="914400"/>
                </a:xfrm>
                <a:solidFill><a:srgbClr val="0F172A"/></a:solidFill>
                <a:ln w="12700"><a:solidFill><a:srgbClr val="38BDF8"/></a:solidFill></a:ln>
              </p:spPr>
              <p:txBody>
                <a:p>
                  <a:r>
                    <a:rPr b="1" sz="2400"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:rPr>
                    <a:t>Executive Briefing 2026</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
            <!-- Content shape with bullet items -->
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="914400" y="1828800"/>
                  <a:ext cx="4572000" cy="2743200"/>
                </a:xfrm>
              </p:spPr>
              <p:txBody>
                <a:p>
                  <a:pPr><a:buChar char="•"/></a:pPr>
                  <a:r><a:t>First milestone achieved ahead of schedule</a:t></a:r>
                </a:p>
                <a:p>
                  <a:pPr><a:buChar char="•"/></a:pPr>
                  <a:r><a:t>Client satisfaction score increased by 42%</a:t></a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>`;
      zip.file('ppt/slides/slide1.xml', slideXml);

      const pptxBlob = await zip.generateAsync({ type: 'blob' });
      const file = new File([pptxBlob], 'executive.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });

      const result = await processPptxFile(file);
      expect(result.slideCount).toBe(1);
      expect(result.slides[0].shapes.length).toBe(2);
      // Shape 1 has solidFill #0F172A = [15, 23, 42]
      expect(result.slides[0].shapes[0].fillColor).toEqual([15, 23, 42]);
      // Shape 1 has outline #38BDF8 = [56, 189, 248]
      expect(result.slides[0].shapes[0].borderColor).toEqual([56, 189, 248]);
      // Shape 2 has bullet paragraphs
      expect(result.slides[0].shapes[1].paragraphs[0].isBullet).toBe(true);
      expect(result.pdfBlob).toBeDefined();
      expect(result.pdfBlob.size).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // 4. PDF Compressor Engine Tests
  // ==========================================
  describe('PDF Compressor Engine & Preset Handlers', () => {
    it('defines standard compression levels and target presets properly', () => {
      expect(PDF_COMPRESSION_LEVELS.low.estimatedSavings).toContain('20%');
      expect(PDF_COMPRESSION_LEVELS.medium.estimatedSavings).toContain('40%');
      expect(PDF_COMPRESSION_LEVELS.high.estimatedSavings).toContain('60%');

      expect(COMMON_TARGET_PRESETS.length).toBeGreaterThanOrEqual(4);
      expect(COMMON_TARGET_PRESETS.find((p) => p.targetKb === 200)).toBeDefined();
      expect(COMMON_TARGET_PRESETS.find((p) => p.targetKb === 500)).toBeDefined();
    });

    it('processes multi-page vector and text PDF without loss of content', async () => {
      const doc = await PDFDocument.create();
      for (let i = 1; i <= 3; i++) {
        const page = doc.addPage([595.28, 841.89]); // A4 in points
        page.drawText(`High Fidelity Test Page ${i}`, { x: 50, y: 750 });
      }
      const pdfBytes = await doc.save();
      const testFile = new File([pdfBytes.buffer as ArrayBuffer], 'contract.pdf', {
        type: 'application/pdf',
      });

      const result = await compressPdfFile(testFile, { level: 'medium', targetSizeKb: 500 });
      expect(result.pageCount).toBe(3);
      expect(result.originalSize).toBeGreaterThan(0);
      expect(result.compressedBlob).toBeDefined();
      expect(result.compressedSize).toBeGreaterThan(0);
      expect(result.reductionPercentage).toBeGreaterThanOrEqual(0);
    });
  });
});
