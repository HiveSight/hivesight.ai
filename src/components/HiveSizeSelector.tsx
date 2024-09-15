import React from 'react';
import { TextField } from '@mui/material';

interface HiveSizeSelectorProps {
  hiveSize: number;
  setHiveSize: (size: number) => void;
}

function HiveSizeSelector({ hiveSize, setHiveSize }: HiveSizeSelectorProps) {
  return (
    <TextField
      type="number"
      value={hiveSize}
      onChange={(e) => setHiveSize(Number(e.target.value))}
      label="Hive Size (Number of Responses)"
      variant="outlined"
      margin="normal"
      inputProps={{ min: 1, max: 1000 }}
    />
  );
}

export default HiveSizeSelector;