import React, { useState } from 'react';
import { Typography, Paper, List, ListItem, ListItemText, Box, Tabs, Tab } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { LIKERT_LABELS, LIKERT_COLORS } from '../config';

interface ResultsDisplayProps {
  results: {
    question: string;
    responses: Array<{
      perspective: string;
      age: number;
      income: number;
      state: string;
      open_ended?: string;
      likert?: number;
    }>;
  };
}

function ResultsDisplay({ results }: ResultsDisplayProps) {
  const [tabValue, setTabValue] = useState(0);

  const ageBins = [
    { min: 0, max: 18, label: '0-18' },
    { min: 19, max: 30, label: '19-30' },
    { min: 31, max: 50, label: '31-50' },
    { min: 51, max: 65, label: '51-65' },
    { min: 66, max: Infinity, label: '65+' },
  ];

  const incomeBins = [
    { min: 0, max: 30000, label: '$0-30k' },
    { min: 30001, max: 60000, label: '$30k-60k' },
    { min: 60001, max: 100000, label: '$60k-100k' },
    { min: 100001, max: Infinity, label: '$100k+' },
  ];

  const ageData = ageBins.map(bin => {
    const binResponses = results.responses.filter(r => r.age >= bin.min && r.age <= bin.max);
    const likertCounts = LIKERT_LABELS.map(label => ({
      name: label,
      value: binResponses.filter(r => r.likert === LIKERT_LABELS.indexOf(label) + 1).length,
    }));
    return {
      name: bin.label,
      ...Object.fromEntries(likertCounts.map(lc => [lc.name, lc.value])),
    };
  });

  const incomeData = incomeBins.map(bin => {
    const binResponses = results.responses.filter(r => r.income >= bin.min && r.income <= bin.max);
    const likertCounts = LIKERT_LABELS.map(label => ({
      name: label,
      value: binResponses.filter(r => r.likert === LIKERT_LABELS.indexOf(label) + 1).length,
    }));
    return {
      name: bin.label,
      ...Object.fromEntries(likertCounts.map(lc => [lc.name, lc.value])),
    };
  });

  return (
    <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
      <Typography variant="h5" gutterBottom>
        Results:
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>Question:</strong> {results.question}
      </Typography>

      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} centered>
        <Tab label="Likert by Age" />
        <Tab label="Likert by Income" />
      </Tabs>

      <Box height={400} mt={4} mb={4}>
        {tabValue === 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ageData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {LIKERT_LABELS.map((label, index) => (
                <Bar key={label} dataKey={label} stackId="a" fill={LIKERT_COLORS[label]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
        {tabValue === 1 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {LIKERT_LABELS.map((label, index) => (
                <Bar key={label} dataKey={label} stackId="a" fill={LIKERT_COLORS[label]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>

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
                  <Typography component="span" variant="body2" display="block">
                    <strong>Age:</strong> {response.age}
                  </Typography>
                  <Typography component="span" variant="body2" display="block">
                    <strong>Income:</strong> ${response.income.toLocaleString()}
                  </Typography>
                  <Typography component="span" variant="body2" display="block">
                    <strong>State:</strong> {response.state}
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