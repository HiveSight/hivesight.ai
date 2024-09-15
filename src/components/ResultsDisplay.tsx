import React, { useState } from 'react';
import { Typography, Paper, List, ListItem, ListItemText, Box, Tabs, Tab } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { LIKERT_LABELS, LIKERT_COLORS } from '../config';

interface ResultsDisplayProps {
  results: {
    question: string;
    responses: Array<{
      perspective: string;
      age: number;
      income: number;
      open_ended?: string;
      likert?: number;
    }>;
  };
}

function ResultsDisplay({ results }: ResultsDisplayProps) {
  const [tabValue, setTabValue] = useState(0);

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

  const ageBins = [
    { min: 0, max: 18, label: '0-18' },
    { min: 19, max: 30, label: '19-30' },
    { min: 31, max: 50, label: '31-50' },
    { min: 51, max: 65, label: '51-65' },
    { min: 66, max: Infinity, label: '65+' },
  ];

  const ageData = ageBins.map(bin => ({
    name: bin.label,
    value: results.responses.filter(r => r.age >= bin.min && r.age <= bin.max).length,
  }));

  const incomeBins = [
    { min: 0, max: 30000, label: '$0-30k' },
    { min: 30001, max: 60000, label: '$30k-60k' },
    { min: 60001, max: 100000, label: '$60k-100k' },
    { min: 100001, max: Infinity, label: '$100k+' },
  ];

  const incomeData = incomeBins.map(bin => ({
    name: bin.label,
    value: results.responses.filter(r => r.income >= bin.min && r.income <= bin.max).length,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
      <Typography variant="h5" gutterBottom>
        Results:
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>Question:</strong> {results.question}
      </Typography>

      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} centered>
        <Tab label="Likert Scale" />
        <Tab label="Age Distribution" />
        <Tab label="Income Distribution" />
      </Tabs>

      <Box height={300} mt={4} mb={4}>
        {tabValue === 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        )}
        {tabValue === 1 && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ageData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {ageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
        {tabValue === 2 && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={incomeData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {incomeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
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