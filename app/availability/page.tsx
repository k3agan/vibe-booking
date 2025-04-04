import React from 'react';
import { Container, Typography, Box, Paper, Button } from '@mui/material';
// Remove CalendarMonthIcon import if no longer needed
// import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import Link from 'next/link';

export default function AvailabilityPage() {
  // Construct the Google Calendar embed URL
  const calendarId = "capitol.hill.hall@gmail.com";
  const encodedCalendarId = encodeURIComponent(calendarId);
  const timezone = "America/Vancouver"; // Set appropriate timezone
  const encodedTimezone = encodeURIComponent(timezone);
  // Revert to default view (remove mode=AGENDA)
  const calendarEmbedUrl = `https://calendar.google.com/calendar/embed?src=${encodedCalendarId}&ctz=${encodedTimezone}`;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Availability Calendar
      </Typography>

      <Typography variant="body1" paragraph sx={{ mb: 4 }}>
        Check the calendar below to see currently available dates and times for booking the hall.
        Please note that this calendar shows booked times. Available slots are those not marked as busy.
        {/* Update instructions as needed based on calendar view */}
      </Typography>

      {/* Google Calendar Embed */}
      <Paper elevation={3} sx={{ 
          maxWidth: 'lg',
          mx: 'auto',
          p: {xs: 1, sm: 2, md: 3}, 
          mb: 4 
         }}>
        <Box
          component="iframe"
          src={calendarEmbedUrl}
          sx={{ border: 0, display: 'block' }} // Added display: block to potentially help layout
          width="100%"
          height="600" // Keep standard height
          frameBorder="0"
          scrolling="no" // Keep this to prevent iframe's own scrollbars
          title="Hall Availability Calendar"
        />
      </Paper>

      {/* Call to Action */}
      <Box textAlign="center">
        <Button
          variant="contained"
          size="large"
          component="a" // Change component to 'a' for external link
          href="https://forms.gle/C4ZhDP7v73Ds3pr47" // Link to Google Form
          target="_blank" // Open in new tab
          rel="noopener noreferrer" // Security for target="_blank"
        >
          Request Booking / Inquire Now
        </Button>
      </Box>

    </Container>
  );
} 