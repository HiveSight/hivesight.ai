import React from 'react';
import { Button } from '@mui/material';
import { supabase } from './supabaseClient';


const Login: React.FC = () => {
  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  return (
    <div>
      <Button variant="contained" color="primary" onClick={handleLogin} sx={{ mt: 2 }}>
        Sign In with Google
      </Button>
    </div>
  );
 };

export default Login;
