import React, { useState, useEffect } from 'react';
import { Container, Typography, Button, Box, CircularProgress } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import QuestionInput from './components/QuestionInput';
import ResponseTypeSelector from './components/ResponseTypeSelector';
import HiveSizeSelector from './components/HiveSizeSelector';
import DemographicFilters from './components/DemographicFilters';
import PerspectiveSelector from './components/PerspectiveSelector';
import CostEstimation from './components/CostEstimation';
import ResultsDisplay from './components/ResultsDisplay';
import GoogleSignIn from './components/GoogleSignIn';
import CreditManagement from './components/CreditManagement';
import ModelSelector from './components/ModelSelector';
import { getResponses } from './services/api';
import { loadPerspectives } from './services/perspectivesData';
import { initializeEncoder, estimateCost } from './utils/tokenEstimation';
import { getUserCredits, updateUserCredits } from './services/creditSystem';

function App() {
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
  const [user, setUser] = useState<any>(null);
  const [model, setModel] = useState('GPT-4o-mini');
  const [credits, setCredits] = useState(0);

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

  useEffect(() => {
    if (user) {
      fetchUserCredits();
    }
  }, [user]);

  const fetchUserCredits = async () => {
    if (user) {
      const userCredits = await getUserCredits(user.sub);
      setCredits(userCredits);
    }
  };

  const handleGoogleLoginSuccess = async (tokenResponse: any) => {
    // TODO: Decode the JWT token to get user info
    const userInfo = { sub: 'user_id_from_token', name: 'User Name' }; // Replace with actual decoded info
    setUser(userInfo);
  };

  const handleGoogleLoginFailure = (error: any) => {
    console.error('Google Sign-In Error:', error);
  };

  const handleSubmit = async () => {
    if (!question || responseTypes.length === 0 || !user) {
      alert('Please fill in all fields and sign in before submitting.');
      return;
    }

    if (costEstimation && credits < costEstimation.totalCost) {
      alert('Insufficient credits. Please purchase more credits to continue.');
      return;
    }

    setLoading(true);
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

      // Deduct credits
      if (costEstimation) {
        const newBalance = credits - costEstimation.totalCost;
        await updateUserCredits(user.sub, newBalance);
        setCredits(newBalance);
      }
    } catch (error) {
      console.error('Error fetching responses:', error);
      alert('Error fetching responses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ''}>
      <Container maxWidth="md">
        <Typography variant="h2" component="h1" gutterBottom>
          🐝 HiveSight
        </Typography>
        {!user ? (
          <GoogleSignIn onSuccess={handleGoogleLoginSuccess} onError={handleGoogleLoginFailure} />
        ) : (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Welcome, {user.name}!
            </Typography>
            <CreditManagement userId={user.sub} credits={credits} onCreditsPurchased={fetchUserCredits} />
            <QuestionInput question={question} setQuestion={setQuestion} />
            <ResponseTypeSelector responseTypes={responseTypes} setResponseTypes={setResponseTypes} />
            <HiveSizeSelector hiveSize={hiveSize} setHiveSize={setHiveSize} />
            <PerspectiveSelector perspective={perspective} setPerspective={setPerspective} />
            {perspective === 'sample_americans' && (
              <DemographicFilters
                ageRange={ageRange}
                setAgeRange={setAgeRange}
                incomeRange={incomeRange}
                setIncomeRange={setIncomeRange}
              />
            )}
            <ModelSelector model={model} setModel={setModel} />
            <CostEstimation costEstimation={costEstimation} />
            <Box mt={2}>
              <Button 
                variant="contained" 
                onClick={handleSubmit} 
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Submit'}
              </Button>
            </Box>
            {results && <ResultsDisplay results={results} responseTypes={responseTypes} />}
          </>
        )}
      </Container>
    </GoogleOAuthProvider>
  );
}

export default App;