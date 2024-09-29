import { useEffect, useState } from 'react';
import { getUserCredits } from './components/creditService';
import { supabase } from './components/supabaseClient';
import Login from './components/Login';
import { User } from './types';
import { 
  Button,
  Container, 
  createTheme, 
  ThemeProvider, 
  CssBaseline 
} from '@mui/material';
import SimulationWizard from './components/SimulationWizard';

const theme = createTheme({
  typography: {
    fontFamily: 'Poppins, Arial, sans-serif',
  },
});

function App() {

  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState(0)

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Current user:", user);
      console.log("Current user email:", user.email);
      const credits = await getUserCredits(user);
      console.log(credits);

      const { data, error } = await supabase.functions.invoke('hello-world', {
        body: JSON.stringify({ name: 'React App' }),
      });
      console.log(data.message);

      setUser(user);
    }
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed. Event:", _event);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    console.log("User signed out");
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md">
        {user ? (
          <div>
            <h2>Welcome, {user.email}</h2>
            <p>User ID: {user.id}</p>
            <p>Last Sign In: {new Date(user.last_sign_in_at || '').toLocaleString()}</p>
            <SimulationWizard setUser={setUser} />
            <Button variant="outlined" color="secondary" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        ) : (
          <Login setUser={setUser} />
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;
