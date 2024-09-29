import React, { useCallback } from 'react';
import { supabase } from './supabaseClient';

interface LoginProps {
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const Login: React.FC<LoginProps> = ({ setUser }) => {
  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };
  const handleLoginError = () => {
    console.error('Login Failed');
  };
 
  return (
    <div>
      <h2>Login with Google.</h2>
      <button onClick={handleLogin} >Sign in with Google</button>
    </div>
  );
 };

export default Login;
