import { SupabaseClient } from '@supabase/supabase-js';

export interface RequestBody {
  query_id: string;
  requester_id: string;
  prompt: string;
  model: string;
  response_types: string[];
  hive_size: number;
  perspective: string;
  age_range: [number, number];
  income_range: [number, number];
}

export interface ParsedResponse {
  open_ended?: string;
  likert?: number;
}

export interface GeneratedPrompts {
  systemPrompt: string;
  userPrompt: string;
}

export interface Dependencies {
  supabaseClient: SupabaseClient;
  fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  openaiApiKey: string;
}