import { supabase } from '../components/SupabaseClient';
import { ModelType } from '../config';
import { ResponseType } from '../types';

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
  setResults: (data: { question: string, responses: any[] } | null) => void;
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
    if (userError || !user) throw new Error('User not authenticated');

    const { data: inserted, error } = await supabase
      .from('llm_queries')
      .insert({
        requester_id: user.id,
        prompt: question,
        model,
        response_types: responseTypes,
        hive_size: hiveSize,
        perspective,
        age_range: ageRange,
        income_range: incomeRange
      })
      .select()
      .single();

    if (error || !inserted) {
      throw new Error(error?.message || 'Failed to submit query');
    }

    const queryId = inserted.query_id;
    setActiveStep(2);
    
    let attempts = 0;
    const maxAttempts = 20;

    const interval = setInterval(async () => {
      attempts++;
      const { data: qData, error: qError } = await supabase
        .from('llm_queries')
        .select('status, query_id')
        .eq('query_id', queryId)
        .single();

      if (qError || !qData) {
        clearInterval(interval);
        throw new Error(qError?.message || 'Error checking query status');
      }

      if (qData.status === 'completed') {
        const { data: rData, error: rError } = await supabase
          .from('llm_responses')
          .select('question, responses')
          .eq('query_id', queryId)
          .single();
        
        clearInterval(interval);
        setLoading(false);

        if (rError || !rData) {
          throw new Error(rError?.message || 'Failed to fetch results');
        }

        setResults({ question: rData.question, responses: rData.responses });
        setActiveStep(3);
      } else if (qData.status === 'error' || qData.status === 'insufficient_credits') {
        clearInterval(interval);
        throw new Error(qData.status === 'error' ? 'Error fetching responses' : 'Insufficient credits');
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        throw new Error('Timed out waiting for responses');
      }
    }, 3000);
  } catch (error) {
    console.error('Error in handleSubmit:', error);
    setError(error.message || 'An unexpected error occurred');
    setLoading(false);
  }
};