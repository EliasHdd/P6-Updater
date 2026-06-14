import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Play, 
  Zap, 
  FileCheck 
} from 'lucide-react';
import { ProcessingStep } from '../types';

interface SimulationProgressProps {
  steps: ProcessingStep[];
  progressPercent: number;
  currentStepId: number;
  logs: string[];
  appliedCount: number;
  conflictsCount: number;
  isCompleted: boolean;
  onCancel: () => void;
}

export function SimulationProgress({
  steps,
  progressPercent,
  currentStepId,
  logs,
  appliedCount,
  conflictsCount,
  isCompleted,
  onCancel
}: SimulationProgressProps) {
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto scroll terminal logs
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-white border border-[#E5E5E7] rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.02)] space-y-6">
      {/* Upper Status Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCompleted ? 'bg-black' : 'bg-gray-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isCompleted ? 'bg-black' : 'bg-black'}`}></span>
            </span>
            <span className="text-xs font-bold text-[#86868B] uppercase tracking-widest font-mono">
              {isCompleted ? 'TRAITEMENT COMPLET' : 'MOTEUR DE SYNCHRONISATION EN COURS'}
            </span>
          </div>
          <h3 className="font-extrabold text-[#1D1D1F] tracking-tight text-xl">
            {isCompleted ? 'Mise à jour Primavera effectuée !' : 'Exécution de la mise à jour...'}
          </h3>
        </div>

        {!isCompleted && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 bg-[#F5F5F7] text-[#1D1D1F] hover:bg-black hover:text-white border border-[#E5E5E7] hover:border-black rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-95"
          >
            Interrompre
          </button>
        )}
      </div>

      {/* Main minimal progress bar line */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-black">
            {isCompleted ? '100% Terminée' : `Progression : ${progressPercent}%`}
          </span>
          <span className="text-[11px] font-mono font-medium text-[#86868B]">
            {appliedCount} Lignes Appliquées • {conflictsCount} Conflits Gérés
          </span>
        </div>

        <div className="h-2.5 w-full bg-[#F5F5F7] rounded-full overflow-hidden border border-[#E5E5E7] p-0.5">
          <motion.div
            className="h-full rounded-full bg-black"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'tween', ease: 'easeInOut' }}
          />
        </div>
      </div>

      {/* Grid containing steps list and terminal console logs side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
        
        {/* Step checklist - 5 cols */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-3.5">
          <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider">
            ÉTAPES DE TRAITEMENT
          </div>

          <div className="space-y-2">
            {steps.map((step) => {
              const isActive = step.id === currentStepId;
              const isDone = step.status === 'completed';
              
              return (
                <div
                  key={step.id}
                  className={`flex items-start p-3.5 rounded-xl border transition-all duration-300 ${
                    isActive 
                      ? 'bg-[#F5F5F7] border-black shadow-[0_2px_8px_rgba(0,0,0,0.03)]' 
                      : isDone
                      ? 'bg-white border-[#E5E5E7]'
                      : 'bg-white/50 border-transparent opacity-65'
                  }`}
                >
                  <div className="mt-0.5 mr-3 flex-shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-black" />
                    ) : isActive ? (
                      <RefreshCw className="w-4 h-4 text-black animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-[10px] font-semibold text-gray-450 font-mono">
                        {step.id}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold leading-none ${
                        isActive ? 'text-black font-bold' : isDone ? 'text-black font-medium' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </span>
                      {isDone && (
                        <span className="text-[10px] font-mono text-black font-medium bg-[#F5F5F7] border border-[#E5E5E7] px-1.5 rounded">
                          {step.durationMs}ms
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#86868B] mt-1 leading-relaxed line-clamp-2">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Console / Terminal logs - 7 cols */}
        <div className="lg:col-span-12 xl:col-span-7 flex flex-col space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-black" />
              Journal Système en Temps Réel
            </div>
            <span className="text-[10px] text-[#86868B] font-mono flex items-center gap-1">
              <Cpu className="w-3 h-3 text-black" /> p6_engine.logs
            </span>
          </div>

          <div
            ref={terminalRef}
            className="flex-1 min-h-[240px] max-h-[290px] border border-[#E5E5E7] rounded-3xl p-5 font-mono text-[11px] text-[#F5F5F7] bg-[#1D1D1F] overflow-y-auto space-y-1.5 shadow-inner"
          >
            <AnimatePresence mode="popLayout">
              {logs.map((log, i) => {
                const isConflict = log.includes('Conflict') || log.includes('conflict') || log.includes('critical');
                const isFinal = log.includes('Operations complete');
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`leading-relaxed whitespace-pre-wrap ${
                      isConflict 
                        ? 'text-amber-400 font-semibold' 
                        : isFinal
                        ? 'text-[#F5F5F7] font-semibold flex items-center gap-1 underline decoration-white decoration-2'
                        : 'text-gray-300'
                    }`}
                  >
                    {isFinal && <Zap className="w-3.5 h-3.5 flex-shrink-0 text-white animate-bounce" />}
                    {log}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
