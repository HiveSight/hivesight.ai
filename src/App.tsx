import { useEffect, useState } from 'react';
import { supabase } from './components/supabaseClient';
import { getUserCredits } from './components/creditService';
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
  const [credits, setCredits] = useState(0)
 
  // useEffect(() => {
  //   const token = localStorage.getItem('token');
  //   if (token) {
  //     setUser({ loggedIn: true });
  //   }
  // }, []); 

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setUser({ loggedIn: true});
      fetchUserCredits(token);
    }
  }, []);

  const fetchUserCredits = async (token: string) => {
    try {
      const userCredits = await getUserCredits(token);
      console.log("User credits are:", userCredits);
      setCredits(userCredits);
    } catch (error) {
      console.error('Error fetching user credits:', error);
    }
  };

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
