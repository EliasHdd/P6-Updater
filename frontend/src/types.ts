/**
 * Types for the P6 Weekly Progress Updater
 */

export type WorkbookType = 'P6' | 'SPIE' | 'GCC';

export interface SuggestionFile {
  name: string;
  path: string;
  sizeMB: number;
}

export interface WorkbookState {
  type: WorkbookType;
  path: string;
  name: string;
  sizeMB: number;
  status: 'empty' | 'valid' | 'invalid';
  rowsCount?: number;
}

export interface ProcessingStep {
  id: number;
  label: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  durationMs: number;
}

export interface ConflictItem {
  id: string;
  activityId: string;
  activityName: string;
  field: string;
  p6Value: string;
  importedValue: string;
  source: 'Source A' | 'Source B';
  severity: 'warning' | 'critical';
}

export interface OutputFile {
  id: string;
  name: string;
  path: string;
  sizeKB: number;
  type: 'review' | 'import' | 'log';
  recordsCount: number;
}

export interface RunSummaryState {
  hasRun: boolean;
  timestamp: string;
  appliedCount: number;
  conflictsCount: number;
  outputFilesCount: number;
  conflictsList: ConflictItem[];
  outputFilesList: OutputFile[];
  executionLogs: string[];
}
