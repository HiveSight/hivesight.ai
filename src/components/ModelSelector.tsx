import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { MODEL_MAP, ModelType } from '../config';

interface ModelSelectorProps {
  model: ModelType;
  setModel: (model: ModelType) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ model, setModel }) => {
  return (
    <FormControl fullWidth margin="normal">
      <InputLabel id="model-select-label">GPT Model</InputLabel>
      <Select
        labelId="model-select-label"
        id="model-select"
        value={model}
        label="GPT Model"
        onChange={(e) => setModel(e.target.value as ModelType)}
      >
        {Object.keys(MODEL_MAP).map((modelKey) => (
          <MenuItem key={modelKey} value={modelKey}>
            {modelKey}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default ModelSelector;