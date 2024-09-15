import React, { useState, useEffect } from 'react';
import { Container, Typography, Button, Box, TextField, Grid, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel } from '@mui/material';
import QuestionInput from './components/QuestionInput';
import ResponseTypeSelector from './components/ResponseTypeSelector';
import HiveSizeSelector from './components/HiveSizeSelector';
import DemographicFilters from './components/DemographicFilters';
import ResultsDisplay from './components/ResultsDisplay';
import { getResponses } from './services/api';
import { loadPerspectives } from './services/perspectivesData';

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

  useEffect(() => {
    loadPerspectives();
  }, []);

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
      <FormControl component="fieldset" margin="normal">
        <FormLabel component="legend">Select Perspective</FormLabel>
        <RadioGroup
          aria-label="perspective"
          name="perspective"
          value={perspective}
          onChange={(e) => setPerspective(e.target.value)}
        >
          <FormControlLabel value="general_gpt" control={<Radio />} label="General GPT" />
          <FormControlLabel value="sample_americans" control={<Radio />} label="Sample of Americans" />
          <FormControlLabel value="custom_profiles" control={<Radio />} label="Custom Profiles" />
        </RadioGroup>
      </FormControl>
      {perspective === 'sample_americans' && (
        <DemographicFilters
          ageRange={ageRange}
          setAgeRange={setAgeRange}
          incomeRange={incomeRange}
          setIncomeRange={setIncomeRange}
        />
      )}
      <Box mt={2}>
        <Button 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Submit'}
        </Button>
      </Box>
      {results && <ResultsDisplay results={results} responseTypes={responseTypes} />}    </Container>
  );
}

export default App;