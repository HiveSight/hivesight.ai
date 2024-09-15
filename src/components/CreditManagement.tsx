import React from 'react';
import { Button, Typography, Box } from '@mui/material';
import { createCheckoutSession } from '../services/creditSystem';

interface CreditManagementProps {
  userId: string;
  credits: number;
  onCreditsPurchased: () => void;
}

const CreditManagement: React.FC<CreditManagementProps> = ({ userId, credits, onCreditsPurchased }) => {
  const handleBuyCredits = async () => {
    try {
      await createCheckoutSession(userId, 1000); // Buy 1000 credits
      onCreditsPurchased();
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to initiate purchase. Please try again.');
    }
  };

  return (
    <Box>
      <Typography variant="h6">Your Credits: {credits}</Typography>
      <Button variant="contained" color="primary" onClick={handleBuyCredits}>
        Buy More Credits
      </Button>
    </Box>
  );
};

export default CreditManagement;