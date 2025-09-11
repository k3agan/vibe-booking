import React from 'react';
import { Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Link as MuiLink, Button } from '@mui/material';

// Rental rates data
const ratesData = [
  { category: 'Weekday Rate', hourly: '$75', halfDay: '$300', fullDay: 'N/A', weekend: 'N/A' },
  { category: 'Weekend Rate', hourly: '$100', halfDay: '$400', fullDay: '$1000', weekend: '$1000' },
  { category: 'Non-Profit Rate', hourly: '$60', halfDay: '$240', fullDay: '$800', weekend: '$800' },
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
              <TableCell align="right">Hourly Rate</TableCell>
              <TableCell align="right">Half-Day (4hrs)</TableCell>
              <TableCell align="right">Full-Day (8hrs+)</TableCell>
              <TableCell align="right">Weekend Full-Day</TableCell>
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

      {/* Cleaning Fee Notice */}
      <Box sx={{ mb: 4, p: 3, bgcolor: 'primary.light', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>
          Mandatory Cleaning Fee
        </Typography>
        <Typography variant="body1" sx={{ color: 'primary.contrastText' }}>
          All bookings are subject to a mandatory cleaning fee of <strong>$200</strong>. This fee is applied to every rental regardless of duration or rate category.
        </Typography>
      </Box>

      {/* Notes and Policies */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>Important Information:</Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
          <li><strong>Cleaning Fee:</strong> A mandatory $200 cleaning fee applies to all bookings</li>
          <li><strong>Weekday Rates:</strong> Monday-Thursday, $75/hour or $300 for half-day (4 hours) - Evening and afternoon availability only</li>
          <li><strong>Weekend Rates:</strong> Friday-Sunday, $100/hour or $1000 for full day</li>
          <li><strong>Non-Profit Discount:</strong> 20% discount available for registered non-profits (proof required)</li>
          <li><strong>Weekday Availability:</strong> Limited to evenings and afternoons due to regular tenant bookings</li>
          <li><strong>Payment:</strong> Full payment required at time of booking</li>
          <li><strong>Multi-booking discounts:</strong> Available for multiple bookings - please inquire</li>
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