import React, { useState } from 'react';
import { X, FileSpreadsheet, Download, UploadCloud, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function GuardImportModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setReport(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an Excel (.xlsx or .csv) file to import.');
      return;
    }

    setUploading(true);
    setError('');
    setReport(null);

    try {
      const res = await api.importGuardsBulk(file);
      if (res.success) {
        setReport(res.report);
        if (onSuccess) onSuccess();
      } else {
        setError(res.message || 'Import failed.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during file upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const token = localStorage.getItem('guard_access_token');
    window.location.href = `/api/guards/import/template?token=${token}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Bulk Guard Import (Excel)</h3>
              <p className="text-xs text-slate-400">Import guard roster directly from Excel file</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Step 1: Download Template */}
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white">1. Download Sample Excel Template</div>
              <div className="text-[11px] text-slate-400">Includes correct column headers and formatted sample rows.</div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" /> Download Template
            </button>
          </div>

          {/* Step 2: Upload Excel File */}
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">2. Upload Filled Guard Excel File (.xlsx / .csv)</label>
              <div className="border-2 border-dashed border-slate-700 hover:border-sky-500/60 rounded-2xl p-6 text-center bg-slate-800/30 transition-colors">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="guard-file-input"
                />
                <label htmlFor="guard-file-input" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                  <UploadCloud className="w-10 h-10 text-sky-400" />
                  <span className="text-xs text-slate-300 font-medium">
                    {file ? file.name : 'Click to browse or drop Guard Excel file here'}
                  </span>
                  <span className="text-[10px] text-slate-500">Supports .xlsx, .xls, .csv up to 10MB</span>
                </label>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!report && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className={`px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg flex items-center gap-2 ${
                    uploading || !file
                      ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                      : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500'
                  }`}
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Processing Import...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" /> Import Guard Roster
                    </>
                  )}
                </button>
              </div>
            )}
          </form>

          {/* Structured Import Report */}
          {report && (
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div className="text-xs font-bold text-white flex items-center justify-between">
                <span>Import Summary Report</span>
                <span className="text-slate-400 font-normal">Total Rows Processed: {report.totalRows}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-lg font-bold text-emerald-400">{report.successCount}</div>
                    <div className="text-[11px] text-slate-300">Successfully Imported</div>
                  </div>
                </div>

                <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-center space-x-3">
                  <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
                  <div>
                    <div className="text-lg font-bold text-rose-400">{report.failedCount}</div>
                    <div className="text-[11px] text-slate-300">Errors / Failed Rows</div>
                  </div>
                </div>
              </div>

              {/* Detailed Error Table if any */}
              {report.errors && report.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-rose-400">Failed Rows Details (Please fix in Excel & re-upload)</div>
                  <div className="border border-slate-700/60 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800 text-slate-400 font-semibold sticky top-0">
                        <tr>
                          <th className="p-2 border-b border-slate-700">Row #</th>
                          <th className="p-2 border-b border-slate-700">Guard Name</th>
                          <th className="p-2 border-b border-slate-700">Failure Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {report.errors.map((errItem, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="p-2 font-mono text-slate-400">{errItem.row}</td>
                            <td className="p-2 font-medium text-white">{errItem.name}</td>
                            <td className="p-2 text-rose-400">{errItem.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
}
