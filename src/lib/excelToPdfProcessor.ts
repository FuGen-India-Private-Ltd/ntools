// Client-Side Offline Excel (.xlsx) & CSV to PDF Converter Engine
// Preserves table layouts, proportional column widths, cell wrapping, borders, font alignments, and headers

import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { sanitizeTypography, safePdfAsciiText } from './unicodeSanitizer';

export interface ExcelCell {
  colIndex: number;
  colName: string;
  rowIndex: number;
  value: string;
  isHeader?: boolean;
}

export interface ExcelRow {
  rowIndex: number;
  cells: ExcelCell[];
}

export interface ExcelSheetData {
  sheetName: string;
  rows: ExcelRow[];
  maxCols: number;
  rowCount: number;
}

export interface ExcelToPdfOptions {
  orientation?: 'portrait' | 'landscape' | 'auto';
  pageSize?: 'a4' | 'letter';
  includeGridLines?: boolean;
  selectedSheetIndex?: number;
  theme?: 'modern-slate' | 'professional-blue' | 'classic-grid' | 'minimal';
}

export interface ExcelToPdfResult {
  pdfBlob: Blob;
  pdfFileName: string;
  sheets: ExcelSheetData[];
  totalSheets: number;
  totalRows: number;
}

function getColLetter(ref: string): string {
  const match = ref.match(/^([A-Z]+)/i);
  return match ? match[1].toUpperCase() : 'A';
}

function colLetterToIndex(col: string): number {
  let index = 0;
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - 64);
  }
  return index - 1;
}

