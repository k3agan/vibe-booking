import React from 'react';
import { Container, Typography, Box, Paper, Button } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'; // Example icon
import Link from 'next/link';

export default function AvailabilityPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Availability Calendar
      </Typography>

      <Typography variant="body1" paragraph sx={{ mb: 4 }}>
        Check the calendar below to see currently available dates and times for booking the hall.
        Dates marked as booked are unavailable. Please use the inquiry form to request a specific date.
        {/* TODO: Add more specific instructions once calendar is implemented */}
      </Typography>

      {/* Placeholder for Interactive Calendar */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, minHeight: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <CalendarMonthIcon sx={{ fontSize: 60, color: 'action.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          [Interactive Availability Calendar Placeholder]
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          (Calendar functionality to be implemented)
        </Typography>
         {/* TODO: Integrate a calendar library (e.g., react-big-calendar, FullCalendar) or build custom */}
      </Paper>

      {/* Call to Action */}
      <Box textAlign="center">
        <Button variant="contained" size="large" component={Link} href="/booking-inquiry"> {/* Link to booking/inquiry page */}
          Request Booking / Inquire Now
        </Button>
      </Box>

    </Container>
  );
} 