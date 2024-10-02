import { React, useState } from 'react';
import { Box, Typography, Container, Grid, Button } from '@mui/material';
import AppLayout from './AppLayout';
import Login from './Login';

interface LandingPageProps {
  onSignIn: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
  return (
    <AppLayout>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            backgroundImage: 'url("/images/hero.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            padding: 3,
          }}
        >
          {/* HiveSight logo and name in upper left */}
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <img src="/logo.png" alt="HiveSight Logo" style={{ height: '24px', marginRight: '10px' }} />
            <Typography variant="h6" component="h1" sx={{ color: 'white' }}>
              HiveSight
            </Typography>
          </Box>

          <Typography variant="h2" component="h2" gutterBottom align="center" sx={{ maxWidth: '80%', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            Harness Collective<br></br>Artificial Intelligence
          </Typography>
          <Login />   
        </Box>
      </Box>
      <Container maxWidth="md" sx={{ mt: '100vh', position: 'relative', zIndex: 1 }}>
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
      </Container>
    </AppLayout>
  );
};

export default LandingPage;
