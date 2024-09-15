import React from 'react';
import { Typography, Slider, Box } from '@mui/material';

interface DemographicFiltersProps {
  ageRange: [number, number];
  setAgeRange: (range: [number, number]) => void;
  incomeRange: [number, number];
  setIncomeRange: (range: [number, number]) => void;
}

function DemographicFilters({ ageRange, setAgeRange, incomeRange, setIncomeRange }: DemographicFiltersProps) {
  return (
    <Box mt={2}>
      <Typography gutterBottom>Age Range</Typography>
      <Slider
        value={ageRange}
        onChange={(_, newValue) => setAgeRange(newValue as [number, number])}
        valueLabelDisplay="auto"
        min={0}
        max={100}
      />
      <Typography gutterBottom>Income Range ($)</Typography>
      <Slider
        value={incomeRange}
        onChange={(_, newValue) => setIncomeRange(newValue as [number, number])}
        valueLabelDisplay="auto"
        min={0}
        max={1000000}
        step={10000}
      />
    </Box>
  );
}

export default DemographicFilters;