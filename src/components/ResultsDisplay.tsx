import { useState } from 'react';
import {
  Typography,
  Box,
  Tabs,
  Tab,
  Collapse,
  IconButton,
  Paper,
} from '@mui/material';
import { KeyboardArrowUp, KeyboardArrowDown } from '@mui/icons-material';
import { createPivotTable, calculateOverallDistribution } from '../utils/dataProcessing';
import ResponseSummary from './ResponseSummary';
import LikertChart from './LikertChart';
import RawResultsTable from './RawResultsTable';

interface Response {
  perspective: string;
  age: number;
  income: number;
  state: string;
  open_ended?: string;
  likert?: number;
}

interface Results {
  question: string;
  responses: Response[];
}

interface ResultsDisplayProps {
  responseTypes: string[];
  results: Results;
}

function ResultsDisplay({ responseTypes, results }: ResultsDisplayProps) {
  const [tabValue, setTabValue] = useState(0);
  const [openRawResults, setOpenRawResults] = useState(false);

  if (!results) {
    return <Typography>Loading...</Typography>;
  }

  const hasLikert = responseTypes.includes('likert');
  const hasOpenEnded = responseTypes.includes('open_ended');

  const allResponses = results.responses;

  const overallDistribution = hasLikert
    ? calculateOverallDistribution(allResponses)
    : null;
  const agePivot = hasLikert
    ? createPivotTable(allResponses, 'age')
    : null;
  const incomePivot = hasLikert
    ? createPivotTable(allResponses, 'income')
    : null;

  return (
    <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
      <Typography variant="h5" gutterBottom>
        Results
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>Question:</strong> {results.question}
      </Typography>

      {hasOpenEnded && (
        <ResponseSummary responses={allResponses.filter((res) => res.open_ended)} />
      )}

      {hasLikert && (
        <>
          {overallDistribution && (
            <LikertChart
              data={[overallDistribution]}
              title="Overall Distribution of Responses"
            />
          )}

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
            {tabValue === 0 && agePivot && (
              <LikertChart
                data={agePivot}
                title="Likert Scale Results by Age Group"
              />
            )}
            {tabValue === 1 && incomePivot && (
              <LikertChart
                data={incomePivot}
                title="Likert Scale Results by Income Group"
              />
            )}
          </Box>
        </>
      )}

      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Raw Results
          <IconButton onClick={() => setOpenRawResults(!openRawResults)}>
            {openRawResults ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </Typography>
        <Collapse in={openRawResults}>
          <RawResultsTable
            responses={allResponses}
            hasOpenEnded={hasOpenEnded}
            hasLikert={hasLikert}
          />
        </Collapse>
      </Box>
    </Paper>
  );
}

export default ResultsDisplay;