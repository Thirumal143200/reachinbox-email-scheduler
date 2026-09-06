import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

interface FileUploadProps {
  onEmailsParsed: (emails: string[]) => void;
  parsedEmails: string[];
}

export const FileUpload: React.FC<FileUploadProps> = ({ onEmailsParsed, parsedEmails }) => {
  const [dragOver, setDragOver] = useState(false);
  const [stats, setStats] = useState<{ total: number; valid: number; invalid: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processText = (text: string) => {
    // Split by newlines, commas, semicolons, or tabs
    const tokens = text
      .split(/[\r\n,;\t]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    let valid: string[] = [];
    let invalidCount = 0;
    const seen = new Set<string>();

    for (const token of tokens) {
      // Clean quotes or surrounding characters
      const clean = token.replace(/['"]+/g, '').trim();
      if (EMAIL_REGEX.test(clean)) {
        const lower = clean.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          valid.push(lower);
        }
      } else {
        invalidCount++;
      }
    }

    setStats({
      total: tokens.length,
      valid: valid.length,
      invalid: invalidCount,
    });

    onEmailsParsed(valid);
  };

  const handleFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        processText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const clearUploaded = () => {
    setStats(null);
    onEmailsParsed([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
        Recipients (CSV or TXT Lead Upload)
      </label>

      {/* Drag & Drop Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          accept=".csv,.txt"
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <UploadCloud className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-gray-700">
            <span className="text-blue-600 font-semibold">Click to upload</span> or drag and drop CSV / TXT
          </p>
          <p className="text-[11px] text-gray-400">Supports standard CSV or list of comma/newline-separated emails</p>
        </div>
      </div>

      {/* Parsing Stats Banner */}
      {stats && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200/80 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{stats.valid} Valid Emails</span>
            </div>
            {stats.invalid > 0 && (
              <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>{stats.invalid} Invalid / Skipped</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={clearUploaded}
            className="flex items-center gap-1 text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      )}

      {/* Preview Tags */}
      {parsedEmails.length > 0 && (
        <div className="max-h-24 overflow-y-auto p-2 bg-white border border-gray-200 rounded-lg flex flex-wrap gap-1.5">
          {parsedEmails.slice(0, 30).map((email, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] border border-blue-200/60"
            >
              <FileText className="w-2.5 h-2.5" />
              {email}
            </span>
          ))}
          {parsedEmails.length > 30 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px] font-medium">
              +{parsedEmails.length - 30} more
            </span>
          )}
        </div>
      )}
    </div>
  );
};
