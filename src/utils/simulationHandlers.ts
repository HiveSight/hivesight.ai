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
    if (userError) {
      console.error('Auth error:', userError);
      throw new Error('Authentication failed');
    }
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Log the data we're about to insert
    console.log('Inserting query with data:', {
      requester_id: user.id,
      prompt: question,
      model,
      response_types: responseTypes,
      hive_size: hiveSize,
      perspective,
      age_range: ageRange,
      income_range: incomeRange
    });

    const { data: inserted, error } = await supabase
      .from('queries')  // Changed from llm_queries to queries
      .insert({
        requester_id: user.id,
        item_id: null,  // Add required fields from queries table
        model,
        temperature: 0.7,  // Add default values for required fields
        max_tokens: 1000,  // Add default values for required fields
        n_responses: hiveSize,
        n_responses_per_respondent: 1,  // Default value
        credit_cost: 1,  // Default value
        execution_status: 'pending',
        // Custom fields we need for our application
        prompt: question,
        response_types: responseTypes,
        hive_size: hiveSize,
        perspective,
        age_range: ageRange,
        income_range: incomeRange
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
          .from('queries')  // Changed from llm_queries to queries
          .select('execution_status as status, query_id')  // Map execution_status to status
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

        if (qData.status === 'completed') {
          const { data: rData, error: rError } = await supabase
            .from('responses')  // Changed from llm_responses to responses
            .select('query_id, response_text as responses')  // Map fields to match expected format
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
              response_text: r.responses,
              query_id: r.query_id
            }))
          });
          setLoading(false);
          setActiveStep(3);
        } else if (qData.status === 'error' || qData.status === 'insufficient_credits') {
          clearInterval(interval);
          throw new Error(qData.status === 'error' ? 'Error processing query' : 'Insufficient credits');
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