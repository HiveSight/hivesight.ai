import { ModelType } from './config';

export type ResponseType = 'open_ended' | 'likert';

export interface SimulationParams {
  question: string;
  responseTypes: ResponseType[];
  hiveSize: number;
  perspective: string;
  ageRange: [number, number];
  incomeRange: [number, number];
  model: ModelType;
}

export interface PersonaData {
  age: number;
  income: number;
  state: string;
}

export interface ResponseData {
  question: string;
  responses: Array<{
    perspective: string;
    age: number;
    income: number;
    state: string;
    open_ended?: string;
    likert?: number;
  }>;
}

export interface HandleSubmitParams extends SimulationParams {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setResults: (data: ResponseData | null) => void;
  setActiveStep: (step: number) => void;
}

// Database types
export interface QueryResponse {
  query_id: string;
  execution_status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface QueryParams {
  userId: string;
  itemId: string;
  model: string;
  universeId: string | null;
  hiveSize: number;
}

// ... existing types ...

// Raw Supabase response types
export interface RawSupabaseRespondent {
  PRTAGE: number;
  GESTFIPS: number;
}

export interface RawSupabaseResponse {
  response_id: string;
  response_text: string;
  respondent: {
    PRTAGE: number;
    GESTFIPS: number;
  } | null;
}

export interface SupabaseRespondent {
  PRTAGE: number;
  GESTFIPS: number;
}

export interface SupabaseResponse {
  response_id: string;
  response_text: string;
  respondent: SupabaseRespondent | null;
}

export interface ResponseWithRespondent {
  response_id: string;
  response_text: string;
  respondent: SupabaseRespondent | null;
}