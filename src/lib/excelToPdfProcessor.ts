// Client-Side Offline Excel (.xlsx) to PDF Converter Engine
// Parses OpenXML Sheets, Shared Strings, Rows, Columns, and creates High-Fidelity Table PDFs

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
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'letter';
  includeGridLines?: boolean;
  selectedSheetIndex?: number;
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

  const sheetName = file.name.replace(/\.csv$/i, '') || 'CSV Sheet';

  return [
    {
      sheetName,
      rows,
      maxCols: Math.max(maxCols, 1),
      rowCount: rows.length,
    },
  ];
}

export async function parseExcelWorkbook(file: File): Promise<ExcelSheetData[]> {
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.csv')) {
    return parseCsvFile(file);
  }

  const arrayBuffer = await file.arrayBuffer();

  // Check for legacy binary Excel 97-2003 (.xls) magic bytes: D0 CF 11 E0
  const uint8 = new Uint8Array(arrayBuffer.slice(0, 8));
  if (uint8[0] === 0xd0 && uint8[1] === 0xcf && uint8[2] === 0x11 && uint8[3] === 0xe0) {
    throw new Error(
      'This is a legacy binary Excel .xls file (Excel 97-2003). Please save it as modern .xlsx or export to .csv for conversion.'
    );
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (err: any) {
    throw new Error('Unable to read Excel file. Please ensure it is a valid .xlsx or .csv spreadsheet.');
  }

  // 1. Parse Shared Strings
  const sharedStrings: string[] = [];
  const sharedStringsEntry = zip.file('xl/sharedStrings.xml');
  if (sharedStringsEntry) {
    const sstXml = await sharedStringsEntry.async('string');
    const siMatches = sstXml.match(/<si>[\s\S]*?<\/si>/gi) || [];
    for (const siXml of siMatches) {
      const tMatches = siXml.match(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/gi) || [];
      let str = '';
      for (const tXml of tMatches) {
        const text = tXml.replace(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/i, '$1');
        str += decodeXmlText(text);
      }
      sharedStrings.push(str);
    }
  }

  // 2. Parse Workbook Sheet Names and Relationship IDs
  const sheetsInfo: { name: string; id: string; target: string }[] = [];
  const relMap = new Map<string, string>();

  const relsEntry = zip.file('xl/_rels/workbook.xml.rels');
  if (relsEntry) {
    const relsXml = await relsEntry.async('string');
    const relMatches = relsXml.match(/<Relationship\s+[^>]*\/>/gi) || [];
    for (const rXml of relMatches) {
      const idMatch = rXml.match(/Id="([^"]*)"/i);
      const targetMatch = rXml.match(/Target="([^"]*)"/i);
      if (idMatch && targetMatch) {
        relMap.set(idMatch[1], targetMatch[1].replace(/^worksheets\//, 'xl/worksheets/'));
      }
    }
  }

  const workbookEntry = zip.file('xl/workbook.xml');
  if (workbookEntry) {
    const wbXml = await workbookEntry.async('string');
    const sheetMatches = wbXml.match(/<sheet\s+[^>]*\/>/gi) || [];
    for (let i = 0; i < sheetMatches.length; i++) {
      const sXml = sheetMatches[i];
      const nameMatch = sXml.match(/name="([^"]*)"/i);
      const rIdMatch = sXml.match(/r:id="([^"]*)"/i);
      const name = nameMatch ? nameMatch[1] : `Sheet ${i + 1}`;
      const rId = rIdMatch ? rIdMatch[1] : '';
      const target = relMap.get(rId) || `xl/worksheets/sheet${i + 1}.xml`;
      sheetsInfo.push({ name, id: rId, target });
    }
  }

  if (sheetsInfo.length === 0) {
    zip.forEach((path) => {
      if (/xl\/worksheets\/sheet\d+\.xml/i.test(path)) {
        sheetsInfo.push({
          name: `Sheet ${sheetsInfo.length + 1}`,
          id: `rId${sheetsInfo.length + 1}`,
          target: path,
        });
      }
    });
  }

  const parsedSheets: ExcelSheetData[] = [];

  // 3. Parse Each Worksheet Data
  for (const info of sheetsInfo) {
    const sheetPath = info.target.startsWith('xl/') ? info.target : `xl/${info.target}`;
    const sheetEntry = zip.file(sheetPath) || zip.file(info.target);
    if (!sheetEntry) continue;

    const sheetXml = await sheetEntry.async('string');
    const rowMatches = sheetXml.match(/<row(?:\s+[^>]*)?>[\s\S]*?<\/row>/gi) || [];
    const rows: ExcelRow[] = [];
    let maxCols = 0;

    for (let rIdx = 0; rIdx < rowMatches.length; rIdx++) {
      const rowXml = rowMatches[rIdx];
      const rValMatch = rowXml.match(/<row\s+[^>]*r="(\d+)"/i);
      const rVal = rValMatch ? parseInt(rValMatch[1], 10) : rIdx + 1;

      const cellMatches = rowXml.match(/<c(?:\s+[^>]*)?>[\s\S]*?<\/c>/gi) || [];
      const cells: ExcelCell[] = [];

      for (const cXml of cellMatches) {
        const refMatch = cXml.match(/r="([A-Z0-9]+)"/i);
        const cellRef = refMatch ? refMatch[1] : 'A1';
        const colLetter = getColLetter(cellRef);
        const colIdx = colLetterToIndex(colLetter);

        const typeMatch = cXml.match(/t="([^"]*)"/i);
        const cellType = typeMatch ? typeMatch[1] : '';

        let cellValue = '';
        const vMatch = cXml.match(/<v>([\s\S]*?)<\/v>/i);
        const isMatch = cXml.match(/<is>[\s\S]*?<t>([\s\S]*?)<\/t>[\s\S]*?<\/is>/i);

        if (cellType === 's' && vMatch) {
          const sstIdx = parseInt(vMatch[1], 10);
          cellValue = sharedStrings[sstIdx] || '';
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

export async function convertExcelToPdf(
  file: File,
  options: ExcelToPdfOptions = {}
): Promise<ExcelToPdfResult> {
  const sheets = await parseExcelWorkbook(file);
  if (sheets.length === 0) {
    throw new Error('No readable spreadsheet sheets found in this Excel file.');
  }

  const orientation = options.orientation || 'landscape';
  const format = options.pageSize || 'a4';

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginLeft = 14;
  const marginRight = 14;
  const marginTop = 18;
  const marginBottom = 16;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let pageNumber = 1;

  const activeSheets = options.selectedSheetIndex !== undefined
    ? [sheets[options.selectedSheetIndex] || sheets[0]]
    : sheets;

  activeSheets.forEach((sheet, sIdx) => {
    if (sIdx > 0) {
      pdf.addPage(format, orientation);
      pageNumber++;
    }

    // Title / Sheet Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(15, 23, 42); // slate-900
    const safeSheetTitle = safePdfAsciiText(sheet.sheetName);
    pdf.text(safeSheetTitle, marginLeft, marginTop - 4);

    let currentY = marginTop + 4;
    const maxUsableCols = Math.min(sheet.maxCols || 1, 12);
    const colWidth = contentWidth / maxUsableCols;

    sheet.rows.forEach((row, rIdx) => {
      const isHeaderRow = rIdx === 0;
      const rowHeight = isHeaderRow ? 8.5 : 7.2;

      // Check if page overflow
      if (currentY + rowHeight > pageHeight - marginBottom) {
        pdf.addPage(format, orientation);
        pageNumber++;
        currentY = marginTop;

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`${safeSheetTitle} (Continued)`, marginLeft, currentY - 4);
      }

      // Draw Row Background
      if (isHeaderRow) {
        pdf.setFillColor(226, 232, 240); // slate-200
      } else if (rIdx % 2 === 1) {
        pdf.setFillColor(248, 250, 252); // slate-50 alternating
      } else {
        pdf.setFillColor(255, 255, 255);
      }
      pdf.rect(marginLeft, currentY, contentWidth, rowHeight, 'F');

      // Draw Grid Borders
      if (options.includeGridLines !== false) {
        pdf.setDrawColor(203, 213, 225); // slate-300
        pdf.setLineWidth(0.2);
        pdf.rect(marginLeft, currentY, contentWidth, rowHeight, 'S');

        for (let c = 1; c < maxUsableCols; c++) {
          pdf.line(marginLeft + c * colWidth, currentY, marginLeft + c * colWidth, currentY + rowHeight);
        }
      }

      // Draw Cell Text
      pdf.setFont('helvetica', isHeaderRow ? 'bold' : 'normal');
      pdf.setFontSize(isHeaderRow ? 9.5 : 8.5);
      pdf.setTextColor(isHeaderRow ? 15 : 51, isHeaderRow ? 23 : 65, isHeaderRow ? 42 : 85);

      for (let c = 0; c < maxUsableCols; c++) {
        const cell = row.cells.find((cellItem) => cellItem.colIndex === c);
        const rawVal = cell ? cell.value : '';
        if (rawVal) {
          const safeVal = safePdfAsciiText(rawVal);
          const truncated = pdf.splitTextToSize(safeVal, colWidth - 3)[0] || '';
          pdf.text(truncated, marginLeft + c * colWidth + 1.8, currentY + rowHeight - 2.4);
        }
      }

      currentY += rowHeight;
    });

    // Clean Pagination Footer (Zero watermarks)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Page ${pageNumber}`, pageWidth - marginRight - 12, pageHeight - 8);
  });

  const pdfBlob = pdf.output('blob');
  const baseName = file.name.replace(/\.(xlsx|xls|csv)$/i, '');
  const pdfFileName = `${baseName}_Spreadsheet.pdf`;

  const totalRows = sheets.reduce((acc, curr) => acc + curr.rowCount, 0);

  return {
    pdfBlob,
    pdfFileName,
    sheets,
    totalSheets: sheets.length,
    totalRows,
  };
}
