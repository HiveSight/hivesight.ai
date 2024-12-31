import React from 'react';
import QuestionInput from './QuestionInput';
import ConfigureSimulation from './ConfigureSimulation';
import ReviewSubmit from './ReviewSubmit';
import ResultsDisplay from './ResultsDisplay';
import { ResponseType } from '../types';
import { ModelType } from '../config';

interface WizardStepsProps {
  activeStep: number;
  question: string;
  setQuestion: (question: string) => void;
  responseTypes: ResponseType[];
  setResponseTypes: React.Dispatch<React.SetStateAction<ResponseType[]>>;
  hiveSize: number;
  setHiveSize: (size: number) => void;
  perspective: string;
  setPerspective: (perspective: string) => void;
  ageRange: [number, number];
  setAgeRange: (range: [number, number]) => void;
  incomeRange: [number, number];
  setIncomeRange: (range: [number, number]) => void;
  model: ModelType;
  setModel: (model: ModelType) => void;
  results: any;  // Type this properly based on your results structure
}

export function WizardSteps({
  activeStep,
  question,
  setQuestion,
  responseTypes,
  setResponseTypes,
  hiveSize,
  setHiveSize,
  perspective,
  setPerspective,
  ageRange,
  setAgeRange,
  incomeRange,
  setIncomeRange,
  model,
  setModel,
  results
}: WizardStepsProps) {
  switch (activeStep) {
    case 0:
      return <QuestionInput question={question} setQuestion={setQuestion} />;
    case 1:
      return (
        <ConfigureSimulation
          responseTypes={responseTypes}
          setResponseTypes={setResponseTypes}
          hiveSize={hiveSize}
          setHiveSize={setHiveSize}
          incomeRange={incomeRange}
          setIncomeRange={setIncomeRange}
          model={model}
          setModel={setModel}
          ageRange={ageRange}
          setAgeRange={setAgeRange}
          perspective={perspective}
          setPerspective={setPerspective}
        />
      );
    case 2:
      return (
        <ReviewSubmit
          question={question}
          responseTypes={responseTypes}
          hiveSize={hiveSize}
          perspective={perspective}
          ageRange={ageRange}
          model={model}
          costEstimation={{
            inputTokens: 0,
            outputTokens: 0,
            totalCost: 0
          }}
        />
      );
    case 3:
      return results && <ResultsDisplay responseTypes={responseTypes} results={results} />;
    default:
      return <div>Unknown step</div>;
  }
}