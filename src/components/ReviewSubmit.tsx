import React from 'react';
import { Typography, Box } from '@mui/material';
import CostEstimation from './CostEstimation';

interface ReviewSubmitProps {
  question: string;
  responseTypes: string[];
  hiveSize: number;
  perspective: string;
  model: string;
  costEstimation: { inputTokens: number; outputTokens: number; totalCost: number } | null;
}

function ReviewSubmit({
  question,
  responseTypes,
  hiveSize,
  perspective,
  model,
  costEstimation
}: ReviewSubmitProps) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>Review your settings:</Typography>
      <Typography><strong>Question:</strong> {question}</Typography>
      <Typography><strong>Response Types:</strong> {responseTypes.join(', ')}</Typography>
      <Typography><strong>Hive Size:</strong> {hiveSize}</Typography>
      <Typography><strong>Perspective:</strong> {perspective}</Typography>
      <Typography><strong>Model:</strong> {model}</Typography>
      <CostEstimation costEstimation={costEstimation} />
    </Box>
  );
}

export default ReviewSubmit;