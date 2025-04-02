import React from 'react';
import { Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Link as MuiLink, Button } from '@mui/material';

// Placeholder data - replace with actual rates
const ratesData = [
  { category: 'Standard Rate', hourly: '$', halfDay: '$', fullDay: '$', weekend: '$' },
  { category: 'Non-Profit Rate', hourly: '$', halfDay: '$', fullDay: '$', weekend: '$' },
  // Add more categories if needed (e.g., Peak/Off-Peak)
];

export default function RatesPage() {
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
              <TableCell align="right">Hourly</TableCell>
              <TableCell align="right">Half-Day (4hrs)</TableCell> {/* Clarify duration if needed */}
              <TableCell align="right">Full-Day (8hrs+)</TableCell> {/* Clarify duration if needed */}
              <TableCell align="right">Weekend Package</TableCell> {/* Define package */}
            </TableRow>
          </TableHead>
          <TableBody>
            {ratesData.map((row) => (
              <TableRow key={row.category}>
                <TableCell component="th" scope="row">
                  {row.category}
                </TableCell>
                <TableCell align="right">{row.hourly}</TableCell>
                <TableCell align="right">{row.halfDay}</TableCell>
                <TableCell align="right">{row.fullDay}</TableCell>
                <TableCell align="right">{row.weekend}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Notes and Policies */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>Important Information:</Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
          <li>Deposit Requirement: [Details about deposit amount and when it's due]</li>
          <li>Payment Schedule: [Details about when full payment is expected]</li>
          <li>Accepted Payment Methods: [List accepted methods]</li>
          <li>Special rates available for registered non-profits (proof required).</li>
          <li>Peak/Off-Peak times may apply: [Explain if applicable]</li>
          <li>Multi-booking discounts may be available. Please inquire.</li>
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