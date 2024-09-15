import { useState, useEffect } from 'react';
import { Container, Typography, Button, Box, TextField, Grid } from '@mui/material';
import QuestionInput from './components/QuestionInput';
import ResponseTypeSelector from './components/ResponseTypeSelector';
import HiveSizeSelector from './components/HiveSizeSelector';
import DemographicFilters from './components/DemographicFilters';
import PerspectiveSelector from './components/PerspectiveSelector';
import CostEstimation from './components/CostEstimation';
import ResultsDisplay from './components/ResultsDisplay';
import { getResponses } from './services/api';
import { loadPerspectives } from './services/perspectivesData';
import { initializeEncoder, estimateCost } from './utils/tokenEstimation';

function App() {
  const [question, setQuestion] = useState('');
  const [responseTypes, setResponseTypes] = useState<string[]>([]);
  const [hiveSize, setHiveSize] = useState(10);
  const [perspective, setPerspective] = useState('general_gpt');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 100]);
  const [incomeRange, setIncomeRange] = useState<[number, number]>([0, 1000000]);
  const [costEstimation, setCostEstimation] = useState<{ inputTokens: number; outputTokens: number; totalCost: number } | null>(null);
  const [encoderReady, setEncoderReady] = useState(false);

  useEffect(() => {
    loadPerspectives();
    initializeEncoder().then(() => setEncoderReady(true));
  }, []);

  useEffect(() => {
    if (encoderReady && question && responseTypes.length > 0) {
      const cost = estimateCost(question, responseTypes, hiveSize, 'GPT-4o-mini', 150);
      setCostEstimation(cost);
    } else {
      setCostEstimation(null);
    }
  }, [encoderReady, question, responseTypes, hiveSize]);

  const handleSubmit = async () => {
    if (!question || responseTypes.length === 0 || !apiKey) {
      alert('Please fill in all fields and provide an API key.');
      return;
    }
    setLoading(true);
    try {
      const data = await getResponses({ 
        question, 
        responseTypes, 
        hiveSize, 
        perspective,
        apiKey,
        ageRange,
        incomeRange
      });
      setResults(data);
    } catch (error) {
      console.error('Error fetching responses:', error);
      alert('Error fetching responses. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h2" component="h1" gutterBottom>
        🐝 HiveSight
      </Typography>
      <TextField
        fullWidth
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        label="OpenAI API Key"
        variant="outlined"
        margin="normal"
      />
      <QuestionInput question={question} setQuestion={setQuestion} />
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ResponseTypeSelector
            responseTypes={responseTypes}
            setResponseTypes={setResponseTypes}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <HiveSizeSelector hiveSize={hiveSize} setHiveSize={setHiveSize} />
        </Grid>
      </Grid>
      <PerspectiveSelector perspective={perspective} setPerspective={setPerspective} />
      {perspective === 'sample_americans' && (
        <DemographicFilters
          ageRange={ageRange}
          setAgeRange={setAgeRange}
          incomeRange={incomeRange}
          setIncomeRange={setIncomeRange}
        />
      )}
      <CostEstimation costEstimation={costEstimation} />
      <Box mt={2}>
        <Button 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Submit'}
        </Button>
      </Box>
      {results && <ResultsDisplay results={results} responseTypes={responseTypes} />}
    </Container>
  );
}

export default App;