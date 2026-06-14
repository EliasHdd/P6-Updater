import { ProcessingStep } from './types';

export const PROCESSING_STEPS: ProcessingStep[] = [
  {
    id: 1,
    label: 'Source Scanning',
    description: 'Scanning directory and detecting workbooks for Source A/B content mapping.',
    status: 'pending',
    durationMs: 1200
  },
  {
    id: 2,
    label: 'Excel Parsing',
    description: 'Loading excel worksheets, converting tables into internal structured activities.',
    status: 'pending',
    durationMs: 1500
  },
  {
    id: 3,
    label: 'Integrity Check',
    description: 'Verifying Primavera P6 activity IDs matches and validating dates range.',
    status: 'pending',
    durationMs: 1800
  },
  {
    id: 4,
    label: 'Conflict Detection',
    description: 'Running comparative physical percent rules & actual start/finish state checks.',
    status: 'pending',
    durationMs: 1600
  },
  {
    id: 5,
    label: 'File Generation',
    description: 'Writing review workbook, P6 import copy and updated tasks log.',
    status: 'pending',
    durationMs: 1400
  }
];
