import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  AlertTriangle, 
  Clock, 
  Download, 
  ClipboardCheck, 
  Terminal, 
  FileText, 
  ExternalLink,
  Layers,
  Sparkles,
  Info,
  CalendarDays,
  CheckCircle,
  Copy,
  ChevronDown
} from 'lucide-react';
import { RunSummaryState, ConflictItem, OutputFile } from '../types';

interface RunSummaryAndFilesProps {
  summary: RunSummaryState;
  onDownloadFile: (fileName: string) => void;
}

export function RunSummaryAndFiles({
  summary,
  onDownloadFile
}: RunSummaryAndFilesProps) {
  const [activeTab, setActiveTab] = useState<'conflicts' | 'files' | 'logs'>('conflicts');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning'>('all');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const currentConflicts = summary.conflictsList.filter(item => {
    if (severityFilter === 'all') return true;
    return item.severity === severityFilter;
  });

  const handleCopyLogs = () => {
    const textToCopy = summary.executionLogs.join('\n');
    navigator.clipboard.writeText(textToCopy);
    triggerToast('Journal des logs copié dans le presse-papiers !');
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl border border-slate-800 flex items-center space-x-2.5"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="bg-white border border-[#E5E5E7] rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.02)] relative overflow-hidden">
        
        {!summary.hasRun ? (
          /* Empty / Instructions State */
          <div className="flex flex-col items-center justify-center text-center py-12 px-4 space-y-6">
            <div className="relative">
              <div className="relative p-5 bg-[#F5F5F7] border border-[#E5E5E7] rounded-2xl text-black">
                <Layers className="w-8 h-8 text-black" />
              </div>
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="text-base font-extrabold text-[#1D1D1F] tracking-tight">
                Aucune mise à jour exécutée
              </h3>
              <p className="text-xs text-[#86868B] leading-relaxed">
                Utilisez le panneau de gauche pour configurer vos classeurs sources, puis cliquez sur <strong>Run Update</strong> pour lancer la réconciliation Primavera P6.
              </p>
            </div>

            <div className="w-full max-w-sm border border-[#E5E5E7] rounded-2xl p-4 bg-[#F5F5F7] space-y-3.5 text-left">
              <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-black" /> Guide de traitement
              </div>
              <ul className="space-y-2 text-xs text-black font-medium">
                <li className="flex items-start">
                  <span className="text-black mr-2 font-bold">•</span>
                  <span><strong>Calcul comparatif:</strong> Compare dynamiquement les avancements externes et l'état Primavera.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-black mr-2 font-bold">•</span>
                  <span><strong>Résolution des conflits:</strong> Isole et signale les incohérences de dates ou de pourcentages.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-black mr-2 font-bold">•</span>
                  <span><strong>Staging Primavera:</strong> Structure automatiquement le fichier d'import .xlsx prêt à charger.</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          /* Run Summary Results Active State */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#F0F0F2] pb-5">
              <div className="space-y-1">
                <h3 className="font-extrabold text-[#1D1D1F] tracking-tight text-base flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-black" /> Tableau de Réconciliation/Aperçu
                </h3>
                <p className="text-xs text-[#86868B] flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-black" /> Exécuté à {summary.timestamp}
                </p>
              </div>

              {/* Tabs list */}
              <div className="flex bg-[#F5F5F7] p-1 rounded-full border border-[#E5E5E7] self-end md:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('conflicts')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                    activeTab === 'conflicts'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  Conflits ({summary.conflictsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('files')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                    activeTab === 'files'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  Fichiers Générés ({summary.outputFilesList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('logs')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                    activeTab === 'logs'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  Logs
                </button>
              </div>
            </div>

            {/* Tab 1: Conflicts Viewer */}
            {activeTab === 'conflicts' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs text-[#86868B] font-medium leading-normal max-w-lg">
                    Veuillez valider les désaccords entre les relevés externes et Primavera P6.
                  </span>
                  
                  {/* Filter pills */}
                  <div className="flex bg-[#F5F5F7] p-0.5 rounded-full border border-[#E5E5E7] text-[10px] w-max self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSeverityFilter('all')}
                      className={`px-3 py-1 rounded-full font-semibold cursor-pointer transition-all ${
                        severityFilter === 'all' ? 'bg-black text-white shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
                      }`}
                    >
                      Tout
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeverityFilter('critical')}
                      className={`px-3 py-1 rounded-full font-semibold cursor-pointer transition-all ${
                        severityFilter === 'critical' ? 'bg-black text-white shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
                      }`}
                    >
                      Crédibles/Critiques
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeverityFilter('warning')}
                      className={`px-3 py-1 rounded-full font-semibold cursor-pointer transition-all ${
                        severityFilter === 'warning' ? 'bg-black text-white shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
                      }`}
                    >
                      Avertissements
                    </button>
                  </div>
                </div>

                <div className="border border-[#E5E5E7] rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto mx-px">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F5F5F7] text-[#1D1D1F] font-bold uppercase tracking-wider text-[10px] border-b border-[#E5E5E7]">
                          <th className="py-3 px-4">Tâche / ID</th>
                          <th className="py-3 px-4">Champ Analysé</th>
                          <th className="py-3 px-4">Primavera P6</th>
                          <th className="py-3 px-4">Import Relevé</th>
                          <th className="py-3 px-4 text-center">Gravité</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0F0F2] text-[#1D1D1F] font-medium">
                        {currentConflicts.map((conflict) => (
                          <tr key={conflict.id} className="hover:bg-[#F9F9FB] transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-mono text-[#1D1D1F] font-semibold flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${conflict.source === 'Source A' ? 'bg-black' : 'bg-gray-450'}`} />
                                {conflict.activityId}
                              </div>
                              <div className="text-[10px] text-[#86868B] truncate max-w-[180px]">
                                {conflict.activityName}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-gray-600 font-mono text-[11px]">{conflict.field}</td>
                            <td className="py-3.5 px-4 text-[#86868B] font-mono">{conflict.p6Value}</td>
                            <td className="py-3.5 px-4 font-mono">
                              <span className="text-black bg-[#F5F5F7] border border-[#E5E5E7] px-2 py-0.5 rounded text-[11px] font-semibold">
                                {conflict.importedValue}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase font-bold leading-none border ${
                                conflict.severity === 'critical'
                                  ? 'bg-black text-white border-black'
                                  : 'bg-[#F5F5F7] text-[#1D1D1F] border-[#E5E5E7]'
                              }`}>
                                {conflict.severity === 'critical' ? 'Critique' : 'Moyen'}
                              </span>
                            </td>
                          </tr>
                        ))}

                        {currentConflicts.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-[#86868B]">
                              Aucun conflit ne correspond au filtre.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Generated Files Table */}
            {activeTab === 'files' && (
              <div className="space-y-4">
                <p className="text-xs text-[#86868B] font-medium leading-none">
                  Les rapports formatés sont enregistrés dans le répertoire de sortie. Cliquez pour télécharger une copie.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {summary.outputFilesList.map((file) => (
                    <div 
                      key={file.id}
                      className="border border-[#E5E5E7] rounded-[24px] p-5 bg-white hover:border-black transition-all flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="p-2.5 bg-[#F5F5F7] text-black border border-[#E5E5E7] rounded-xl transition-colors">
                            {file.type === 'log' ? <FileText className="w-5 h-5 text-black" /> : <FileSpreadsheet className="w-5 h-5 text-black" />}
                          </div>
                          
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5E7]">
                            {file.type}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h5 className="font-mono text-xs text-[#1D1D1F] font-semibold truncate">
                            {file.name}
                          </h5>
                          <p className="text-[10px] text-[#86868B] truncate font-mono select-all">
                            {file.path}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[#F0F0F2] text-[10px] font-mono text-[#86868B]">
                        <span>{file.sizeKB} KB • {file.recordsCount} lignes</span>
                        
                        <button
                          type="button"
                          onClick={() => {
                            onDownloadFile(file.name);
                            triggerToast(`Téléchargement de ${file.name} initié !`);
                          }}
                          className="p-1.5 bg-black text-white hover:opacity-90 rounded-lg transition-all cursor-pointer"
                          title="Télécharger"
                        >
                          <Download className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Detailed Console logs */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs text-[#86868B] font-medium leading-relaxed">
                    Consultez l'historique complet imprimé lors de la compilation de réconciliation.
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyLogs}
                    className="px-4 py-2 bg-white border border-[#E5E5E7] hover:bg-[#F5F5F7] rounded-full text-xs font-semibold text-[#1D1D1F] flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-black" />
                    Copier les logs
                  </button>
                </div>

                <div className="bg-[#1D1D1F] border border-[#E5E5E7] rounded-3xl p-5 font-mono text-xs text-[#F5F5F7] max-h-[250px] overflow-y-auto space-y-1.5 shadow-inner">
                  {summary.executionLogs.map((log, i) => (
                    <div key={i} className="leading-relaxed whitespace-pre-wrap">{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
