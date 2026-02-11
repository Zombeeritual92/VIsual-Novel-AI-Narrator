export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnalysisResult {
  text: string;
  character: string;
  emotion: string;
  translation?: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'ai';
  message: string;
}

export enum ProcessingState {
  IDLE = 'IDLE',
  CAPTURING = 'CAPTURING',
  ANALYZING = 'ANALYZING',
  SPEAKING = 'SPEAKING',
}