function getColLetterFromIndex(index: number): string {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function decodeXmlText(text: string): string {
  const decoded = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  return sanitizeTypography(decoded);
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal);
      currentVal = '';
      if (currentRow.some((c) => c.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal);
    if (currentRow.some((c) => c.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export async function parseCsvFile(file: File): Promise<ExcelSheetData[]> {
  const rawText = await file.text();
  const parsedRows = parseCsvRows(rawText);
  const rows: ExcelRow[] = [];
  let maxCols = 0;

  parsedRows.forEach((cols, rIdx) => {
    const cells: ExcelCell[] = cols.map((colVal, cIdx) => ({
      colIndex: cIdx,
      colName: getColLetterFromIndex(cIdx),
      rowIndex: rIdx + 1,
      value: sanitizeTypography(colVal.trim()),
      isHeader: rIdx === 0,
    }));
    if (cells.length > maxCols) {
      maxCols = cells.length;
    }
    if (cells.length > 0) {
      rows.push({
        rowIndex: rIdx + 1,
        cells,
      });
    }
  });

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'Sheet1';
  return [
    {
      sheetName: baseName,
      rows,
      maxCols,
      rowCount: rows.length,
    },
  ];
}

export async function parseExcelWorkbook(file: File): Promise<ExcelSheetData[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'csv') {
    return parseCsvFile(file);
  }

  const arrayBuffer = await file.arrayBuffer();

  // Check for legacy binary Excel 97-2003 (.xls) magic bytes: D0 CF 11 E0
  const headerBytes = new Uint8Array(arrayBuffer.slice(0, 8));
  if (
    (headerBytes[0] === 0xd0 && headerBytes[1] === 0xcf && headerBytes[2] === 0x11 && headerBytes[3] === 0xe0) ||
    file.name.toLowerCase().endsWith('.xls')
  ) {
    throw new Error(
      'This is a legacy binary Excel .xls file (Excel 97-2003). Please save it as modern .xlsx or use a .xlsx file for PDF conversion.'
    );
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch {
    throw new Error('Unable to read Excel workbook. File may be corrupted or invalid.');
  }

  // 1. Shared Strings Table
  const sharedStrings: string[] = [];
  const sharedStringsEntry = zip.file('xl/sharedStrings.xml');
  if (sharedStringsEntry) {
    const sstXml = await sharedStringsEntry.async('string');
    const siMatches = sstXml.match(/<si(?:\s+[^>]*)?>[\s\S]*?<\/si>/gi) || [];
    for (const siXml of siMatches) {
      const tMatches = siXml.match(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/gi) || [];
      let fullText = '';
      for (const tXml of tMatches) {
        const rawContent = tXml.replace(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/i, '$1');
        fullText += decodeXmlText(rawContent);
      }
      sharedStrings.push(fullText);
    }
  }

  // 2. Workbook sheet metadata
  const sheetMeta: { id: string; name: string; rId: string }[] = [];
  const workbookEntry = zip.file('xl/workbook.xml');
  if (workbookEntry) {
    const wbXml = await workbookEntry.async('string');
    const sheetTags = wbXml.match(/<sheet\s+[^>]*\/>/gi) || [];
    for (const tag of sheetTags) {
      const nameMatch = tag.match(/name="([^"]*)"/i);
      const sheetIdMatch = tag.match(/sheetId="([^"]*)"/i);
      const rIdMatch = tag.match(/r:id="([^"]*)"/i);
      if (nameMatch && sheetIdMatch) {
        sheetMeta.push({
          id: sheetIdMatch[1],
          name: decodeXmlText(nameMatch[1]),
          rId: rIdMatch ? rIdMatch[1] : `rId${sheetIdMatch[1]}`,
        });
      }
    }
  }

  if (sheetMeta.length === 0) {
    sheetMeta.push({ id: '1', name: 'Sheet1', rId: 'rId1' });
  }

  const parsedSheets: ExcelSheetData[] = [];

  for (let idx = 0; idx < sheetMeta.length; idx++) {
    const info = sheetMeta[idx];
    const candidatePaths = [
      `xl/worksheets/sheet${idx + 1}.xml`,
      `xl/worksheets/sheet${info.id}.xml`,
      `xl/worksheets/${info.name}.xml`,
    ];

    let sheetEntry = null;
    for (const path of candidatePaths) {
      sheetEntry = zip.file(path);
      if (sheetEntry) break;
    }

    if (!sheetEntry) {
      const allFiles = Object.keys(zip.files);
      const fallback = allFiles.find(
        (f) => f.startsWith('xl/worksheets/sheet') && f.endsWith('.xml')
      );
      if (fallback) {
        sheetEntry = zip.file(fallback);
      }
    }

    if (!sheetEntry) continue;

    const sheetXml = await sheetEntry.async('string');
    const rows: ExcelRow[] = [];
    let maxCols = 0;

    const rowMatches = sheetXml.match(/<row(?:\s+[^>]*)?>[\s\S]*?<\/row>/gi) || [];

    for (let rIdx = 0; rIdx < rowMatches.length; rIdx++) {
      const rowXml = rowMatches[rIdx];
      const rAttrMatch = rowXml.match(/^<row\s+[^>]*r="(\d+)"/i);
      const rVal = rAttrMatch ? parseInt(rAttrMatch[1], 10) : rIdx + 1;

      const cells: ExcelCell[] = [];
      const cellMatches = rowXml.match(/<c(?:\s+[^>]*)?>[\s\S]*?<\/c>|<c(?:\s+[^>]*)\/>/gi) || [];

      for (const cellXml of cellMatches) {
        const rMatch = cellXml.match(/r="([A-Z]+)(\d+)"/i);
        const tMatch = cellXml.match(/t="([^"]*)"/i);
        const vMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/i);
        const isMatch = cellXml.match(/<is>[\s\S]*?<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>[\s\S]*?<\/is>/i);

        const colLetter = rMatch ? rMatch[1].toUpperCase() : 'A';
        const colIdx = colLetterToIndex(colLetter);
        const cellType = tMatch ? tMatch[1] : '';

        let cellValue = '';
        if (cellType === 's' && vMatch) {
          const stringIndex = parseInt(vMatch[1], 10);
          cellValue = sharedStrings[stringIndex] || '';
        } else if (cellType === 'inlineStr' && isMatch) {
          cellValue = decodeXmlText(isMatch[1]);
        } else if (cellType === 'b' && vMatch) {
          cellValue = vMatch[1] === '1' ? 'TRUE' : 'FALSE';
        } else if (vMatch) {
          cellValue = decodeXmlText(vMatch[1]);
        }

        cells.push({
          colIndex: colIdx,
          colName: colLetter,
          rowIndex: rVal,
          value: cellValue.trim(),
          isHeader: rIdx === 0,
        });

        if (colIdx + 1 > maxCols) {
          maxCols = colIdx + 1;
        }
      }

      if (cells.length > 0) {
        rows.push({
          rowIndex: rVal,
          cells,
        });
      }
    }

    parsedSheets.push({
      sheetName: info.name,
      rows,
      maxCols,
      rowCount: rows.length,
    });
  }

  return parsedSheets;
}

