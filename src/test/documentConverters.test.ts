import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { convertDocxToPdf } from '../lib/docxToPdfProcessor';
import { processPptxFile } from '../lib/pptxProcessor';
import { convertExcelToPdf, parseExcelWorkbook } from '../lib/excelToPdfProcessor';

describe('Document & Spreadsheet to PDF Engines', () => {
  it('converts a Word .docx document preserving paragraph styling and colors without watermarks', async () => {
    const zip = new JSZip();
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p>
          <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
          <w:r><w:t>Document Header Title</w:t></w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:b/><w:color w:val="2563EB"/><w:sz w:val="26"/></w:rPr>
            <w:t>Styled blue bold paragraph.</w:t>
          </w:r>
        </w:p>
      </w:body>
    </w:document>`;
    zip.file('word/document.xml', docXml);
    const docxBlob = await zip.generateAsync({ type: 'blob' });
    const file = new File([docxBlob], 'sample.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    const result = await convertDocxToPdf(file, { orientation: 'portrait' });
    expect(result.pdfBlob).toBeDefined();
    expect(result.pdfBlob.size).toBeGreaterThan(0);
    expect(result.paragraphCount).toBe(2);
    expect(result.paragraphs[0].isHeading).toBe(true);
    expect(result.paragraphs[1].runs[0].color).toEqual([37, 99, 235]); // #2563EB in RGB
  });

  it('converts an Excel .xlsx workbook into formatted table PDF', async () => {
    const zip = new JSZip();
    zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8"?>
      <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <sheets><sheet name="Sales2026" sheetId="1" r:id="rId1"/></sheets>
      </workbook>`);
    zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
      </Relationships>`);
    zip.file('xl/sharedStrings.xml', `<?xml version="1.0" encoding="UTF-8"?>
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="3" uniqueCount="3">
        <si><t>Item</t></si>
        <si><t>Revenue</t></si>
        <si><t>Laptop</t></si>
      </sst>`);
    zip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8"?>
      <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <sheetData>
          <row r="1">
            <c r="A1" t="s"><v>0</v></c>
            <c r="B1" t="s"><v>1</v></c>
          </row>
          <row r="2">
            <c r="A2" t="s"><v>2</v></c>
            <c r="B2"><v>1200</v></c>
          </row>
        </sheetData>
      </worksheet>`);

    const xlsxBlob = await zip.generateAsync({ type: 'blob' });
    const file = new File([xlsxBlob], 'sales.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const sheets = await parseExcelWorkbook(file);
    expect(sheets.length).toBe(1);
    expect(sheets[0].sheetName).toBe('Sales2026');
    expect(sheets[0].rowCount).toBe(2);

    const pdfResult = await convertExcelToPdf(file, { orientation: 'landscape' });
    expect(pdfResult.pdfBlob).toBeDefined();
    expect(pdfResult.pdfBlob.size).toBeGreaterThan(0);
    expect(pdfResult.totalRows).toBe(2);
  });

  it('converts a PowerPoint .pptx presentation to PDF without changing English or original text to Kannada', async () => {
    const zip = new JSZip();
    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld>
        <p:spTree>
          <p:sp>
            <p:txBody>
              <a:p><a:r><a:t>Quarterly Business Review 2026</a:t></a:r></a:p>
              <a:p><a:r><a:t>Key Achievements &amp; Growth Metrics</a:t></a:r></a:p>
            </p:txBody>
          </p:sp>
        </p:spTree>
      </p:cSld>
    </p:sld>`;
    zip.file('ppt/slides/slide1.xml', slideXml);
    const pptxBlob = await zip.generateAsync({ type: 'blob' });
    const file = new File([pptxBlob], 'presentation.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });

    const result = await processPptxFile(file);
    expect(result.pdfBlob).toBeDefined();
    expect(result.pdfBlob.size).toBeGreaterThan(0);
    expect(result.slideCount).toBe(1);
    expect(result.slides[0].paragraphs[0]).toBe('Quarterly Business Review 2026');
    expect(result.slides[0].paragraphs[1]).toBe('Key Achievements & Growth Metrics');
    // Ensure English text was preserved 100% and NOT converted into Kannada Unicode characters
    expect(result.slides[0].paragraphs[0]).not.toMatch(/[\u0C80-\u0CFF]/);
  });

  it('converts a CSV spreadsheet file to PDF correctly', async () => {
    const csvContent = `Name,Role,Salary\nJohn Doe,Engineer,"₹ 1,20,000"\nJane Smith,Designer,"₹ 1,10,000"`;
    const csvFile = new File([csvContent], 'payroll.csv', { type: 'text/csv' });

    const sheets = await parseExcelWorkbook(csvFile);
    expect(sheets.length).toBe(1);
    expect(sheets[0].sheetName).toBe('payroll');
    expect(sheets[0].rowCount).toBe(3);
    expect(sheets[0].rows[0].cells[0].value).toBe('Name');

    const pdfResult = await convertExcelToPdf(csvFile, { orientation: 'landscape' });
    expect(pdfResult.pdfBlob).toBeDefined();
    expect(pdfResult.pdfBlob.size).toBeGreaterThan(0);
    expect(pdfResult.totalRows).toBe(3);
  });

  it('sanitizes smart quotes, rupee symbol, em-dashes, and bullets cleanly', async () => {
    const { sanitizeTypography, safePdfAsciiText } = await import('../lib/unicodeSanitizer');
    const input = '“Smart Quotes” & ‘Single’ — Price: ₹500 • Item 1…';
    const sanitized = sanitizeTypography(input);
    expect(sanitized).toBe('"Smart Quotes" & \'Single\'  --  Price: Rs. 500 * Item 1...');

    const safeAscii = safePdfAsciiText('Special “Quotes” & ₹999');
    expect(safeAscii).toContain('Rs. 999');
    expect(safeAscii).not.toContain('₹');
  });

  it('rejects legacy binary Office 97-2003 files with informative error message', async () => {
    // Legacy binary OLE2 header: D0 CF 11 E0 A1 B1 1A E1
    const ole2Header = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    const fakeDoc = new File([ole2Header], 'legacy.doc');
    const fakePpt = new File([ole2Header], 'legacy.ppt');
    const fakeXls = new File([ole2Header], 'legacy.xls');

    await expect(convertDocxToPdf(fakeDoc)).rejects.toThrow(/legacy binary Word .doc/i);
    await expect(processPptxFile(fakePpt)).rejects.toThrow(/legacy binary PowerPoint .ppt/i);
    await expect(parseExcelWorkbook(fakeXls)).rejects.toThrow(/legacy binary Excel .xls/i);
  });
});

