import { 
  Container, 
  createTheme, 
  ThemeProvider, 
  CssBaseline 
} from '@mui/material';
import SimulationWizard from './components/SimulationWizard';
import LandingPage from './components/LandingPage';
import { useState, useEffect } from 'react';
import { supabase } from './components/SupabaseClient';
import { User } from '@supabase/supabase-js';

const theme = createTheme({
  typography: {
    fontFamily: 'Poppins, Arial, sans-serif',
  },
});

function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      console.log("supabase user is", user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md">
        {user ? (
-         <SimulationWizard />
+         <SimulationWizard userId={user.id} />
        ) : (
          <LandingPage />
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;