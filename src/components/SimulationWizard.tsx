import { useState, useEffect } from 'react';
import { 
  Typography, 
  Button, 
  Box, 
  Stepper, 
  Step, 
  StepLabel
} from '@mui/material';
import QuestionInput from './QuestionInput';
import ConfigureSimulation from './ConfigureSimulation';
import ReviewSubmit from './ReviewSubmit';
import ResultsDisplay from './ResultsDisplay';
import { getResponses } from '../services/api';
import { loadPerspectives } from '../services/perspectivesData';
import { initializeEncoder, estimateCost } from '../utils/tokenEstimation';
import { ResponseData, ResponseType } from '../types';
import { ModelType } from '../config';
import AppLayout from './AppLayout';
import { Container } from '@mui/material';
import { queryOpenAI } from '../services/openAIService';

function SimulationWizard() {
  const [activeStep, setActiveStep] = useState(0);
  const [question, setQuestion] = useState('');
  const [responseTypes, setResponseTypes] = useState<string[]>([]);
  const [hiveSize, setHiveSize] = useState(10);
  const [perspective, setPerspective] = useState('general_gpt');
  const [results, setResults] = useState<ResponseData | null>(null);  // Set the type to ResponseData or null
  const [loading, setLoading] = useState(false);
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 100]);
  const [incomeRange, setIncomeRange] = useState<[number, number]>([0, 1000000]);
  const [costEstimation, setCostEstimation] = useState<{ inputTokens: number; outputTokens: number; totalCost: number } | null>(null);
  const [encoderReady, setEncoderReady] = useState(false);
  const [model, setModel] = useState<ModelType>('GPT-4o'); 
  const [error, setError] = useState<string | null>(null);

  const convertToResponseType = (types: string[]): ResponseType[] => {
    const validTypes: ResponseType[] = ['open_ended', 'likert'];
    
    return types.filter((type): type is ResponseType => (validTypes as string[]).includes(type));
  };

  useEffect(() => {
    loadPerspectives();
    initializeEncoder().then(() => setEncoderReady(true));
  }, []);

  useEffect(() => {
    if (encoderReady && question && responseTypes.length > 0) {
      const cost = estimateCost(question, responseTypes, hiveSize, model, 150);
      setCostEstimation(cost);
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
    if (!question || responseTypes.length === 0) {
      setError('Please fill in all required fields before submitting.');
      return;
    }
  
    setLoading(true);
    setError(null);
    try {
      const validResponseTypes = convertToResponseType(responseTypes); // Convert to valid ResponseType[]
  
      const data = await getResponses({
        question, 
        responseTypes: validResponseTypes,  // Pass the converted ResponseType array here
        hiveSize, 
        perspective,
        ageRange,
        incomeRange,
        model
      });
      setResults(data);  // Now results accepts ResponseData
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
    setResults(null);  // Reset results to null
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