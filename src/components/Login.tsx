import React, { useCallback } from 'react';
import axios from 'axios';
import GoogleSignIn from './GoogleSignIn';
import { User } from '../types';

// TODO: get the email out of userInfo, update the User type
interface LoginProps {
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const Login: React.FC<LoginProps> = ({ setUser }) => {
  const handleLoginSuccess = useCallback(async (credentialResponse: any) => {
    const token = credentialResponse.access_token;
    console.log(credentialResponse);

    localStorage.setItem('token', token);
    setUser({ loggedIn: true });

    const userInfo = await axios.get(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      { headers: { Authorization: `Bearer ${token}` } }
    );
      
    console.log(userInfo);
  }, [setUser]);

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
