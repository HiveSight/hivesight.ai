import React, { useState } from 'react';
import { 
  Container, 
  createTheme, 
  ThemeProvider, 
  CssBaseline 
} from '@mui/material';
import SimulationWizard from './components/SimulationWizard';
import LandingPage from './components/LandingPage';

const theme = createTheme({
  typography: {
    fontFamily: 'Poppins, Arial, sans-serif',
  },
});

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  const handleSignIn = () => {
    // Here you would typically handle the actual sign-in process
    // For now, we'll just set isSignedIn to true
    setIsSignedIn(true);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md">
        {isSignedIn ? (
          <SimulationWizard />
        ) : (
          <LandingPage onSignIn={handleSignIn} />
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;