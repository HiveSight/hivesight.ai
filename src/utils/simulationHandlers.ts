import { getResponses } from '../services/api';
import { supabase } from '../components/SupabaseClient';
import { ResponseData } from '../types';

export async function handleSignOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

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
  try {
    const data = await getResponses({
      question,
      responseTypes: responseTypes.map(type => type as import("../types").ResponseType),
      hiveSize,
      perspective,
      ageRange,
      incomeRange,
      model: model as "GPT-4o" | "GPT-4o-mini",
    });
    setResults(data);
    setActiveStep(3);
  } catch (error) {
    console.error('Error fetching responses:', error);
    setError('Error fetching responses. Please try again.');
  } finally {
    setLoading(false);
  }
};