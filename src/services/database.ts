import { supabase } from '../components/SupabaseClient';
import { 
  QueryParams, 
  QueryResponse, 
  ResponseWithRespondent,
  RawSupabaseResponse 
} from '../types';

export interface ItemCreationResult {
  item_id: string;
  error?: Error;
}

export async function createItem(userId: string, question: string): Promise<ItemCreationResult> {
  try {
    const { data, error } = await supabase
      .from('items')
      .insert({
        creator_id: userId,
        item_text: question
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      item_id: data.item_id
    };
  } catch (e) {
    return {
      item_id: '',
      error: e instanceof Error ? e : new Error('Unknown error occurred')
    };
  }
}

export async function createUniverse(userId: string, ageRange: [number, number], incomeRange: [number, number]): Promise<string> {
  const { data: universe, error: universeError } = await supabase
    .from('response_universes')
    .insert({
      creator_id: userId,
      name: `Universe for age ${ageRange[0]}-${ageRange[1]} and income ${incomeRange[0]}-${incomeRange[1]}`,
      source: 'web_app',
      description: 'Automatically created universe for query'
    })
    .select()
    .single();

  if (universeError) throw universeError;

  const constraints = [
    {
      universe_id: universe.universe_id,
      variable: 'PRTAGE',
      operator: 'BETWEEN',
      value: `${ageRange[0]},${ageRange[1]}`
    },
    {
      universe_id: universe.universe_id,
      variable: 'INCOME',
      operator: 'BETWEEN',
      value: `${incomeRange[0]},${incomeRange[1]}`
    }
  ];

  const { error: constraintsError } = await supabase
    .from('universe_constraints')
    .insert(constraints);

  if (constraintsError) throw constraintsError;

  return universe.universe_id;
}

export async function createQuery(params: QueryParams): Promise<QueryResponse> {
  const { data, error } = await supabase
    .from('queries')
    .insert({
      item_id: params.itemId,
      requester_id: params.userId,
      model: params.model,
      temperature: 0.7,
      max_tokens: 1000,
      n_responses: params.hiveSize,
      n_responses_per_respondent: 1,
      universe_id: params.universeId,
      credit_cost: 1,
      execution_status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getQueryStatus(queryId: string): Promise<QueryResponse> {
  const { data, error } = await supabase
    .from('queries')
    .select('query_id, execution_status')
    .eq('query_id', queryId)
    .single();

  if (error) throw error;
  return data;
}

export async function getQueryResponses(queryId: string): Promise<ResponseWithRespondent[]> {
  const { data, error } = await supabase
    .from('responses')
    .select(`
      response_id,
      response_text,
      respondent:respondent_id (
        PRTAGE,
        GESTFIPS
      )
    `)
    .eq('query_id', queryId);

  if (error) throw error;
  if (!data) return [];

  console.log('Raw Supabase response:', JSON.stringify(data, null, 2));

  // First cast to unknown, then to our expected type
  return (data as unknown as RawSupabaseResponse[]).map(row => ({
    response_id: row.response_id,
    response_text: row.response_text,
    respondent: row.respondent ? {
      PRTAGE: row.respondent.PRTAGE,
      GESTFIPS: row.respondent.GESTFIPS
    } : null
  }));
}