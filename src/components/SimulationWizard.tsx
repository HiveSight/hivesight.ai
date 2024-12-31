import { useEffect } from 'react';
import {
  Typography,
  Box,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Container,
  Button
} from '@mui/material';
import { loadPerspectives } from '../services/perspectivesData';
import { initializeEncoder } from '../utils/tokenEstimation';
import AppLayout from './AppLayout';
import { useSimulationState } from '../hooks/useSimulationState';
import { handleSignOut, handleSubmit } from '../utils/simulationHandlers';
import { createItem } from '../services/database';
import { getCurrentUser } from '../services/auth';
import { WizardSteps } from './WizardSteps';
import { WizardNavigation } from './WizardNavigation';

const STEPS = ['Set Question', 'Configure Simulation', 'Review & Submit', 'View Results'];

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
    if (activeStep === 0) {
      // Create item when moving from question step
      setLoading(true);
      const user = await getCurrentUser();
      const { error } = await createItem(user.id, question);
      
      if (error) {
        setError('Failed to save question. Please try again.');
        setLoading(false);
        return;
      }
      
      setLoading(false);
      setActiveStep((prevActiveStep: number) => prevActiveStep + 1);
    } else if (activeStep === 2) {
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
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ mt: 4, mb: 4 }}>
            <WizardSteps
              activeStep={activeStep}
              question={question}
              setQuestion={setQuestion}
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
              results={results}
            />
          </Box>

          {error && (
            <Typography color="error" align="center">
              {error}
            </Typography>
          )}

          <WizardNavigation
            activeStep={activeStep}
            loading={loading}
            onBack={handleBack}
            onNext={handleNext}
            totalSteps={STEPS.length}
          />

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