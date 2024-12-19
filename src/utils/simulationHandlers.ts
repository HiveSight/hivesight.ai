import { supabase } from '../components/SupabaseClient';

interface HandleSubmitParams {
  question: string;
  responseTypes: string[];
  hiveSize: number;
  perspective: string;
  ageRange: [number, number];
  incomeRange: [number, number];
  model: string;
  userId: string;
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

/**
 * Insert a record into gpt_queries.
 * Then poll for results in gpt_responses once status='completed'.
 */
export const handleSubmit = async ({
  question,
  responseTypes,
  hiveSize,
  perspective,
  ageRange,
  incomeRange,
  model,
  userId,
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

  const { data: inserted, error } = await supabase
    .from('gpt_queries')
    .insert({
      requester_id: userId,
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
    console.error('Error inserting gpt_query:', error);
    setError('Failed to submit query.');
    setLoading(false);
    return;
  }

  const queryId = inserted.query_id;
  setActiveStep(2); // Move forward to a "waiting" step (3rd step maybe is Review & Submit, we keep consistent)
  
  let attempts = 0;
  const maxAttempts = 20;

  const interval = setInterval(async () => {
    attempts++;
    const { data: qData, error: qError } = await supabase
      .from('gpt_queries')
      .select('status, query_id')
      .eq('query_id', queryId)
      .single();

    if (qError || !qData) {
      console.error('Error fetching gpt_query:', qError);
      clearInterval(interval);
      setError('Error checking query status.');
      setLoading(false);
      return;
    }

    if (qData.status === 'completed') {
      const { data: rData, error: rError } = await supabase
        .from('gpt_responses')
        .select('question, responses')
        .eq('query_id', queryId)
        .single();
      
      clearInterval(interval);
      setLoading(false);

      if (rError || !rData) {
        console.error('Error fetching gpt_responses:', rError);
        setError('Failed to fetch results.');
        return;
      }

      setResults({ question: rData.question, responses: rData.responses });
      setActiveStep(3); // Proceed to results step
    } else if (qData.status === 'error' || qData.status === 'insufficient credits') {
      clearInterval(interval);
      setError('Error fetching responses or insufficient credits.');
      setLoading(false);
    }

    if (attempts >= maxAttempts) {
      clearInterval(interval);
      setError('Timed out waiting for responses.');
      setLoading(false);
    }
  }, 3000);
};
