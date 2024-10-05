import React, { useState, useEffect } from 'react';
import { Typography, Paper, CircularProgress } from '@mui/material';
import { queryOpenAI } from '../services/openAIService';
import { ModelType } from '../config';

interface ResponseSummaryProps {
  responses: Array<{ 
    open_ended?: string;
    age: number;
    income: number;
    state: string;
  }>;
  model: ModelType;
}

const ResponseSummary: React.FC<ResponseSummaryProps> = ({ responses, model }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getSummary = async () => {
      const formattedResponses = responses
        .filter(r => r.open_ended)
        .map(r => `Response: "${r.open_ended}"
Age: ${r.age}
Income: $${r.income}
State: ${r.state}
---`).join('\n');

      const prompt = `Summarize the following responses and provide insights into how different demographic groups (based on age, income, and location) responded:

${formattedResponses}

Please provide:
1. A concise summary of the overall responses
2. Insights into how different age groups responded
3. Insights into how income levels affected responses
4. Any notable regional differences in responses
5. Key takeaways from the responses

Write your result in plain text, not markdown.
`;

      try {
        console.log('[Response Summary] Generating summary');
        const result = await queryOpenAI([prompt], model);
        setSummary(result[0].content);
      } catch (error) {
        console.error('Error generating summary:', error);
        setError('Unable to generate summary. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    getSummary();
  }, [responses, model]);


  if (loading) {
    return (
      <Paper elevation={2} style={{ padding: '1rem', marginTop: '1rem', textAlign: 'center' }}>
        <CircularProgress />
        <Typography>Generating summary and insights...</Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={2} style={{ padding: '1rem', marginTop: '1rem' }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} style={{ padding: '1rem', marginTop: '1rem' }}>
      <Typography variant="h6" gutterBottom>Response Summary and Insights</Typography>
      <Typography component="div">
        {summary?.split('\n').map((paragraph, index) => (
          <Typography key={index} paragraph>
            {paragraph}
          </Typography>
        ))}
      </Typography>
    </Paper>
  );
};

export default ResponseSummary;