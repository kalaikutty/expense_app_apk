import { Transaction, TransactionType } from '../types';

export interface ExcelRow {
  id?: string;
  date: string;
  title: string;
  category: string;
  type: TransactionType;
  amount: number;
  note?: string;
  source?: 'MANUAL' | 'EXCEL' | 'IMPORT';
}

/**
 * Converts an array of transactions into an Excel-compatible CSV string with UTF-8 BOM.
 */
export function generateExcelCsv(transactions: Transaction[], username: string): string {
  const headers = ['ID', 'Date', 'Title', 'Category', 'Type', 'Amount (INR)', 'Note', 'Source'];
  
  const rows = transactions.map((t) => [
    t.id || '',
    t.date.slice(0, 10), // YYYY-MM-DD
    `"${(t.title || '').replace(/"/g, '""')}"`,
    `"${(t.category || '').replace(/"/g, '""')}"`,
    t.type,
    t.amount.toFixed(2),
    `"${(t.note || '').replace(/"/g, '""')}"`,
    t.source || 'MANUAL',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  
  // Return UTF-8 BOM + CSV content
  return '\uFEFF' + csvContent;
}

/**
 * Downloads a generated CSV file to the browser.
 */
export function downloadExcelFile(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', filename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Parses CSV text into ExcelRow array.
 */
export function parseExcelCsvText(text: string): ExcelRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  // Parse CSV line handling quoted strings
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        if (inQuotes && line[i + 1] === char) {
          current += char;
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === ',' || char === '\t') && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headerLine = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  
  // Find column indices
  const idIdx = headerLine.findIndex((h) => h === 'id');
  const dateIdx = headerLine.findIndex((h) => h.includes('date'));
  const titleIdx = headerLine.findIndex((h) => h.includes('title') || h.includes('name') || h.includes('description'));
  const catIdx = headerLine.findIndex((h) => h.includes('cat'));
  const typeIdx = headerLine.findIndex((h) => h.includes('type'));
  const amtIdx = headerLine.findIndex((h) => h.includes('amount') || h.includes('inr') || h.includes('rs') || h.includes('price'));
  const noteIdx = headerLine.findIndex((h) => h.includes('note') || h.includes('remark'));

  const parsedRows: ExcelRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length === 0) continue;

    const rawTitle = titleIdx !== -1 ? cols[titleIdx] : cols[1] || 'Excel Entry';
    const rawAmt = amtIdx !== -1 ? cols[amtIdx] : cols[4] || '0';
    const rawType = typeIdx !== -1 ? cols[typeIdx].toUpperCase() : 'DEBIT';
    const rawCat = catIdx !== -1 ? cols[catIdx] : 'Other';
    const rawDate = dateIdx !== -1 ? cols[dateIdx] : new Date().toISOString().slice(0, 10);
    const rawNote = noteIdx !== -1 ? cols[noteIdx] : '';
    const rawId = idIdx !== -1 ? cols[idIdx] : undefined;

    const numAmt = Math.abs(parseFloat(rawAmt.replace(/[^0-9.]/g, ''))) || 0;
    const finalType: TransactionType = rawType.includes('CREDIT') || rawType.includes('INCOME') ? 'CREDIT' : 'DEBIT';

    if (rawTitle || numAmt > 0) {
      parsedRows.push({
        id: rawId && rawId.length > 3 ? rawId : undefined,
        title: rawTitle || 'Excel Entry',
        amount: numAmt,
        type: finalType,
        category: rawCat || 'Other',
        date: rawDate.length === 10 ? `${rawDate}T12:00:00.000Z` : new Date(rawDate).toISOString(),
        note: rawNote || undefined,
        source: 'EXCEL',
      });
    }
  }

  return parsedRows;
}
