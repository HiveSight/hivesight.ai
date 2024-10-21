import { getResponses } from '../services/api';
import { insertQueryRecord, updateQueryStatus } from '../services/queryTracking';
import { supabase } from '../components/SupabaseClient';
import { ResponseData } from '../types';


interface SimulationParams {
  question: string;
  responseTypes: string[];
  hiveSize: number;
  perspective: string;
  ageRange: [number, number];
  incomeRange: [number, number];
  model: string;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setResults: React.Dispatch<React.SetStateAction<ResponseData | null>>;
  setActiveStep: (step: number) => void;
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
  setActiveStep,
}: SimulationParams) => {
  if (!question || responseTypes.length === 0) {
    setError('Please fill in all required fields before submitting.');
    return;
  }

  setLoading(true);
  setError(null);
  
  let queryId: string | undefined;
  
  try {
    // Insert initial query record
    const queryRecord = await insertQueryRecord({
      query_text: question,
      model,
      n_responses: hiveSize,
      response_universe: perspective,
      credit_cost: 0, // You could calculate this based on your credit system
      execution_status: 'started'
    });
    
    queryId = queryRecord.query_id;

    // Get responses
    const data = await getResponses({
      question,
      responseTypes: responseTypes.map(type => type as import("../types").ResponseType),
      hiveSize,
      perspective,
      ageRange,
      incomeRange,
      model: model as "GPT-4o" | "GPT-4o-mini",
    });

    // Update query record to completed
    if (queryId) {
      await updateQueryStatus(queryId, 'completed');
    }

    setResults(data);
    setActiveStep(3);
  } catch (error) {
    console.error('Error in simulation:', error);
    
    // Update query record to failed
    if (queryId) {
      await updateQueryStatus(queryId, 'failed');
    }
    
    setError('Error fetching responses. Please try again.');
  } finally {
    setLoading(false);
  }
};

export const handleSignOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
  }
};
