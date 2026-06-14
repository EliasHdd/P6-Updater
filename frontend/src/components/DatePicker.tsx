import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  FolderLock,
  FolderOpen,
  ChevronRight,
  Home,
  Check,
  Plus
} from 'lucide-react';

interface DatePickerProps {
  startDate: string;
  onChangeStartDate: (date: string) => void;
  finishDate: string;
  onChangeFinishDate: (date: string) => void;
  outputFolder: string;
  onChangeOutputFolder: (folder: string) => void;
}

export function DatePicker({
  startDate,
  onChangeStartDate,
  finishDate,
  onChangeFinishDate,
  outputFolder,
  onChangeOutputFolder
}: DatePickerProps) {
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [subfolders, setSubfolders] = useState<string[]>([]);
  const [browseError, setBrowseError] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState('');

  // Semaine ouvrée (lundi 09:00 -> vendredi 18:00) relative à aujourd'hui
  const handlePreset = (type: 'last' | 'this' | 'next') => {
    const offset = type === 'last' ? -7 : type === 'next' ? 7 : 0;
    const now = new Date();
    now.setDate(now.getDate() + offset);
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const fmt = (d: Date, hour: number) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(hour)}:00`;
    };
    onChangeStartDate(fmt(monday, 9));
    onChangeFinishDate(fmt(friday, 18));
  };

  // Navigation réelle dans les dossiers via le serveur local
  const browseTo = async (path: string) => {
    setBrowseError('');
    try {
      const res = await fetch('/api/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      const data = await res.json();
      if (!res.ok) {
        setBrowseError(data.error || 'Navigation impossible.');
        return;
      }
      setCurrentPath(data.path);
      setSubfolders(data.subfolders);
    } catch {
      setBrowseError('Serveur local injoignable.');
    }
  };

  const openFolderModal = () => {
    setShowFolderModal(true);
    browseTo(outputFolder || '');
  };

  const breadcrumbs = currentPath.split('\\').filter(Boolean);

  const traverseUp = (index: number) => {
    let target = breadcrumbs.slice(0, index + 1).join('\\');
    if (target.endsWith(':')) target += '\\';
    browseTo(target);
  };

  const traverseDown = (folder: string) => {
    const base = currentPath.endsWith('\\') ? currentPath : currentPath + '\\';
    browseTo(base + folder);
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name || !currentPath) return;
    const res = await fetch('/api/mkdir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentPath, name })
    });
    if (res.ok) {
      setNewFolderName('');
      browseTo(currentPath);
    }
  };

  const handleSelectFolder = () => {
    if (currentPath) {
      onChangeOutputFolder(currentPath);
    }
    setShowFolderModal(false);
  };

  return (
    <div className="bg-white border border-[#E5E5E7] rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.02)] space-y-6">
      <div className="space-y-1">
        <h3 className="text-xs font-semibold text-[#1D1D1F] tracking-wider uppercase flex items-center gap-2">
          Week & Destination
        </h3>
        <p className="text-xs text-[#86868B] leading-relaxed">
          Définissez la fenêtre de date et configurez le dossier de réception pour les rapports de revue, fichiers d'importation Primavera et fichiers de logs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Week Start */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#1D1D1F] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-black" /> Date & Heure Début
          </label>
          <div className="relative">
            <input
              type="text"
              value={startDate}
              onChange={(e) => onChangeStartDate(e.target.value)}
              placeholder="DD/MM/YYYY HH:MM"
              className="w-full px-4 py-3 rounded-xl bg-white border border-[#E5E5E7] text-xs font-mono font-medium focus:outline-none focus:border-black transition-all text-[#1D1D1F]"
            />
            <Clock className="absolute right-3.5 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Week Finish */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#1D1D1F] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-black" /> Date & Heure Fin
          </label>
          <div className="relative">
            <input
              type="text"
              value={finishDate}
              onChange={(e) => onChangeFinishDate(e.target.value)}
              placeholder="DD/MM/YYYY HH:MM"
              className="w-full px-4 py-3 rounded-xl bg-white border border-[#E5E5E7] text-xs font-mono font-medium focus:outline-none focus:border-black transition-all text-[#1D1D1F]"
            />
            <Clock className="absolute right-3.5 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Week Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider mr-1.5">Raccourcis:</span>
        <button
          type="button"
          onClick={() => handlePreset('last')}
          className="px-3 py-1 bg-[#F5F5F7] hover:bg-black hover:text-white border border-[#E5E5E7] hover:border-black rounded-lg text-xs font-medium text-[#1D1D1F] transition-all cursor-pointer"
        >
          Semaine dernière
        </button>
        <button
          type="button"
          onClick={() => handlePreset('this')}
          className="px-3 py-1 bg-[#F5F5F7] hover:bg-black hover:text-white border border-[#E5E5E7] hover:border-black rounded-lg text-xs font-medium text-[#1D1D1F] transition-all cursor-pointer"
        >
          Cette semaine
        </button>
        <button
          type="button"
          onClick={() => handlePreset('next')}
          className="px-3 py-1 bg-[#F5F5F7] hover:bg-black hover:text-white border border-[#E5E5E7] hover:border-black rounded-lg text-xs font-medium text-[#1D1D1F] transition-all cursor-pointer"
        >
          Semaine prochaine
        </button>
      </div>

      {/* Destination Folder */}
      <div className="space-y-1.5 pt-4 border-t border-[#F0F0F2]">
        <span className="text-xs font-medium text-[#1D1D1F] flex items-center justify-between">
          <span>Dossier de Sortie</span>
          <span className="text-[10px] text-[#86868B] font-mono">Dossier de production cible</span>
        </span>
        <div className="flex items-center gap-2.5">
          <div className="flex-1 relative">
            <input
              type="text"
              value={outputFolder}
              onChange={(e) => onChangeOutputFolder(e.target.value)}
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5E7] text-xs font-mono text-[#1D1D1F] focus:outline-none select-all focus:bg-white focus:border-black hover:bg-[#F0F0F2] transition-all"
            />
            <FolderLock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          </div>

          <button
            type="button"
            onClick={openFolderModal}
            className="px-4 py-3 bg-white text-black border border-[#E5E5E7] hover:bg-[#F5F5F7] rounded-xl text-xs font-medium tracking-tight shadow-sm transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
          >
            <FolderOpen className="w-4 h-4 text-[#1D1D1F]" />
            Parcourir
          </button>
        </div>
      </div>

      {/* Interactive Folder Select Dialog */}
      <AnimatePresence>
        {showFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFolderModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-[24px] overflow-hidden shadow-2xl border border-[#E5E5E7] z-10 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-[#F0F0F2] bg-[#F5F5F7]">
                <h4 className="font-semibold text-[#1D1D1F] text-sm">Sélectionner le dossier de destination</h4>
                <p className="text-xs text-[#86868B]">Naviguez dans les répertoires ou créez en un nouveau</p>
              </div>

              {/* Breadcrumbs */}
              <div className="px-6 py-3 bg-[#F9F9FB] border-b border-[#E5E5E7] flex flex-wrap items-center gap-1.5 text-[11px] font-mono font-medium text-gray-650">
                <Home className="w-3.5 h-3.5 text-black cursor-pointer hover:text-black" onClick={() => traverseUp(0)}/>
                {breadcrumbs.map((folder, index) => (
                  <React.Fragment key={folder + index}>
                    <ChevronRight className="w-3 h-3 text-gray-300" />
                    <span
                      onClick={() => traverseUp(index)}
                      className="cursor-pointer hover:text-black hover:underline px-1 py-0.5 rounded hover:bg-gray-100 transition-colors"
                    >
                      {folder}
                    </span>
                  </React.Fragment>
                ))}
              </div>

              {/* Folder list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[220px]">
                <div className="text-[10px] font-bold text-[#86868B] tracking-wider uppercase px-2 mb-1">
                  Sous-dossiers
                </div>
                {browseError && (
                  <div className="px-3 py-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl">
                    {browseError}
                  </div>
                )}
                {subfolders.map((folder) => (
                  <button
                    key={folder}
                    type="button"
                    onClick={() => traverseDown(folder)}
                    className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-[#F5F5F7] border border-transparent hover:border-[#E5E5E7] hover:shadow-xs rounded-xl flex items-center justify-between group transition-all cursor-pointer"
                  >
                    <span className="flex items-center space-x-2.5 font-medium">
                      <FolderOpen className="w-4 h-4 text-black group-hover:text-black" />
                      <span className="font-mono text-[#1D1D1F]">{folder}</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}

                {subfolders.length === 0 && !browseError && (
                  <div className="text-center py-8 text-gray-400 text-xs">
                    Aucun sous-dossier disponible.
                  </div>
                )}
              </div>

              {/* Create new folder action */}
              <div className="px-6 py-3 border-t border-[#F0F0F2] bg-[#F5F5F7] flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nouveau dossier..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="flex-1 bg-white border border-[#E5E5E7] rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-black"
                  onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                />
                <button
                  type="button"
                  onClick={createFolder}
                  className="p-1.5 bg-white border border-[#E5E5E7] text-black hover:bg-black hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Actions Footer */}
              <div className="px-6 py-4 border-t border-[#E5E5E7] flex items-center justify-between bg-white">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-5 py-2 border border-[#E5E5E7] text-[#1D1D1F] rounded-full hover:bg-[#F5F5F7] text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={handleSelectFolder}
                  className="px-6 py-2 bg-black text-white hover:opacity-90 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Sélectionner ce dossier
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
