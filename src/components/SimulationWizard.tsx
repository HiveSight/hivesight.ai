import { useEffect } from 'react';
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
import ResponseSummary from './ResponseSummary';
import { loadPerspectives } from '../services/perspectivesData';
import { initializeEncoder } from '../utils/tokenEstimation';
import AppLayout from './AppLayout';
import { useSimulationState } from '../hooks/useSimulationState';
import { handleSignOut, handleSubmit } from '../utils/simulationHandlers';

function SimulationWizard() {
  const {
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
  } = useSimulationState();

  useEffect(() => {
    loadPerspectives();
    initializeEncoder();
  }, []);

  const handleNext = async () => {
    if (activeStep === 2) {
      await handleSubmit({
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
      });
    } else {
      setActiveStep((prevActiveStep: number) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep: number) => prevActiveStep - 1);
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
            costEstimation={{
              inputTokens: 0,
              outputTokens: 0,
              totalCost: 0
            }}
          />
        );
      case 3:
        return (
          results && (
            <>
              <ResultsDisplay responseTypes={responseTypes} results={results} />
            </>
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
          {loading && (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          )}
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSignOut}
            sx={{ mt: 2 }}
          >
            Sign Out
          </Button>
        </Container>
      </Box>
    </AppLayout>
  );
}

export default SimulationWizard;