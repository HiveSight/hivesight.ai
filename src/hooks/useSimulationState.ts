import { useState } from 'react';
import { ResponseData, ResponseType } from '../types';
import { ModelType } from '../config';

export function useSimulationState() {
  const [activeStep, setActiveStep] = useState(0);
  const [question, setQuestion] = useState('');
  const [responseTypes, setResponseTypes] = useState<ResponseType[]>([]);
  const [hiveSize, setHiveSize] = useState(10);
  const [perspective, setPerspective] = useState('general_gpt');
  const [results, setResults] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 100]);
  const [incomeRange, setIncomeRange] = useState<[number, number]>([0, 1000000]);
  const [model, setModel] = useState<ModelType>('GPT-4o-mini');
  const [error, setError] = useState<string | null>(null);

  return {
    activeStep,
    setActiveStep,
    question,
    setQuestion,
    responseTypes,
    setResponseTypes,
    hiveSize,
    setHiveSize,
    perspective,
    setPerspective,
    results,
    setResults,
    loading,
    setLoading,
    ageRange,
    setAgeRange,
    incomeRange,
    setIncomeRange,
    model,
    setModel,
    error,
    setError,
  };
}