import { read, utils } from 'xlsx';
import { DataRecord } from '../types';

export const parseExcel = async (file: File): Promise<DataRecord[]> => {
  try {
    const data = await file.arrayBuffer();
    const workbook = read(data);
    
    // Grab the first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = utils.sheet_to_json(worksheet) as DataRecord[];
    return jsonData;
  } catch (error) {
    console.error("Excel parsing error:", error);
    throw new Error("Failed to parse Excel file");
  }
};