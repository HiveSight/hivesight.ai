import { 
  Container, 
  createTheme, 
  ThemeProvider, 
  CssBaseline 
} from '@mui/material';
import SimulationWizard from './components/SimulationWizard';

// Create a theme with Poppins font
const theme = createTheme({
  typography: {
    fontFamily: 'Poppins, Arial, sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md">
        <SimulationWizard />
      </Container>
    </ThemeProvider>
  );
}

export default App;