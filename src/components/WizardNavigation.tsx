import { Button, Box } from '@mui/material';

interface WizardNavigationProps {
  activeStep: number;
  loading: boolean;
  onBack: () => void;
  onNext: () => void;
  totalSteps: number;
}

export function WizardNavigation({
  activeStep,
  loading,
  onBack,
  onNext,
  totalSteps
}: WizardNavigationProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Button
        color="inherit"
        disabled={activeStep === 0 || loading}
        onClick={onBack}
        sx={{ mr: 1 }}
      >
        Back
      </Button>
      <Button
        variant="contained"
        color="primary"
        onClick={onNext}
        disabled={loading}
      >
        {activeStep === totalSteps - 1 ? 'Finish' : 'Next'}
      </Button>
    </Box>
  );
}