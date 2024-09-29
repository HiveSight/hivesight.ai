import { useState } from 'react';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Container,
} from '@mui/material';
import AppLayout from './AppLayout';
import { queryOpenAI } from '../services/openAIService';

// Import your step components
import QuestionInput from './QuestionInput';
import ConfigureSimulation from './ConfigureSimulation';
import ReviewSubmit from './ReviewSubmit';
import ResultsDisplay from './ResultsDisplay';

// Define your data models
interface Response {
  perspective: string;
  age: number;
  income: number;
  state: string;
  open_ended?: string;
  likert?: number;
}

interface Results {
  question: string;
  responses: Response[];
}

// Update your props types as needed
export type ConfigureSimulationProps = {
  responseTypes: string[];
  setResponseTypes: React.Dispatch<React.SetStateAction<string[]>>;
  hiveSize: number;
  setHiveSize: React.Dispatch<React.SetStateAction<number>>;
  incomeRange: [number, number];
  setIncomeRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  model: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  ageRange: [number, number];
  setAgeRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  perspective: string;
  setPerspective: React.Dispatch<React.SetStateAction<string>>;
};

export interface ReviewSubmitProps {
  question: string;
  responseTypes: string[];
  hiveSize: number;
  perspective: string;
  ageRange: [number, number];
  model: string;  // Add this line
}

function SimulationWizard() {
  const [activeStep, setActiveStep] = useState(0);
  const [question, setQuestion] = useState('');
  const [responseTypes, setResponseTypes] = useState<string[]>([]);
  const [hiveSize, setHiveSize] = useState(10);
  const [ageRange, setAgeRange] = useState<[number, number]>([0, 100]);
  const [incomeRange, setIncomeRange] = useState<[number, number]>([0, 1000000]);
  const [model, setModel] = useState('');
  const [perspective, setPerspective] = useState('');
  const [results, setResults] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const steps = ['Ask a Question', 'Configure Simulation', 'Review and Submit', 'Results'];

  const handleNext = () => {
    if (activeStep === 2) {
      // Submit data and fetch results
      fetchResults();
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const fetchResults = async () => {
    try {
      const prompt = `Question: ${question}\nResponse Types: ${responseTypes.join(', ')}\nHive Size: ${hiveSize}\nPerspective: ${perspective}\nAge Range: ${ageRange[0]}-${ageRange[1]}\nModel: ${model}`;
      
      const result = await queryOpenAI(prompt, model);
      console.log('Results:', result);
      setResults(result);
    } catch (error) {
      console.error('Error fetching results:', error);
      setResults('An error occurred while fetching results.');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    // Perform your simulation logic here
    // ...
    setLoading(false);
  };

  console.log('Rendering SimulationWizard');

  const getStepContent = (step: number) => {
    switch (step) {
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
          <>
            {console.log('About to render ReviewSubmit')}
            <ReviewSubmit
              question={question}
              responseTypes={responseTypes}
              hiveSize={hiveSize}
              perspective={perspective}
              ageRange={ageRange}
              model={model}
              onSubmit={handleSubmit}
            />
            {console.log('After rendering ReviewSubmit')}
          </>
        );
      case 3:
        return results && (
          <ResultsDisplay
            responseTypes={responseTypes}
            hiveSize={hiveSize}
            perspective={perspective}
            ageRange={ageRange}
            results={results}
          />
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <AppLayout>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'auto',
          backgroundColor: '#f5f5f5', // Light grey background
        }}
      >
        {/* HiveSight logo and name in upper left */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            display: 'flex',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <img
            src="/logo.png"
            alt="HiveSight Logo"
            style={{ height: '24px', marginRight: '10px' }}
          />
          <Typography variant="h6" component="h1">
            HiveSight
          </Typography>
        </Box>

        <Container maxWidth="md" sx={{ mt: 8, mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Box sx={{ mt: 4, mb: 4 }}>{getStepContent(activeStep)}</Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              color="inherit"
              disabled={activeStep === 0 || loading}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
            <Button variant="contained" color="primary" onClick={handleNext} disabled={loading}>
              {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </Box>
        </Container>
      </Box>
    </AppLayout>
  );
}

export default SimulationWizard;