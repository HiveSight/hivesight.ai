import React from 'react';
import { FormGroup, FormControlLabel, Checkbox } from '@mui/material';

interface ResponseTypeSelectorProps {
  responseTypes: string[];
  setResponseTypes: (responseTypes: string[]) => void;
}

function ResponseTypeSelector({ responseTypes, setResponseTypes }: ResponseTypeSelectorProps) {
  const options = [
    { label: 'Open-ended', value: 'open_ended' },
    { label: 'Likert Scale', value: 'likert' },
  ];

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setResponseTypes(
      checked
        ? [...responseTypes, value]
        : responseTypes.filter((type) => type !== value)
    );
  };

  return (
    <FormGroup>
      {options.map((option) => (
        <FormControlLabel
          key={option.value}
          control={
            <Checkbox
              checked={responseTypes.includes(option.value)}
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

export default ResponseTypeSelector;