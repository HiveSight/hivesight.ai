import React, { useState } from 'react';
import { Typography, Paper, Box, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Collapse, IconButton } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { LIKERT_LABELS, LIKERT_COLORS } from '../config';
import { createPivotTable, calculateOverallDistribution } from '../utils/dataProcessing';
import ResponseSummary from './ResponseSummary';

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
  responseTypes: string[];
}

function ResultsDisplay({ results, responseTypes }: ResultsDisplayProps) {
  const [tabValue, setTabValue] = useState(0);
  const [openRawResults, setOpenRawResults] = useState(false);

  const hasLikert = responseTypes.includes('likert');
  const hasOpenEnded = responseTypes.includes('open_ended');

  const overallDistribution = hasLikert ? calculateOverallDistribution(results.responses) : null;
  const agePivot = hasLikert ? createPivotTable(results.responses, 'age') : null;
  const incomePivot = hasLikert ? createPivotTable(results.responses, 'income') : null;

  const renderChart = (data: any[], title: string) => (
    <Box mt={2}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <YAxis type="category" dataKey="name" width={150} reversed={title !== "Overall Distribution of Responses"} />
          <XAxis type="number" domain={[0, 1]} tickFormatter={(value) => `${value * 100}%`} />
          <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
          {LIKERT_LABELS.map((label) => (
            <Bar key={label} dataKey={label} stackId="a" fill={LIKERT_COLORS[label]}>
              <LabelList dataKey={label} position="inside" formatter={(value: number) => (value > 0.05 ? `${(value * 100).toFixed(0)}%` : '')} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );

  return (
    <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
      <Typography variant="h5" gutterBottom>
        Results
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>Question:</strong> {results.question}
      </Typography>

      {hasOpenEnded && (
        <ResponseSummary responses={results.responses} />
      )}

      {hasLikert && (
        <>
          {renderChart([overallDistribution], "Overall Distribution of Responses")}

          <Box mt={4}>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} centered>
              <Tab label="Likert by Age" />
              <Tab label="Likert by Income" />
            </Tabs>
          </Box>

          <Box mt={2}>
            {tabValue === 0 && renderChart(agePivot, "Likert Scale Results by Age Group")}
            {tabValue === 1 && renderChart(incomePivot, "Likert Scale Results by Income Group")}
          </Box>
        </>
      )}

      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Raw Results
          <IconButton onClick={() => setOpenRawResults(!openRawResults)}>
            {openRawResults ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Typography>
        <Collapse in={openRawResults}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Perspective</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Income</TableCell>
                  <TableCell>State</TableCell>
                  {hasOpenEnded && <TableCell>Open-ended Response</TableCell>}
                  {hasLikert && <TableCell>Likert Score</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {results.responses.map((response, index) => (
                  <TableRow key={index}>
                    <TableCell>{response.perspective}</TableCell>
                    <TableCell>{response.age}</TableCell>
                    <TableCell>${response.income.toLocaleString()}</TableCell>
                    <TableCell>{response.state}</TableCell>
                    {hasOpenEnded && <TableCell>{response.open_ended}</TableCell>}
                    {hasLikert && <TableCell>{response.likert}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Collapse>
      </Box>
    </Paper>
  );
}

export default ResultsDisplay;