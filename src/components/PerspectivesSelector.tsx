import React from 'react';
import { FormGroup, FormControlLabel, Checkbox } from '@mui/material';

interface PerspectivesSelectorProps {
  perspectives: string[];
  setPerspectives: (perspectives: string[]) => void;
}

function PerspectivesSelector({ perspectives, setPerspectives }: PerspectivesSelectorProps) {
  const options = [
    { label: 'General GPT', value: 'general_gpt' },
    { label: 'Sample of Americans', value: 'sample_americans' },
    { label: 'Custom Profiles', value: 'custom_profiles' },
  ];

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setPerspectives(
      checked
        ? [...perspectives, value]
        : perspectives.filter((p) => p !== value)
    );
  };

  return (
    <FormGroup>
      {options.map((option) => (
        <FormControlLabel
          key={option.value}
          control={
            <Checkbox
              checked={perspectives.includes(option.value)}
              onChange={handleChange}
              value={option.value}
            />
          }
          label={option.label}
        />
      ))}
    </FormGroup>
  );
}

export default PerspectivesSelector;