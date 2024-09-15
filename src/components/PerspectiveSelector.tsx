import React from 'react';
import { FormControl, FormLabel, RadioGroup, FormControlLabel, Radio } from '@mui/material';

interface PerspectiveSelectorProps {
  perspective: string;
  setPerspective: (perspective: string) => void;
}

const PerspectiveSelector: React.FC<PerspectiveSelectorProps> = ({ perspective, setPerspective }) => {
  return (
    <FormControl component="fieldset" margin="normal">
      <FormLabel component="legend">Select Perspective</FormLabel>
      <RadioGroup
        aria-label="perspective"
        name="perspective"
        value={perspective}
        onChange={(e) => setPerspective(e.target.value)}
      >
        <FormControlLabel value="general_gpt" control={<Radio />} label="General GPT" />
        <FormControlLabel value="sample_americans" control={<Radio />} label="Sample of Americans" />
        <FormControlLabel value="custom_profiles" control={<Radio />} label="Custom Profiles" />
      </RadioGroup>
    </FormControl>
  );
};

export default PerspectiveSelector;