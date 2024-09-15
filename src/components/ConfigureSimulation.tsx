import React from 'react';
import Grid from '@mui/material/Grid2';
import { Typography, Paper } from '@mui/material';
import ResponseTypeSelector from './ResponseTypeSelector';
import HiveSizeSelector from './HiveSizeSelector';
import PerspectiveSelector from './PerspectiveSelector';
import DemographicFilters from './DemographicFilters';
import ModelSelector from './ModelSelector';

interface ConfigureSimulationProps {
  responseTypes: string[];
  setResponseTypes: (types: string[]) => void;
  hiveSize: number;
  setHiveSize: (size: number) => void;
  perspective: string;
  setPerspective: (perspective: string) => void;
  ageRange: [number, number];
  setAgeRange: (range: [number, number]) => void;
  incomeRange: [number, number];
  setIncomeRange: (range: [number, number]) => void;
  model: string;
  setModel: (model: string) => void;
}

function ConfigureSimulation(props: ConfigureSimulationProps) {
  return (
    <Grid container spacing={3}>
      <Grid xs={12} md={6}>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Response Configuration</Typography>
          <ResponseTypeSelector 
            responseTypes={props.responseTypes} 
            setResponseTypes={props.setResponseTypes} 
          />
          <HiveSizeSelector 
            hiveSize={props.hiveSize} 
            setHiveSize={props.setHiveSize} 
          />
        </Paper>
      </Grid>
      <Grid xs={12} md={6}>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Perspective</Typography>
          <PerspectiveSelector 
            perspective={props.perspective} 
            setPerspective={props.setPerspective} 
          />
          {props.perspective === 'sample_americans' && (
            <DemographicFilters
              ageRange={props.ageRange}
              setAgeRange={props.setAgeRange}
              incomeRange={props.incomeRange}
              setIncomeRange={props.setIncomeRange}
            />
          )}
        </Paper>
      </Grid>
      <Grid xs={12}>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Model Selection</Typography>
          <ModelSelector model={props.model} setModel={props.setModel} />
        </Paper>
      </Grid>
    </Grid>
  );
}

export default ConfigureSimulation;