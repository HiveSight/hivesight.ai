import { getResponses } from '../services/api';
import { supabase } from '../components/SupabaseClient';
import { SimulationParams } from '../types';

export async function handleSignOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

export async function handleSubmit({
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
}: SimulationParams & {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setResults: (results: any) => void;
  setActiveStep: (step: number) => void;
}) {
  if (!question || responseTypes.length === 0) {
    setError('Please fill in all required fields before submitting.');
    return;
  }

  setLoading(true);
  setError(null);
  try {
    const data = await getResponses({
      question,
      responseTypes,
      hiveSize,
      perspective,
      ageRange,
      incomeRange,
      model,
    });
    setResults(data);
    setActiveStep(3);
  } catch (error) {
    console.error('Error fetching responses:', error);
    setError('Error fetching responses. Please try again.');
  } finally {
    setLoading(false);
  }
}