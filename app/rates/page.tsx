'use client';

import React, { useEffect } from 'react';
import { Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Link as MuiLink, Button } from '@mui/material';
import { trackSelectContent } from '../../lib/gtm-events';

// Rental rates data
const ratesData = [
  { category: 'Weekday Rate', hourly: '$50', fullDay: '$750' },
  { category: 'Weekend Rate', hourly: '$100', fullDay: '$900' },
];

export default function RatesPage() {
  // Track rates page view
  useEffect(() => {
    trackSelectContent('rates_page', 'pricing_view');
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Rates & Packages
      </Typography>

      <Typography variant="body1" paragraph sx={{ mb: 4 }}>
        We offer competitive rates with the added benefit that your rental directly supports local charities. Find the option that best suits your event needs.
      </Typography>

      {/* Pricing Table */}
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table aria-label="rental rates table">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 'bold' } }}>
              <TableCell>Rate Category</TableCell>
              <TableCell align="right">Hourly Rate</TableCell>
              <TableCell align="right">Full-Day (8hrs+)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ratesData.map((row) => (
              <TableRow key={row.category}>
                <TableCell component="th" scope="row">
                  {row.category}
                </TableCell>
                <TableCell align="right">{row.hourly}</TableCell>
                <TableCell align="right">{row.fullDay}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>


      {/* Notes and Policies */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>Important Information:</Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
          <li><strong>Weekday Rates:</strong> Monday-Thursday, $50/hour or $750 for full day - limited availability</li>
          <li><strong>Weekend Rates:</strong> Friday-Sunday, $100/hour or $900 for full day</li>
        </Typography>
      </Box>

      {/* Link to Policies */}
      <Box textAlign="center"> {/* Center align the button/link */}
          <Button variant="outlined" component={MuiLink} href="/policies" sx={{ mr: 2 }}>
            View Full Rental Policies
          </Button>
           <Button variant="contained" component={MuiLink} href="/availability"> {/* Link to Availability or Booking */}
             Check Availability & Book
          </Button>
      </Box>

    </Container>
  );
} 