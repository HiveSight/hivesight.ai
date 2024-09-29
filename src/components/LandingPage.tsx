// LandingPage.tsx
import React from 'react';
import { Box, Typography, Container, Grid, Button } from '@mui/material';
import AppLayout from './AppLayout';

interface LandingPageProps {
  onSignIn: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
  return (
    <AppLayout>
      <Container maxWidth="md">
          <Typography variant="h5" component="h2" gutterBottom align="center">
            Harness Collective Artificial Intelligence
          </Typography>
          <Box my={4}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  What is HiveSight?
                </Typography>
                <Typography paragraph>
                  HiveSight is an innovative platform that simulates diverse perspectives on any question you pose. By leveraging advanced AI and demographic data, we provide insights that represent a wide range of viewpoints.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  How It Works
                </Typography>
                <Typography paragraph>
                  1. Ask a question<br />
                  2. Configure your simulation<br />
                  3. Get AI-generated responses<br />
                  4. Analyze the results
                </Typography>
              </Grid>
            </Grid>
          </Box>
          <Box mt={4} textAlign="center">
            <Typography variant="body2" sx={{ mt: 2 }}>
              Sign in to start exploring diverse perspectives!
            </Typography>
            <Button variant="contained" color="primary" onClick={onSignIn}>
              Simulate Sign In
            </Button>
          </Box>
      </Container>
    </AppLayout>
  );
};

export default LandingPage;