import React from 'react';
import { Box, Container, Typography, Grid, Link } from '@mui/material';
import { hallInfo } from '../data/hallInfo';

function Copyright() {
  return (
    <Typography variant="body2" color="text.secondary" align="center">
      {'Copyright © '}
      <Link color="inherit" href="/">
        {hallInfo.name}
      </Link>{' '}
      {new Date().getFullYear()}
      {'. All rights reserved.'}
    </Typography>
  );
}

export default function Footer() {
  return (
    <Box component="footer" sx={{ bgcolor: 'background.paper', py: 4, mt: 'auto' }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            {hallInfo.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {hallInfo.address.city}, {hallInfo.address.province}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.5 }}>
            <Link href="/admin" color="inherit" sx={{ textDecoration: 'none' }}>Admin</Link> | 
            <Link href="/my-bookings" color="inherit" sx={{ textDecoration: 'none', ml: 1 }}>My Bookings</Link> |
            <Link href="/privacy" color="inherit" sx={{ textDecoration: 'none', ml: 1 }}>Privacy Policy</Link>
          </Typography>
          <Copyright />
        </Box>
      </Container>
    </Box>
  );
} 