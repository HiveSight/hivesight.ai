import React from 'react';
import { Button } from '@mui/material';
import { supabase } from './SupabaseClient';

const Login: React.FC = () => {
  const handleLogin = async () => {
    try {
      const redirectUrl =
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:5173' // Local development URL
          : 'https://hivesight.ai'; // Production URL

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
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