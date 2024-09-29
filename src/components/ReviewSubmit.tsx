import { Typography, Box } from '@mui/material';

interface ReviewSubmitProps {
  question: string;
  responseTypes: string[];
  hiveSize: number;
  perspective: string;
  model: string;
  ageRange: [number, number];
  costEstimation: { inputTokens: number; outputTokens: number; totalCost: number } | null;
}

function ReviewSubmit({
  question,
  responseTypes,
  hiveSize,
  perspective,
  model
}: ReviewSubmitProps) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>Review your settings:</Typography>
      <Typography><strong>Question:</strong> {question}</Typography>
      <Typography><strong>Response Types:</strong> {responseTypes.join(', ')}</Typography>
      <Typography><strong>Hive Size:</strong> {hiveSize}</Typography>
      <Typography><strong>Perspective:</strong> {perspective}</Typography>
      <Typography><strong>Model:</strong> {model}</Typography>
    </Box>
  );
}

export default ReviewSubmit;