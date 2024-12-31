import React from 'react';
import { Typography, Paper } from '@mui/material';

/**
 * Since summarization previously relied on OpenAI calls client-side,
 * and we've now moved all logic server-side, we either:
 * - Implement a second llm_queries call for summarization, or
 * - Display a summary if it's included in the main responses.
 */

interface ResponseSummaryProps {
  responses: Array<{ 
    open_ended?: string;
    age: number;
    income: number;
    state: string;
  }>;
}

const ResponseSummary: React.FC<ResponseSummaryProps> = () => {
  return (
    <Paper elevation={2} style={{ padding: '1rem', marginTop: '1rem' }}>
      <Typography variant="h6" gutterBottom>Summary</Typography>
      <Typography>
        The responses have been collected server-side. In a full implementation,
        you could trigger another llm_query for summarization and once completed,
        fetch and display that summary here. For now, consider the responses 
        displayed below for insights.
      </Typography>
    </Paper>
  );
};

export default ResponseSummary;