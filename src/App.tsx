import React, { useState } from 'react';
import { Container, Typography, Button, Box, TextField } from '@mui/material';
import QuestionInput from './components/QuestionInput';
import ResponseTypeSelector from './components/ResponseTypeSelector';
import HiveSizeSelector from './components/HiveSizeSelector';
import PerspectivesSelector from './components/PerspectivesSelector';
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

  const handleSubmit = async () => {
    if (!question || responseTypes.length === 0 || perspectives.length === 0 || !apiKey) {
      alert('Please fill in all fields and provide an API key.');
      return;
    }
    setLoading(true);
    try {
      const data = await getResponses({ question, responseTypes, hiveSize, perspectives, apiKey });
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
      <ResponseTypeSelector
        responseTypes={responseTypes}
        setResponseTypes={setResponseTypes}
      />
      <HiveSizeSelector hiveSize={hiveSize} setHiveSize={setHiveSize} />
      <PerspectivesSelector
        perspectives={perspectives}
        setPerspectives={setPerspectives}
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