/**
 * Checks if a string is primarily numeric/currency/date for alignment
 */
function isNumericCell(text: string): boolean {
  if (!text || text.length === 0) return false;
  const clean = text.replace(/[\s,$€£₹%]/g, '');
  return !isNaN(Number(clean)) && clean.length > 0;
}

/**
 * High-Fidelity Excel to PDF Converter:
 * - Content-aware proportional column widths
 * - Multi-line cell text wrapping with dynamic row height
 * - Header repetition across page breaks
 * - Clean vector borders and theme colors
 */
export async function convertExcelToPdf(
  file: File,
  options: ExcelToPdfOptions = {}
): Promise<ExcelToPdfResult> {
  const sheets = await parseExcelWorkbook(file);
  if (sheets.length === 0) {
    throw new Error('No readable spreadsheet sheets found in this file.');
  }

  const format = options.pageSize || 'a4';

  const activeSheets =
    options.selectedSheetIndex !== undefined && options.selectedSheetIndex >= 0
      ? [sheets[options.selectedSheetIndex] || sheets[0]]
      : sheets;

  // Auto-detect orientation based on max columns across active sheets
  let orientation: 'portrait' | 'landscape' =
    options.orientation === 'auto' || !options.orientation
      ? activeSheets.some((s) => s.maxCols > 7)
        ? 'landscape'
        : 'portrait'
      : (options.orientation as 'portrait' | 'landscape');

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginLeft = 12;
  const marginRight = 12;
  const marginTop = 16;
  const marginBottom = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // Theme definitions
  const theme = options.theme || 'modern-slate';
  let headerBg: [number, number, number] = [30, 41, 59]; // slate-800
  let headerText: [number, number, number] = [255, 255, 255];
  let zebraBg: [number, number, number] = [248, 250, 252]; // slate-50
  let borderColor: [number, number, number] = [203, 213, 225]; // slate-300

  if (theme === 'professional-blue') {
    headerBg = [30, 58, 138]; // blue-900
    headerText = [255, 255, 255];
    zebraBg = [239, 246, 255]; // blue-50
    borderColor = [191, 219, 254]; // blue-200
  } else if (theme === 'minimal') {
    headerBg = [241, 245, 249]; // slate-100
    headerText = [15, 23, 42]; // slate-900
    zebraBg = [255, 255, 255];
    borderColor = [226, 232, 240];
  }

  let totalPages = 1;

  activeSheets.forEach((sheet, sIdx) => {
    if (sIdx > 0) {
      pdf.addPage(format, orientation);
      totalPages++;
    }

    if (sheet.rows.length === 0) return;

    const numCols = Math.max(1, sheet.maxCols);

    // 1. Calculate Content-Aware Proportional Column Widths
    // Scan all cells in each column to determine character weight
    const colWeights: number[] = new Array(numCols).fill(10);
    const colIsNumeric: boolean[] = new Array(numCols).fill(false);

    sheet.rows.forEach((row) => {
      row.cells.forEach((cell) => {
        if (cell.colIndex < numCols) {
          const valLen = cell.value.length;
          if (valLen > colWeights[cell.colIndex]) {
            colWeights[cell.colIndex] = Math.min(65, valLen);
          }
          if (isNumericCell(cell.value)) {
            colIsNumeric[cell.colIndex] = true;
          }
        }
      });
    });

    const totalWeight = colWeights.reduce((sum, w) => sum + w, 0);

    // Dynamic font sizing based on column density
    let fontSize = 8.5;
    let headerFontSize = 9;
    let lineHeight = 3.6;
    let cellPadding = 2.0;

    if (numCols > 16) {
      fontSize = 6.0;
      headerFontSize = 6.5;
      lineHeight = 2.6;
      cellPadding = 1.0;
    } else if (numCols > 11) {
      fontSize = 7.0;
      headerFontSize = 7.5;
      lineHeight = 3.0;
      cellPadding = 1.4;
    } else if (numCols > 7) {
      fontSize = 8.0;
      headerFontSize = 8.5;
      lineHeight = 3.4;
      cellPadding = 1.8;
    }

    // Assign proportional mm width to each column with minimum guard
    const colWidths: number[] = colWeights.map((w) =>
      Math.max(12, (w / totalWeight) * contentWidth)
    );

    // Normalize if sum diverges slightly from contentWidth
    const sumWidths = colWidths.reduce((a, b) => a + b, 0);
    const scaleFactor = sumWidths > 0 ? contentWidth / sumWidths : 1;
    for (let c = 0; c < numCols; c++) {
      colWidths[c] = colWidths[c] * scaleFactor;
    }

    // Cumulative X offsets
    const colOffsets: number[] = [marginLeft];
    for (let c = 0; c < numCols; c++) {
      colOffsets.push(colOffsets[c] + colWidths[c]);
    }

    // Header drawing helper function for repeat-on-page-break
    const drawHeader = (yPos: number): number => {
      const headerRow = sheet.rows[0];
      const headerLinesPerCol: string[][] = [];

      for (let c = 0; c < numCols; c++) {
        const cell = headerRow ? headerRow.cells.find((cl) => cl.colIndex === c) : null;
        const rawText = cell ? cell.value : `Column ${getColLetterFromIndex(c)}`;
        const safeText = safePdfAsciiText(rawText);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(headerFontSize);
        const lines = pdf.splitTextToSize(safeText, colWidths[c] - cellPadding * 2);
        headerLinesPerCol.push(lines.length > 0 ? lines : [' ']);
      }

      const maxLines = Math.max(...headerLinesPerCol.map((l) => l.length));
      const rowHeight = Math.max(7.5, maxLines * lineHeight + cellPadding * 2);

      // Background fill
      pdf.setFillColor(...headerBg);
      pdf.rect(marginLeft, yPos, contentWidth, rowHeight, 'F');

      // Grid borders
      if (options.includeGridLines !== false) {
        pdf.setDrawColor(...borderColor);
        pdf.setLineWidth(0.2);
        pdf.rect(marginLeft, yPos, contentWidth, rowHeight, 'S');
        for (let c = 1; c < numCols; c++) {
          pdf.line(colOffsets[c], yPos, colOffsets[c], yPos + rowHeight);
        }
      }

      // Draw header text
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(headerFontSize);
      pdf.setTextColor(...headerText);

      for (let c = 0; c < numCols; c++) {
        const lines = headerLinesPerCol[c];
        const isNum = colIsNumeric[c];
        const startTextY = yPos + cellPadding + lineHeight * 0.75;

        lines.forEach((line, lIdx) => {
          const textY = startTextY + lIdx * lineHeight;
          if (isNum) {
            const txtWidth = pdf.getTextWidth(line);
            pdf.text(line, colOffsets[c + 1] - cellPadding - txtWidth, textY);
          } else {
            pdf.text(line, colOffsets[c] + cellPadding, textY);
          }
        });
      }

      return rowHeight;
    };

    // Draw Sheet Title Banner
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(15, 23, 42);
    const safeTitle = safePdfAsciiText(sheet.sheetName);
    pdf.text(safeTitle, marginLeft, marginTop - 4);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`${sheet.rowCount} rows • ${numCols} columns`, marginLeft + pdf.getTextWidth(safeTitle) + 6, marginTop - 4);

    let currentY = marginTop + 1;
    let headerHeight = drawHeader(currentY);
    currentY += headerHeight;

    // Render Data Rows with Dynamic Height and Text Wrapping
    const dataRows = sheet.rows.slice(1);

    dataRows.forEach((row, rIdx) => {
      const cellLinesPerCol: string[][] = [];

      for (let c = 0; c < numCols; c++) {
        const cell = row.cells.find((cl) => cl.colIndex === c);
        const rawText = cell ? cell.value : '';
        const safeText = safePdfAsciiText(rawText);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(safeText, colWidths[c] - cellPadding * 2);
        cellLinesPerCol.push(lines.length > 0 ? lines : ['']);
      }

      const maxLines = Math.max(1, ...cellLinesPerCol.map((l) => l.length));
      const rowHeight = Math.max(6.0, maxLines * lineHeight + cellPadding * 2);

      // Check for Page Overflow
      if (currentY + rowHeight > pageHeight - marginBottom) {
        pdf.addPage(format, orientation);
        totalPages++;
        currentY = marginTop;

        // Draw Continued Title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`${safeTitle} (Continued)`, marginLeft, currentY - 3);

        // Repeat Header Row on new page
        const repHeaderH = drawHeader(currentY);
        currentY += repHeaderH;
      }

      // Draw Row Background Fill (Zebra striping)
      if (rIdx % 2 === 1) {
        pdf.setFillColor(...zebraBg);
        pdf.rect(marginLeft, currentY, contentWidth, rowHeight, 'F');
      } else {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(marginLeft, currentY, contentWidth, rowHeight, 'F');
      }

      // Draw Row Grid Borders
      if (options.includeGridLines !== false) {
        pdf.setDrawColor(...borderColor);
        pdf.setLineWidth(0.18);
        pdf.rect(marginLeft, currentY, contentWidth, rowHeight, 'S');
        for (let c = 1; c < numCols; c++) {
          pdf.line(colOffsets[c], currentY, colOffsets[c], currentY + rowHeight);
        }
      }

      // Draw Cell Text
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(fontSize);
      pdf.setTextColor(30, 41, 59);

      for (let c = 0; c < numCols; c++) {
        const lines = cellLinesPerCol[c];
        const isNum = colIsNumeric[c];
        const startTextY = currentY + cellPadding + lineHeight * 0.75;

        lines.forEach((line, lIdx) => {
          if (!line.trim()) return;
          const textY = startTextY + lIdx * lineHeight;
          if (isNum) {
            const txtWidth = pdf.getTextWidth(line);
            pdf.text(line, colOffsets[c + 1] - cellPadding - txtWidth, textY);
          } else {
            pdf.text(line, colOffsets[c] + cellPadding, textY);
          }
        });
      }

      currentY += rowHeight;
    });

    // Draw Footer on each page of active sheet
    const numPages = pdf.getNumberOfPages();
    for (let p = 1; p <= numPages; p++) {
      pdf.setPage(p);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(148, 163, 184); // slate-400
      pdf.text(safeTitle, marginLeft, pageHeight - 6);
      const pageStr = `Page ${p} of ${numPages}`;
      pdf.text(pageStr, pageWidth - marginRight - pdf.getTextWidth(pageStr), pageHeight - 6);
    }
  });

  const pdfBlob = pdf.output('blob');
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const pdfFileName = `${baseName}.pdf`;
  const totalRows = sheets.reduce((sum, s) => sum + s.rowCount, 0);

  return {
    pdfBlob,
    pdfFileName,
    sheets,
    totalSheets: sheets.length,
    totalRows,
  };
}
