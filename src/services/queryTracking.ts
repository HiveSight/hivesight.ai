import { supabase } from '../components/SupabaseClient';

export interface QueryRecord {
  query_text: string;
  model: string;
  n_responses: number;
  response_universe: string;
  credit_cost: number;
  execution_status: 'started' | 'completed' | 'abandoned' | 'failed';
}

export async function insertQueryRecord(record: QueryRecord) {
  const { data, error } = await supabase
    .from('queries')
    .insert([record])
    .select()
    .single();

  if (error) {
    console.error('Error inserting query record:', error);
    throw error;
  }

  return data;
}

export async function updateQueryStatus(queryId: string, status: QueryRecord['execution_status']) {
  const { error } = await supabase
    .from('queries')
    .update({ execution_status: status })
    .eq('query_id', queryId);

  if (error) {
    console.error('Error updating query status:', error);
    throw error;
  }
}

export async function getUserQueryHistory() {
  const { data, error } = await supabase
    .from('queries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching query history:', error);
    throw error;
  }

  return data;
}