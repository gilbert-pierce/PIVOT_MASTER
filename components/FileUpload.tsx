import React, { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { parseCSV } from '../utils/csvParser';
import { parseExcel } from '../utils/excelParser';
import { DataRecord } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: DataRecord[], filenames: string[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    
    setLoading(true);

    // Artificial delay for better UX feel
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      let combinedData: DataRecord[] = [];
      let fileNames: string[] = [];

      for (const file of fileArray) {
        let data: DataRecord[] = [];
        if (file.name.endsWith('.csv')) {
          data = await parseCSV(file);
        } else if (file.name.endsWith('.json')) {
          const text = await file.text();
          try {
              const parsed = JSON.parse(text);
              if(Array.isArray(parsed)) {
                  data = parsed;
              } else {
                  alert(`JSON file ${file.name} must be an array of objects`);
                  continue;
              }
          } catch(e) {
              alert(`Invalid JSON file ${file.name}`);
              continue;
          }
        } else if (file.name.match(/\.xlsx?$/)) {
          try {
            const parsed = await parseExcel(file);
            if (parsed && parsed.length > 0) {
              data = parsed;
            } else {
              alert(`Excel file ${file.name} appears to be empty or invalid.`);
              continue;
            }
          } catch (err) {
            alert(`Error reading Excel file ${file.name}. Please ensure it is a valid format.`);
            continue;
          }
        } else {
            alert(`Please upload a .csv, .json, or .xlsx file. Skipped ${file.name}`);
            continue;
        }

        if (data.length > 0) {
          fileNames.push(file.name);
          const dataWithSource = data.map(row => ({
            ...row,
            __source_file: file.name
          }));
          combinedData = combinedData.concat(dataWithSource);
        }
      }

      if (combinedData.length > 0) {
        onDataLoaded(combinedData, fileNames);
      }
    } catch (error) {
      console.error(error);
      alert("An unexpected error occurred.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  return (
    <>
      <input 
        type="file" 
        multiple
        accept=".csv,.json,.xlsx,.xls" 
        className="hidden" 
        ref={inputRef} 
        onChange={handleFileChange} 
      />
      <button
        onClick={() => !loading && inputRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-md shadow-sm transition-all text-xs font-bold active:scale-95 whitespace-nowrap disabled:opacity-50 disabled:cursor-wait"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {loading ? 'Loading...' : 'Upload Files'}
      </button>
    </>
  );
};

export default FileUpload;