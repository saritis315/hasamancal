// הצהרה מינימלית על SheetJS (xlsx.full.min.js), שנטען בתג script ב-index.html (tech-stack.md 2.4).
// מוגדרים רק החלקים שהקוד משתמש בהם.
export {}

interface XlsxWorkbook {
  SheetNames: string[]
  Sheets: Record<string, unknown>
}

interface XlsxLib {
  read(data: string | ArrayBuffer, opts: { type: 'string' | 'array'; raw?: boolean }): XlsxWorkbook
  utils: {
    sheet_to_json(ws: unknown, opts: { header: 1; raw: boolean; defval: string }): unknown[][]
  }
  SSF: { parse_date_code(serial: number): { y: number; m: number; d: number } | null }
}

declare global {
  // eslint-disable-next-line no-var
  var XLSX: XlsxLib | undefined
}
