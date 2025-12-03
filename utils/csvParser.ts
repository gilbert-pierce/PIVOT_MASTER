import { DataRecord } from '../types';

export const parseCSV = (content: string): DataRecord[] => {
  const lines = content.split(/\r\n|\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  return lines.slice(1).map(line => {
    // Handle simple quoted CSVs roughly
    const values: string[] = [];
    let current = '';
    let inQuote = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, '')); // Push last value

    const record: DataRecord = {};
    headers.forEach((h, index) => {
      const val = values[index];
      // Try to parse number
      if (val !== undefined) {
        const num = parseFloat(val);
        record[h] = !isNaN(num) && val.trim() !== '' ? num : val;
      } else {
        record[h] = null;
      }
    });
    return record;
  });
};