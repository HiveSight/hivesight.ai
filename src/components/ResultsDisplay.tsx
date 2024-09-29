import { useState } from 'react';
<<<<<<< HEAD
import {
  Typography,
  Paper,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  IconButton,
} from '@mui/material';
=======
import { Typography, Paper, Box, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Collapse, IconButton } from '@mui/material';
>>>>>>> aa11227da59c1ea3b3c103036bd86a513d9ed709
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { LIKERT_LABELS, LIKERT_COLORS } from '../config';
import { createPivotTable, calculateOverallDistribution } from '../utils/dataProcessing';
import ResponseSummary from './ResponseSummary';

interface Response {
  perspective: string;
  age: number;
  income: number;
  state: string;
  open_ended?: string;
  likert?: number;
}

// Type guard function to validate Likert labels
function isValidLikertLabel(label: string): label is keyof typeof LIKERT_COLORS {
  return label in LIKERT_COLORS;
}

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

interface Results {
  question: string;
  responses: Response[];
}

interface ResultsDisplayProps {
  responseTypes: string[];
  hiveSize: number;
  perspective: string;
  ageRange: [number, number];
  results: Results;
}

type ChartDataItem = {
  name: string;
  [key: string]: string | number;
};

function ResultsDisplay({
  responseTypes,
  results,
}: ResultsDisplayProps) {
  const [tabValue, setTabValue] = useState(0);
  const [openRawResults, setOpenRawResults] = useState(false);

  if (!results) {
    return <Typography>Loading...</Typography>;
  }

  const hasLikert = responseTypes.includes('likert');
  const hasOpenEnded = responseTypes.includes('open_ended');

  const allResponses = results.responses;

  const overallDistribution = hasLikert ? calculateOverallDistribution(allResponses) : null;
  const agePivot = hasLikert ? createPivotTable(allResponses, 'age') : null;
  const incomePivot = hasLikert ? createPivotTable(allResponses, 'income') : null;

  const renderChart = (data: ChartDataItem[], title: string) => (
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
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            reversed={title !== 'Overall Distribution of Responses'}
          />
          <XAxis
            type="number"
            domain={[0, 1]}
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
          />
          <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
          {LIKERT_LABELS.map((label) => (
            <Bar 
              key={label} 
              dataKey={label} 
              stackId="a" 
              fill={isValidLikertLabel(label) ? LIKERT_COLORS[label] : '#000000'}
            >
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

      {hasOpenEnded && <ResponseSummary responses={results.responses} />}

      {hasLikert && (
        <>
          {overallDistribution && renderChart([overallDistribution], "Overall Distribution of Responses")}

          <Box mt={4}>
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              centered
            >
              <Tab label="Likert by Age" />
              <Tab label="Likert by Income" />
            </Tabs>
          </Box>

          <Box mt={2}>
            {tabValue === 0 && agePivot && renderChart(agePivot, "Likert Scale Results by Age Group")}
            {tabValue === 1 && incomePivot && renderChart(incomePivot, "Likert Scale Results by Income Group")}
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
                {allResponses.map((response: Response, index: number) => (
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