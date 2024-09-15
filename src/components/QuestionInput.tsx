import React from 'react';
import { TextField } from '@mui/material';

interface QuestionInputProps {
  question: string;
  setQuestion: (question: string) => void;
}

function QuestionInput({ question, setQuestion }: QuestionInputProps) {
  return (
    <TextField
      fullWidth
      multiline
      rows={4}
      value={question}
      onChange={(e) => setQuestion(e.target.value)}
      label="Enter your question"
      variant="outlined"
      margin="normal"
    />
  );
}

export default QuestionInput;