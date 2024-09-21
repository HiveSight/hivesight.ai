import React from 'react';
import GoogleSignIn from './GoogleSignIn';
import { User } from '../types';

interface LoginProps {
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const Login: React.FC<LoginProps> = ({ setUser }) => {
  const handleLoginSuccess = (credentialResponse: any) => {
    const token = credentialResponse.access_token;
    localStorage.setItem('token', token);
    setUser({ loggedIn: true });
  };

  const handleLoginError = () => {
    console.error('Login Failed');
  };

  return (
    <div>
      <h2>Login with Google.</h2>
      <GoogleSignIn onSuccess={handleLoginSuccess} onError={handleLoginError} />
    </div>
  );
};

export default Login;
