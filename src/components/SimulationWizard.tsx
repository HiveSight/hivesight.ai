import { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Box,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Container,
} from '@mui/material';
import QuestionInput from './QuestionInput';
import ConfigureSimulation from './ConfigureSimulation';
import ReviewSubmit from './ReviewSubmit';
import ResultsDisplay from './ResultsDisplay';
import { getResponses } from '../services/api';
import { loadPerspectives } from '../services/perspectivesData';
import { initializeEncoder } from '../utils/tokenEstimation';
import { ResponseData, ResponseType } from '../types';
import { ModelType } from '../config';
import AppLayout from './AppLayout';
import CostEstimation from './CostEstimation';

function SimulationWizard() {
  const [activeStep, setActiveStep] = useState(0);
  const [question, setQuestion] = useState('');
  const [responseTypes, setResponseTypes] = useState<string[]>([]);
  const [hiveSize, setHiveSize] = useState(10);
  const [perspective, setPerspective] = useState('general_gpt');
  const [results, setResults] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 100]);
  const [incomeRange, setIncomeRange] = useState<[number, number]>([0, 1000000]);
  const [model, setModel] = useState<ModelType>('GPT-4o');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPerspectives();
    initializeEncoder();
  }, []);

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleNext = async () => {
    if (activeStep === 2) {
      await handleSubmit();
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    if (!question || responseTypes.length === 0) {
      setError('Please fill in all required fields before submitting.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const validResponseTypes = responseTypes as ResponseType[];

      const data = await getResponses({
        question,
        responseTypes: validResponseTypes,
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
      setIsLoading(false);
    }
  };

  const steps = ['Set Question', 'Configure Simulation', 'Review & Submit', 'View Results'];

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
          <ReviewSubmit
            question={question}
            responseTypes={responseTypes}
            hiveSize={hiveSize}
            perspective={perspective}
            ageRange={ageRange}
            model={model}
            costEstimation={CostEstimation}
          />
        );
      case 3:
        return (
          results && (
            <ResultsDisplay responseTypes={responseTypes} results={results} />
          )
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
          backgroundColor: '#f5f5f5',
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
          {error && (
            <Typography color="error" align="center">
              {error}
            </Typography>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              color="inherit"
              disabled={activeStep === 0 || loading}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleNext}
              disabled={loading}
            >
              {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </Box>
          {isLoading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : (
            results && (
              <ResultsDisplay responseTypes={responseTypes} results={results} />
            )
          )}
        </Container>
      </Box>
    </AppLayout>
  );
}

export default SimulationWizard;