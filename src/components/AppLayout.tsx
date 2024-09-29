import React from 'react';
import { Box, Typography, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import '@fontsource/poppins';

const theme = createTheme({
  typography: {
    fontFamily: 'Poppins, sans-serif',
  },
});

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '2rem'
      }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center">
            <img src="/logo.png" alt="HiveSight Logo" style={{ height: '24px', marginRight: '10px' }} />
            <Typography variant="h6" component="h1">
              HiveSight
            </Typography>
          </Box>
          {/* You can add additional header elements here if needed */}
        </Box>
        {children}
      </Box>
    </ThemeProvider>
  );
};

export default AppLayout;