import { useState } from 'react';
import { Typography, Paper, List, ListItem, ListItemText, Box, Tabs, Tab } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { LIKERT_LABELS, LIKERT_COLORS } from '../config';
import { createPivotTable, calculateOverallDistribution } from '../utils/dataProcessing';

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

  const hasLikert = responseTypes.includes('likert');

  const overallDistribution = hasLikert ? calculateOverallDistribution(results.responses) : null;
  const agePivot = hasLikert ? createPivotTable(results.responses, 'age') : null;
  const incomePivot = hasLikert ? createPivotTable(results.responses, 'income') : null;

  const renderChart = (data: any[], title: string) => (
    <>
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
    </>
  );

  return (
    <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
      <Typography variant="h5" gutterBottom>
        Results:
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>Question:</strong> {results.question}
      </Typography>

      {hasLikert && (
        <>
          {renderChart([overallDistribution], "Overall Distribution of Responses")}

          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} centered>
            <Tab label="Likert by Age" />
            <Tab label="Likert by Income" />
          </Tabs>

          <Box height={300} mt={4} mb={4}>
            {tabValue === 0 && renderChart(agePivot, "Likert Scale Results by Age Group")}
            {tabValue === 1 && renderChart(incomePivot, "Likert Scale Results by Income Group")}
          </Box>
        </>
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