import { supabase } from '../components/SupabaseClient';
import { ModelType } from '../config';
import { ResponseType } from '../types';
import { PostgrestError } from '@supabase/supabase-js';

interface HandleSubmitParams {
  question: string;
  responseTypes: ResponseType[];
  hiveSize: number;
  perspective: string;
  ageRange: [number, number];
  incomeRange: [number, number];
  model: ModelType;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setResults: (data: { question: string; responses: any[] } | null) => void;
  setActiveStep: (step: number) => void;
}

export const handleSignOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

async function createItem(userId: string, question: string) {
  const { data, error } = await supabase
    .from('items')
    .insert({
      creator_id: userId,
      item_text: question
    })
    .select()
    .single();

  if (error) throw error;
  return data.item_id;
}

async function createUniverse(userId: string, ageRange: [number, number], incomeRange: [number, number]) {
  // First create the universe
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

  // Then add the constraints
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

export const handleSubmit = async ({
  question,
  responseTypes,
  hiveSize,
  perspective,
  ageRange,
  incomeRange,
  model,
  setLoading,
  setError,
  setResults,
  setActiveStep
}: HandleSubmitParams) => {
  if (!question || responseTypes.length === 0) {
    setError('Please fill in all required fields before submitting.');
    return;
  }

  setLoading(true);
  setError(null);

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication failed');
    }

    // Create item and universe if needed
    const itemId = await createItem(user.id, question);
    let universeId = null;
    
    if (perspective === 'sample_americans') {
      universeId = await createUniverse(user.id, ageRange, incomeRange);
    }

    console.log('Inserting query with data:', {
      requester_id: user.id,
      item_id: itemId,
      model,
      universe_id: universeId
    });

    const { data: inserted, error } = await supabase
      .from('queries')
      .insert({
        item_id: itemId,
        requester_id: user.id,
        model,
        temperature: 0.7,
        max_tokens: 1000,
        n_responses: hiveSize,
        n_responses_per_respondent: 1,
        universe_id: universeId,
        credit_cost: 1,
        execution_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      const pgError = error as PostgrestError;
      throw new Error(`Database error: ${pgError.message}`);
    }
    
    if (!inserted) {
      throw new Error('No data returned after insert');
    }

    const queryId = inserted.query_id;
    setActiveStep(2);
    
    let attempts = 0;
    const maxAttempts = 20;

    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const { data: qData, error: qError } = await supabase
          .from('queries')
          .select('execution_status, query_id')
          .eq('query_id', queryId)
          .single();

        if (qError) {
          clearInterval(interval);
          throw new Error(`Status check error: ${qError.message}`);
        }

        if (!qData) {
          clearInterval(interval);
          throw new Error('Query not found');
        }

        if (qData.execution_status === 'completed') {
          const { data: rData, error: rError } = await supabase
            .from('responses')
            .select(`
              response_id,
              response_text,
              respondents(
                PRTAGE,
                GESTFIPS
              )
            `)
            .eq('query_id', queryId);
          
          clearInterval(interval);
          
          if (rError) {
            throw new Error(`Response fetch error: ${rError.message}`);
          }

          if (!rData || rData.length === 0) {
            throw new Error('No response data found');
          }

          // Format the responses to match expected structure
          setResults({ 
            question, 
            responses: rData.map(r => ({
              response_text: r.response_text,
              age: r.respondents?.PRTAGE || null,
              state: r.respondents?.GESTFIPS?.toString() || 'Unknown',
              // Add other fields as needed
              perspective: perspective
            }))
          });
          setLoading(false);
          setActiveStep(3);
        } else if (qData.execution_status === 'error') {
          clearInterval(interval);
          throw new Error('Error processing query');
        }

        if (attempts >= maxAttempts) {
          clearInterval(interval);
          throw new Error('Query processing timed out');
        }
      } catch (pollError) {
        clearInterval(interval);
        setLoading(false);
        if (pollError instanceof Error) {
          setError(pollError.message);
        } else {
          setError('An unexpected error occurred while checking query status');
        }
      }
    }, 3000);
  } catch (err) {
    const error = err as Error;
    console.error('Error in handleSubmit:', error);
    setError(error.message || 'An unexpected error occurred');
    setLoading(false);
  }
};