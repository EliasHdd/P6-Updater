import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle,
  X,
  FolderOpen,
  CornerDownRight,
  Database
} from 'lucide-react';
import { WorkbookType, SuggestionFile } from '../types';

interface WorkbookInputProps {
  type: WorkbookType;
  label: string;
  description: string;
  required?: boolean;
  valuePath: string;
  suggestions: SuggestionFile[];
  onChangePath: (path: string, fileName?: string, sizeMB?: number, file?: File) => void;
  onClear: () => void;
}

export function WorkbookInput({
  type,
  label,
  description,
  required = false,
  valuePath,
  suggestions,
  onChangePath,
  onClear
}: WorkbookInputProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getFileName = (path: string) => {
    if (!path) return '';
    const parts = path.split('\\');
    return parts[parts.length - 1];
  };

  const fileName = getFileName(valuePath);
  const sourceLabel = type === 'SPIE' ? 'SOURCE A' : type === 'GCC' ? 'SOURCE B' : 'P6';

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const sizeMB = file.size / (1024 * 1024);
      onChangePath(file.name, file.name, Number(sizeMB.toFixed(2)), file);
    }
  };

  const selectSuggestedFile = (option: SuggestionFile) => {
    onChangePath(option.path, option.name, option.sizeMB);
    setShowDropdown(false);
  };

  return (
    <div
      className="group relative flex flex-col space-y-2.5"
      id={`workbook-container-${type.toLowerCase()}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#1D1D1F] flex items-center gap-1.5">
            {label}
            {required && <span className="text-black text-xs font-bold leading-none">*</span>}
          </label>
          <span className="px-2 py-0.5 rounded-md text-[9px] font-mono leading-none font-medium tracking-wider uppercase border border-[#E5E5E7] bg-[#F5F5F7] text-[#1D1D1F]">
            {sourceLabel} ENGINE
          </span>
        </div>

        {fileName && (
          <span className="text-xs font-medium text-black flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-black" /> Sélectionné
          </span>
        )}
      </div>

      <p className="text-xs text-[#86868B] tracking-normal leading-relaxed">
        {description}
      </p>

      {/* Main Drag Drop Zone */}
      <div
        className={`relative z-10 flex flex-col rounded-2xl border transition-all duration-300 ${
          isDragActive
            ? 'border-black bg-gray-50 shadow-xs scale-[1.01]'
            : fileName
            ? 'border-[#E5E5E7] bg-white hover:bg-[#F9F9FB] hover:border-gray-300'
            : 'border-dashed border-[#E5E5E7] bg-white hover:border-black/30 hover:bg-[#F9F9FB]'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5 w-full">
            <div className={`p-2.5 rounded-xl border flex items-center justify-center transition-colors ${
              fileName
                ? 'bg-[#F5F5F7] text-black border-[#E5E5E7]'
                : 'bg-[#F9F9FB] text-gray-400 border-[#E5E5E7] group-hover:bg-[#F5F5F7]'
            }`}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              {fileName ? (
                <div className="space-y-1">
                  <div className="text-xs font-mono text-black font-semibold truncate flex items-center">
                    {fileName}
                  </div>
                  <div className="text-[10px] font-mono text-[#86868B] truncate flex items-center gap-1.5 select-all">
                    <Database className="w-3 h-3 flex-shrink-0 text-black" />
                    {valuePath}
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5 pointer-events-none">
                  <span className="text-xs font-normal text-gray-600">
                    Glissez-déposez le rapport ou{' '}
                    <span className="text-black underline font-medium cursor-pointer pointer-events-auto">parcourez vos fichiers</span>
                  </span>
                  <p className="text-[10px] font-mono text-[#86868B]">
                    Fichiers Excel (.xlsx, .xlsm) acceptés
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0 w-full md:w-auto justify-end">
            {fileName ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="p-2 rounded-xl text-gray-400 hover:text-black hover:bg-[#F5F5F7] transition-all border border-transparent hover:border-[#E5E5E7]"
                title="Conserver vide ou effacer"
                id={`clear-btn-${type.toLowerCase()}`}
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="px-4 py-2 rounded-full text-xs font-medium tracking-tight text-black bg-white border border-[#E5E5E7] shadow-sm hover:bg-[#F5F5F7] transition-all flex items-center gap-1.5 cursor-pointer"
                id={`browse-btn-${type.toLowerCase()}`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#1D1D1F]" />
                Parcourir
              </button>

              <AnimatePresence>
                {showDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowDropdown(false)}
                    />
                    <motion.div
                      ref={dropdownRef}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-2 w-80 bg-white border border-[#E5E5E7] rounded-[20px] shadow-2xl z-35 overflow-hidden focus:outline-none"
                    >
                      <div className="px-4 py-3 bg-[#F5F5F7] border-b border-[#E5E5E7] flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">
                          Auto-Détection du Dossier
                        </span>
                        <span className="text-[10px] bg-white text-black px-2 py-0.5 rounded border border-[#E5E5E7] font-mono">
                          Dossier app
                        </span>
                      </div>

                      <div className="py-1 max-h-60 overflow-y-auto">
                        <div className="px-3.5 py-1.5 text-[11px] font-semibold text-gray-400">
                          {suggestions.length > 0 ? 'Fichiers correspondants détectés :' : 'Aucun fichier détecté à côté de l\'application.'}
                        </div>
                        {suggestions.map((fileOption) => (
                          <button
                            key={fileOption.path}
                            type="button"
                            onClick={() => selectSuggestedFile(fileOption)}
                            className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors flex flex-col space-y-0.5 group/item cursor-pointer"
                          >
                            <span className="font-mono text-[#1D1D1F] group-hover/item:text-black font-medium truncate flex items-center">
                              <CornerDownRight className="w-3.5 h-3.5 mr-1 text-gray-400" />
                              {fileOption.name}
                            </span>
                            <span className="text-[10px] text-gray-400 pl-4 font-mono truncate">
                              {fileOption.sizeMB} MB • {fileOption.path}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="p-3 bg-[#F5F5F7] border-t border-[#E5E5E7] flex items-center justify-between">
                        <input
                          type="file"
                          id={`file-uploader-${type.toLowerCase()}`}
                          className="hidden"
                          accept=".xlsx,.xlsm,.xls"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              onChangePath(file.name, file.name, Number((file.size / (1024 * 1024)).toFixed(2)), file);
                            }
                            setShowDropdown(false);
                          }}
                        />
                        <label
                          htmlFor={`file-uploader-${type.toLowerCase()}`}
                          className="w-full text-center cursor-pointer py-2 bg-black text-white font-medium text-xs rounded-full shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Importer un autre fichier
                        </label>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
