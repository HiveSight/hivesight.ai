import { useEffect, useState } from 'react';
import Login from './components/Login';
import { User } from './types';
import { 
  Container, 
  createTheme, 
  ThemeProvider, 
  CssBaseline 
} from '@mui/material';
import SimulationWizard from './components/SimulationWizard';

// Create a theme with Poppins font
const theme = createTheme({
  typography: {
    fontFamily: 'Poppins, Arial, sans-serif',
  },
});

function App() {

  const [user, setUser] = useState<User | null>(null);
 
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setUser({ loggedIn: true });
    }
  }, []); 

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md">
        {user ? (
          <SimulationWizard setUser={setUser} />
        ) : (
          <Login setUser={setUser} />
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;
