import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Button } from '@mui/material';

interface GoogleSignInProps {
  onSuccess: (tokenResponse: any) => void;
  onError: (error: any) => void;
}

const GoogleSignIn: React.FC<GoogleSignInProps> = ({ onSuccess, onError }) => {
  const login = useGoogleLogin({
    onSuccess,
    onError,
  });

  return (
    <Button
      onClick={() => login()}
      variant="contained"
      color="primary"
    >
      Sign in with Google
    </Button>
  );
};

export default GoogleSignIn;
