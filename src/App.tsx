import React, { useState } from 'react';
import { Container, Typography, Button, Box, TextField, Grid } from '@mui/material';
import QuestionInput from './components/QuestionInput';
import ResponseTypeSelector from './components/ResponseTypeSelector';
import HiveSizeSelector from './components/HiveSizeSelector';
import PerspectivesSelector from './components/PerspectivesSelector';
import DemographicFilters from './components/DemographicFilters';
import ResultsDisplay from './components/ResultsDisplay';
import { getResponses } from './services/api';

function App() {
  const [question, setQuestion] = useState('');
  const [responseTypes, setResponseTypes] = useState<string[]>([]);
  const [hiveSize, setHiveSize] = useState(10);
  const [perspectives, setPerspectives] = useState<string[]>([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 100]);
  const [incomeRange, setIncomeRange] = useState<[number, number]>([0, 1000000]);

  const handleSubmit = async () => {
    if (!question || responseTypes.length === 0 || perspectives.length === 0 || !apiKey) {
      alert('Please fill in all fields and provide an API key.');
      return;
    }
    setLoading(true);
    try {
      const data = await getResponses({ 
        question, 
        responseTypes, 
        hiveSize, 
        perspectives, 
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
      <PerspectivesSelector
        perspectives={perspectives}
        setPerspectives={setPerspectives}
      />
      <DemographicFilters
        ageRange={ageRange}
        setAgeRange={setAgeRange}
        incomeRange={incomeRange}
        setIncomeRange={setIncomeRange}
      />
      <Box mt={2}>
        <Button 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Submit'}
        </Button>
      </Box>
      {results && <ResultsDisplay results={results} />}
    </Container>
  );
}

export default App;