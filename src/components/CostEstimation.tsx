import React from 'react';
import { Box, Typography } from '@mui/material';

interface CostEstimationProps {
  costEstimation: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  } | null;
}

const CostEstimation: React.FC<CostEstimationProps> = ({ costEstimation }) => {
  if (!costEstimation) return null;

  return (
    <Box mt={2}>
      <Typography variant="h6">Cost Estimation</Typography>
      <Typography>Input Tokens: {costEstimation.inputTokens}</Typography>
      <Typography>Output Tokens: {costEstimation.outputTokens}</Typography>
      <Typography>Total Cost: ${costEstimation.totalCost.toFixed(5)}</Typography>
    </Box>
  );
};

export default CostEstimation;