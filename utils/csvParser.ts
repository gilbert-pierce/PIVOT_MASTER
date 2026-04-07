import { DataRecord } from '../types';
import Papa from 'papaparse';
import jschardet from 'jschardet';

export const parseCSV = async (file: File): Promise<DataRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read file'));
        return;
      }
      
      // Detect encoding
      const detected = jschardet.detect(result);
      let encoding = detected.encoding || 'utf-8';
      
      // Common fallback for Chinese Windows environments
      if (encoding.toLowerCase() === 'windows-1252' || encoding.toLowerCase() === 'ascii') {
        encoding = 'GB18030';
      }

      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        encoding: encoding,
        complete: (results) => {
          resolve(results.data as DataRecord[]);
        },
        error: (error) => {
          reject(error);
        }
      });
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    // Read the first 100KB to detect encoding
    const blob = file.slice(0, 1024 * 100);
    reader.readAsBinaryString(blob);
  });
};