import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Button, 
  Box, 
  CircularProgress, 
  Paper, 
  Stepper, 
  Step, 
  StepLabel
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import QuestionInput from './QuestionInput';
import ConfigureSimulation from './ConfigureSimulation';
import ReviewSubmit from './ReviewSubmit';
import ResultsDisplay from './ResultsDisplay';
import { getResponses } from '../services/api';
import { loadPerspectives } from '../services/perspectivesData';
import { initializeEncoder, estimateCost } from '../utils/tokenEstimation';

function SimulationWizard() {
  const [activeStep, setActiveStep] = useState(0);
  const [question, setQuestion] = useState('');
  const [responseTypes, setResponseTypes] = useState<string[]>([]);
  const [hiveSize, setHiveSize] = useState(10);
  const [perspective, setPerspective] = useState('general_gpt');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 100]);
  const [incomeRange, setIncomeRange] = useState<[number, number]>([0, 1000000]);
  const [costEstimation, setCostEstimation] = useState<{ inputTokens: number; outputTokens: number; totalCost: number } | null>(null);
  const [encoderReady, setEncoderReady] = useState(false);
  const [model, setModel] = useState('GPT-4o');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPerspectives();
    initializeEncoder().then(() => setEncoderReady(true));
  }, []);

  useEffect(() => {
    if (encoderReady && question && responseTypes.length > 0) {
      const cost = estimateCost(question, responseTypes, hiveSize, model, 150);
      setCostEstimation(cost);
    } else {
      setCostEstimation(null);
    }
  }, [encoderReady, question, responseTypes, hiveSize, model]);

  const handleSubmit = async () => {
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
        model
      });
      setResults(data);
      setActiveStep(3);  // Move to results step
    } catch (error) {
      console.error('Error fetching responses:', error);
      setError('Error fetching responses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewQuestion = () => {
    setQuestion('');
    setResponseTypes([]);
    setHiveSize(10);
    setPerspective('general_gpt');
    setResults(null);
    setAgeRange([18, 100]);
    setIncomeRange([0, 1000000]);
    setModel('GPT-4o');
    setActiveStep(0);
    setError(null);
  };

  const steps = ['Set Question', 'Configure Simulation', 'Review & Submit', 'View Results'];

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <QuestionInput question={question} setQuestion={setQuestion} />;
      case 1:
        return <ConfigureSimulation 
          responseTypes={responseTypes} 
          setResponseTypes={setResponseTypes}
          hiveSize={hiveSize}
          setHiveSize={setHiveSize}
          perspective={perspective}
          setPerspective={setPerspective}
          ageRange={ageRange}
          setAgeRange={setAgeRange}
          incomeRange={incomeRange}
          setIncomeRange={setIncomeRange}
          model={model}
          setModel={setModel}
        />;
      case 2:
        return <ReviewSubmit 
          question={question}
          responseTypes={responseTypes}
          hiveSize={hiveSize}
          perspective={perspective}
          model={model}
          costEstimation={costEstimation}
        />;
      case 3:
        return results && <ResultsDisplay results={results} responseTypes={responseTypes} />;
      default:
        return 'Unknown step';
    }
  };

  return (
    <Paper elevation={3} style={{ padding: '2rem', marginTop: '2rem' }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        🐝 HiveSight
      </Typography>
      <Stepper activeStep={activeStep} alternativeLabel style={{ marginBottom: '2rem' }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box mb={4}>
        {getStepContent(activeStep)}
      </Box>
      {error && (
        <Typography color="error" gutterBottom>{error}</Typography>
      )}
      <Box mt={2} display="flex" justifyContent="space-between">
        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handleNewQuestion}
          >
            New Question
          </Button>
        ) : (
          <>
            <Button
              disabled={activeStep === 0}
              onClick={() => setActiveStep((prevActiveStep) => prevActiveStep - 1)}
            >
              Back
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                if (activeStep === steps.length - 2) {
                  handleSubmit();
                } else {
                  setActiveStep((prevActiveStep) => prevActiveStep + 1);
                }
              }}
              disabled={loading || (activeStep === 1 && responseTypes.length === 0)}
            >
              {loading ? <CircularProgress size={24} /> : 
                activeStep === steps.length - 2 ? 'Submit' : 'Next'}
            </Button>
          </>
        )}
      </Box>
    </Paper>
  );
}

export default SimulationWizard;