import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  RefreshCw,
  FolderCheck,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { WorkbookInput } from './components/WorkbookInput';
import { DatePicker } from './components/DatePicker';
import { SimulationProgress } from './components/SimulationProgress';
import { RunSummaryAndFiles } from './components/RunSummaryAndFiles';
import { PROCESSING_STEPS } from './data';
import { RunSummaryState, ProcessingStep, SuggestionFile, WorkbookType } from './types';

interface SuggestionsMap {
  P6: SuggestionFile[];
  SPIE: SuggestionFile[];
  GCC: SuggestionFile[];
}

export default function App() {
  // Workbook inputs
  const [p6Path, setP6Path] = useState<string>('');
  const [spiePath, setSpiePath] = useState<string>('');
  const [gccPath, setGccPath] = useState<string>('');

  // Raw file state handles (upload direct depuis le navigateur)
  const [p6File, setP6File] = useState<File | null>(null);
  const [spieFile, setSpieFile] = useState<File | null>(null);
  const [gccFile, setGccFile] = useState<File | null>(null);

  // Suggestions réelles détectées par le serveur local
  const [suggestions, setSuggestions] = useState<SuggestionsMap>({ P6: [], SPIE: [], GCC: [] });

  // Parameters
  const [startDate, setStartDate] = useState<string>('');
  const [finishDate, setFinishDate] = useState<string>('');
  const [outputFolder, setOutputFolder] = useState<string>('');

  // Simulation Running State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentStepId, setCurrentStepId] = useState<number>(1);
  const [steps, setSteps] = useState<ProcessingStep[]>(PROCESSING_STEPS);
  const [logs, setLogs] = useState<string[]>([]);

  // Real-time animated counters during progress
  const [appliedCount, setAppliedCount] = useState<number>(0);
  const [conflictsCount, setConflictsCount] = useState<number>(0);

  // App-level stats
  const [savedSummary, setSavedSummary] = useState<RunSummaryState>({
    hasRun: false,
    timestamp: '',
    appliedCount: 0,
    conflictsCount: 0,
    outputFilesCount: 0,
    conflictsList: [],
    outputFilesList: [],
    executionLogs: []
  });

  // Au démarrage : récupère suggestions de fichiers, dossier de sortie et semaine courante
  useEffect(() => {
    fetch('/api/suggestions')
      .then(res => res.json())
      .then(data => {
        setSuggestions(data.suggestions);
        setP6Path(data.defaults.p6 || '');
        setSpiePath(data.defaults.spie || '');
        setGccPath(data.defaults.gcc || '');
        setOutputFolder(data.defaults.outputDir || '');
        setStartDate(data.defaults.weekStart || '');
        setFinishDate(data.defaults.weekFinish || '');
      })
      .catch(() => {
        // Serveur local indisponible : champs laissés vides
      });
  }, []);

  const handleWorkbookChange = (type: WorkbookType, path: string, _fileName?: string, _sizeMB?: number, file?: File) => {
    if (type === 'P6') {
      setP6Path(path);
      setP6File(file || null);
    } else if (type === 'SPIE') {
      setSpiePath(path);
      setSpieFile(file || null);
    } else if (type === 'GCC') {
      setGccPath(path);
      setGccFile(file || null);
    }
  };

  const handleClearWorkbook = (type: WorkbookType) => {
    if (type === 'P6') {
      setP6Path('');
      setP6File(null);
    } else if (type === 'SPIE') {
      setSpiePath('');
      setSpieFile(null);
    } else if (type === 'GCC') {
      setGccPath('');
      setGccFile(null);
    }
  };

  // Start the update run by submitting data to the local Python engine
  const handleRunUpdate = () => {
    if (!p6Path && !p6File) {
      alert('Erreur : sélectionnez un classeur maître Primavera P6 avant d\'exécuter la mise à jour.');
      return;
    }
    if (!spiePath && !spieFile && !gccPath && !gccFile) {
      alert('Erreur : sélectionnez au moins un classeur de mise à jour (Source A ou Source B).');
      return;
    }

    setIsRunning(true);
    setIsCompleted(false);
    setProgressPercent(0);
    setCurrentStepId(1);
    setAppliedCount(0);
    setConflictsCount(0);

    // Initialize clean steps
    const resetSteps = PROCESSING_STEPS.map(s => ({ ...s, status: 'pending' as const }));
    setSteps(resetSteps);

    // Initial log
    const now = new Date();
    const timeStr = now.toLocaleTimeString();

    const initialLogs = [
      `[${timeStr}] === DÉMARRAGE DU MOTEUR P6 PROGRESS UPDATER ===`,
      `[${timeStr}] Répertoire de travail : ${outputFolder}`,
      `[${timeStr}] Date début : ${startDate} | Date fin : ${finishDate}`,
      `[${timeStr}] Envoi de la demande au moteur Python local...`
    ];
    setLogs(initialLogs);

    // Formulate multipart payload : fichiers uploadés ou chemins locaux
    const formData = new FormData();
    if (p6File) formData.append('p6File', p6File);
    else formData.append('p6Path', p6Path);
    if (spieFile) formData.append('spieFile', spieFile);
    else if (spiePath) formData.append('spiePath', spiePath);
    if (gccFile) formData.append('gccFile', gccFile);
    else if (gccPath) formData.append('gccPath', gccPath);

    formData.append('startDate', startDate);
    formData.append('finishDate', finishDate);
    formData.append('outputFolder', outputFolder);

    let currentPercent = 0;
    let serverDone = false;
    let serverResponse: any = null;
    let serverError: any = null;
    let activeLogs = [...initialLogs];

    // Smoothly animate the workflow stages
    const progressInterval = setInterval(() => {
      if (currentPercent < 90) {
        currentPercent += 2;
        setProgressPercent(currentPercent);
      }

      const timestamp = new Date().toLocaleTimeString();

      if (currentPercent === 10) {
        setSteps(prev => prev.map((s, idx) => idx === 0 ? { ...s, status: 'running' } : s));
        activeLogs.push(`[${timestamp}] [SCAN] Alignement et vérification des classeurs de mise à jour...`);
        setLogs([...activeLogs]);
      } else if (currentPercent === 24) {
        setSteps(prev => prev.map((s, idx) => {
          if (idx === 0) return { ...s, status: 'completed' };
          if (idx === 1) return { ...s, status: 'running' };
          return s;
        }));
        setCurrentStepId(2);
        activeLogs.push(`[${timestamp}] [PARSE] Analyse syntaxique du fichier des activités P6...`);
        setLogs([...activeLogs]);
      } else if (currentPercent === 46) {
        setSteps(prev => prev.map((s, idx) => {
          if (idx === 1) return { ...s, status: 'completed' };
          if (idx === 2) return { ...s, status: 'running' };
          return s;
        }));
        setCurrentStepId(3);
        activeLogs.push(`[${timestamp}] [INTEGRITY] Validation des Activity ID et de la cohérence globale...`);
        setLogs([...activeLogs]);
      } else if (currentPercent === 66) {
        setSteps(prev => prev.map((s, idx) => {
          if (idx === 2) return { ...s, status: 'completed' };
          if (idx === 3) return { ...s, status: 'running' };
          return s;
        }));
        setCurrentStepId(4);
        activeLogs.push(`[${timestamp}] [CONFLICT] Arbitrage : application de la règle du pourcentage physique le plus élevé...`);
        setLogs([...activeLogs]);
      } else if (currentPercent === 86) {
        setSteps(prev => prev.map((s, idx) => {
          if (idx === 3) return { ...s, status: 'completed' };
          if (idx === 4) return { ...s, status: 'running' };
          return s;
        }));
        setCurrentStepId(5);
        activeLogs.push(`[${timestamp}] [GEN] Écriture des fichiers REVIEW, P6_IMPORT et LOG...`);
        setLogs([...activeLogs]);
      }

      // Complete once server responds and progress reached at least 90
      if (serverDone && currentPercent >= 90) {
        clearInterval(progressInterval);
        setProgressPercent(100);

        if (serverError) {
          setIsRunning(false);
          alert(`Traitement échoué : ${serverError}`);
          activeLogs.push(`[ERREUR] ${serverError}`);
          setLogs([...activeLogs]);
          return;
        }

        const data = serverResponse;
        setSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
        setIsCompleted(true);
        setAppliedCount(data.summary.appliedCount);
        setConflictsCount(data.summary.conflictsCount);

        const endTimestamp = new Date().toLocaleTimeString();
        activeLogs.push(`[${endTimestamp}] [COMPLETED] Synthèse terminée.`);
        if (data.summary.executionLogs) {
          activeLogs.push("=== JOURNAL DU MOTEUR PYTHON ===");
          activeLogs.push(...data.summary.executionLogs);
        }
        setLogs([...activeLogs]);

        setTimeout(() => {
          const runDateStr = new Date().toLocaleString();
          setSavedSummary({
            hasRun: true,
            timestamp: runDateStr,
            appliedCount: data.summary.appliedCount,
            conflictsCount: data.summary.conflictsCount,
            outputFilesCount: data.summary.outputFilesCount,
            conflictsList: data.summary.conflictsList,
            outputFilesList: data.summary.outputFilesList,
            executionLogs: activeLogs
          });
          setIsRunning(false);
        }, 800);
      }
    }, 80);

    // Fire API request
    fetch('/api/run-update', {
      method: 'POST',
      body: formData
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(errData => {
            throw new Error(errData.error || `Erreur d'exécution serveur (Code: ${res.status})`);
          });
        }
        return res.json();
      })
      .then(data => {
        serverResponse = data;
        serverDone = true;
      })
      .catch(err => {
        serverError = err.message || String(err);
        serverDone = true;
      });
  };

  const handleCancelUpdate = () => {
    setIsRunning(false);
    setIsCompleted(false);
    setProgressPercent(0);
    setLogs(prev => [...prev, `[INFO] Opération annulée par l'utilisateur.`]);
  };

  // Real downloader triggering router download API
  const handleDownloadFile = (fileName: string) => {
    window.open(`/api/download?file=${encodeURIComponent(fileName)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#F9F9FB] text-[#1D1D1F] antialiased font-sans pb-16">

      {/* High-end Minimalist Top Line Accent */}
      <div className="h-[2px] w-full bg-black/95" />

      {/* Main Orchestrator Canvas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-10">

        {/* Luxury Top Header Panel */}
        <header className="bg-white border border-[#E5E5E7] rounded-[32px] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-4 flex-1 relative z-10">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-[#F5F5F7] border border-[#E5E5E7] rounded-md text-[10px] font-bold tracking-wider uppercase text-[#1D1D1F]">
                MODE SÉCURISÉ ACTIF
              </span>
              <span className="text-xs text-[#86868B] font-mono">v5.0 Web UI</span>
            </div>

            <h1 className="font-semibold text-3xl tracking-tight text-[#1D1D1F] leading-tight">
              P6 Weekly Progress Updater
            </h1>
            <p className="text-sm text-[#86868B] max-w-2xl leading-relaxed">
              Réconciliation et consolidation des avancements physiques externes avec Primavera P6. Règle active : le pourcentage le plus haut gagne, et le master est conservé s'il est déjà au-dessus.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2.5 flex-shrink-0 self-start md:self-auto">
            <button
              type="button"
              disabled={isRunning}
              onClick={handleRunUpdate}
              className={`w-full md:w-auto px-8 py-3.5 rounded-full font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:opacity-90 transform active:scale-98 cursor-pointer ${
                isRunning
                  ? 'bg-gray-150 text-[#86868B] border border-[#E5E5E7] pointer-events-none cursor-not-allowed'
                  : 'bg-black text-white border border-transparent'
              }`}
              id="run-update-button"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run Update
                </>
              )}
            </button>
            <span className="text-[10px] text-[#86868B] font-mono tracking-wide mr-2">
              Moteur Python réel — sorties REVIEW / P6_IMPORT / LOG
            </span>
          </div>
        </header>

        {/* Dashboard Core Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT SIDEBAR: Source File Inputs and Configurations (5 columns) */}
          <section className="lg:col-span-5 space-y-8">
            <div className="bg-white border border-[#E5E5E7] rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.02)] space-y-8">
              <div className="space-y-2 pb-5 border-b border-[#F0F0F2]">
                <h3 className="text-xs font-semibold text-[#1D1D1F] tracking-wider uppercase">
                  Source Workbooks
                </h3>
                <p className="text-xs text-[#86868B] leading-relaxed">
                  Associez le fichier maître export Primavera P6 avec un ou deux classeurs de mise à jour externes.
                </p>
              </div>

              {/* Master P6 Input */}
              <WorkbookInput
                type="P6"
                label="Primavera Master Workbook"
                description="Export Primavera P6 (feuille TASK, en-têtes internes task_code / user_field_212)."
                required
                valuePath={p6Path}
                suggestions={suggestions.P6}
                onChangePath={(path, name, size, file) => handleWorkbookChange('P6', path, name, size, file)}
                onClear={() => handleClearWorkbook('P6')}
              />

              {/* Source A Workbook */}
              <WorkbookInput
                type="SPIE"
                label="Source A Workbook (Optionnel)"
                description="Premier classeur d'avancement — colonnes Activity ID et This Week's % Complete."
                valuePath={spiePath}
                suggestions={suggestions.SPIE}
                onChangePath={(path, name, size, file) => handleWorkbookChange('SPIE', path, name, size, file)}
                onClear={() => handleClearWorkbook('SPIE')}
              />

              {/* Source B Workbook */}
              <WorkbookInput
                type="GCC"
                label="Source B Workbook (Optionnel)"
                description="Deuxième classeur d'avancement — mêmes colonnes attendues."
                valuePath={gccPath}
                suggestions={suggestions.GCC}
                onChangePath={(path, name, size, file) => handleWorkbookChange('GCC', path, name, size, file)}
                onClear={() => handleClearWorkbook('GCC')}
              />
            </div>

            {/* Date Selection and Folder Reception */}
            <DatePicker
              startDate={startDate}
              onChangeStartDate={setStartDate}
              finishDate={finishDate}
              onChangeFinishDate={setFinishDate}
              outputFolder={outputFolder}
              onChangeOutputFolder={setOutputFolder}
            />
          </section>

          {/* RIGHT VIEWPORTS: Execution Progress state & summary outcomes (7 columns) */}
          <section className="lg:col-span-7 space-y-8">

            {/* Real-time stats cards bar */}
            <div className="grid grid-cols-3 gap-4">

              {/* Stat Card 1: Applied Rows */}
              <div className="bg-white border border-[#E5E5E7] p-6 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.01)] hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group">
                <div className="space-y-1 relative z-10">
                  <span className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-black" /> APPLIQUÉES
                  </span>
                  <div className="text-3xl font-light text-[#1D1D1F] tracking-tight font-mono">
                    {isRunning ? appliedCount : savedSummary.appliedCount}
                  </div>
                </div>
                <div className="text-[10px] text-black font-medium bg-[#F5F5F7] border border-[#E5E5E7] px-2.5 py-1 rounded-md w-max leading-none">
                  Lignes calculées
                </div>
              </div>

              {/* Stat Card 2: Conflicts */}
              <div className="bg-white border border-[#E5E5E7] p-6 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.01)] hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group">
                <div className="space-y-1 relative z-10">
                  <span className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-black" /> CONFLITS
                  </span>
                  <div className="text-3xl font-light text-[#1D1D1F] tracking-tight font-mono">
                    {isRunning ? conflictsCount : savedSummary.conflictsCount}
                  </div>
                </div>
                <div className="text-[10px] text-[#86868B] font-medium bg-[#F5F5F7] border border-[#E5E5E7] px-2.5 py-1 rounded-md w-max leading-none">
                  Incohérences
                </div>
              </div>

              {/* Stat Card 3: Output Files */}
              <div className="bg-white border border-[#E5E5E7] p-6 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.01)] hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group">
                <div className="space-y-1 relative z-10">
                  <span className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider flex items-center gap-1.5">
                    <FolderCheck className="w-3.5 h-3.5 text-black" /> FICHIERS
                  </span>
                  <div className="text-3xl font-light text-[#1D1D1F] tracking-tight font-mono">
                    {isRunning ? (progressPercent >= 85 ? savedSummary.outputFilesCount || 3 : 0) : savedSummary.outputFilesCount}
                  </div>
                </div>
                <div className="text-[10px] text-black font-medium bg-[#F5F5F7] border border-[#E5E5E7] px-2.5 py-1 rounded-md w-max leading-none">
                  Livrables
                </div>
              </div>
            </div>

            {/* Dynamic View Toggle (Progress Bar state vs Summary Outcomes list) */}
            <div className="transition-all duration-300">
              <AnimatePresence mode="wait">
                {isRunning ? (
                  /* Interactive animated progress container toggled when running */
                  <motion.div
                    key="active-progress-section"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                  >
                    <SimulationProgress
                      steps={steps}
                      progressPercent={progressPercent}
                      currentStepId={currentStepId}
                      logs={logs}
                      appliedCount={appliedCount}
                      conflictsCount={conflictsCount}
                      isCompleted={isCompleted}
                      onCancel={handleCancelUpdate}
                    />
                  </motion.div>
                ) : (
                  /* Completed Summary View */
                  <motion.div
                    key="results-summary-section"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                  >
                    <RunSummaryAndFiles
                      summary={savedSummary}
                      onDownloadFile={handleDownloadFile}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </section>
        </div>
      </div>
    </div>
  );
}
