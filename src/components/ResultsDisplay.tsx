import React from 'react';
import { Typography, Paper, List, ListItem, ListItemText, Box } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { LIKERT_LABELS, LIKERT_COLORS } from '../config';

interface ResultsDisplayProps {
  results: {
    question: string;
    responses: Array<{
      perspective: string;
      open_ended?: string;
      likert?: number;
    }>;
  };
}

function ResultsDisplay({ results }: ResultsDisplayProps) {
  const likertCounts = results.responses.reduce((acc, response) => {
    if (response.likert) {
      const label = LIKERT_LABELS[response.likert - 1];
      acc[label] = (acc[label] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const chartData = LIKERT_LABELS.map(label => ({
    name: label,
    value: likertCounts[label] || 0,
  }));

  return (
    <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
      <Typography variant="h5" gutterBottom>
        Results:
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>Question:</strong> {results.question}
      </Typography>

      {results.responses[0].likert && (
        <Box height={300} mt={4} mb={4}>
          <Typography variant="h6" gutterBottom>
            Likert Scale Results
          </Typography>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}

      <List>
        {results.responses.map((response, index) => (
          <ListItem key={index}>
            <ListItemText
              primary={`Response #${index + 1}`}
              secondary={
                <>
                  {response.open_ended && (
                    <Typography component="span" variant="body2" display="block">
                      <strong>Open-ended:</strong> {response.open_ended}
                    </Typography>
                  )}
                  {response.likert && (
                    <Typography component="span" variant="body2" display="block">
                      <strong>Likert Score:</strong> {response.likert} ({LIKERT_LABELS[response.likert - 1]})
                    </Typography>
                  )}
                  <Typography component="span" variant="body2" display="block">
                    <strong>Perspective:</strong> {response.perspective}
                  </Typography>
                </>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

export default ResultsDisplay;