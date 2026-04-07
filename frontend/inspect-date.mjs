import * as XLSX from './node_modules/xlsx/xlsx.mjs';
import { readFileSync } from 'fs';

const buf = readFileSync('C:/Users/w.boujlida/Downloads/pointage_06-04-2026.xlsx');
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, dateNF: 'dd/mm/yyyy' });
const ws = wb.Sheets[wb.SheetNames[0]];
const range = XLSX.utils.decode_range(ws['!ref']);

// Print headers
process.stdout.write('HEADERS: ');
for (let c = range.s.c; c <= range.e.c; c++) {
  const cell = ws[XLSX.utils.encode_cell({r:0,c})];
  if (cell) process.stdout.write(`[${c}]${cell.v}  `);
}
console.log();

// Find date column and inspect first row
for (let c = range.s.c; c <= range.e.c; c++) {
  const hdrCell = ws[XLSX.utils.encode_cell({r:0,c})];
  if (!hdrCell) continue;
  const hdr = String(hdrCell.v ?? '');
  if (!hdr.toLowerCase().includes('dat')) continue;

  const cell = ws[XLSX.utils.encode_cell({r:1,c})];
  if (!cell) continue;
  console.log(`\nDate column: "${hdr}"`);
  console.log('  cell.t =', cell.t);
  console.log('  cell.w =', cell.w);
  console.log('  cell.z =', cell.z);
  console.log('  typeof cell.v =', typeof cell.v);
  console.log('  cell.v instanceof Date =', cell.v instanceof Date);
  if (cell.v instanceof Date) {
    console.log('  toString()   =', cell.v.toString());
    console.log('  toISOString()=', cell.v.toISOString());
    console.log('  LOCAL  => year:', cell.v.getFullYear(), 'month:', cell.v.getMonth()+1, 'day:', cell.v.getDate());
    console.log('  UTC    => year:', cell.v.getUTCFullYear(), 'month:', cell.v.getUTCMonth()+1, 'day:', cell.v.getUTCDate());
  } else {
    console.log('  cell.v =', cell.v);
  }
}

// sheet_to_json result
const rows = XLSX.utils.sheet_to_json(ws);
const first = rows[0];
console.log('\n--- sheet_to_json first row ---');
for (const k of Object.keys(first)) {
  if (String(k).toLowerCase().includes('dat')) {
    const v = first[k];
    console.log(`key="${k}" type=${typeof v} isDate=${v instanceof Date} raw=${JSON.stringify(v)}`);
    if (v instanceof Date) {
      console.log('  LOCAL =>', v.getFullYear()+'-'+(v.getMonth()+1)+'-'+v.getDate());
      console.log('  UTC   =>', v.getUTCFullYear()+'-'+(v.getUTCMonth()+1)+'-'+v.getUTCDate());
    }
  }
}
