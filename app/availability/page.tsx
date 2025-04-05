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

      {/* Google Calendar Embed - Remove wrapping Paper */}
      {/* <Paper elevation={3} sx={{ ... }}> */}
        <Box
          component="iframe"
          src={calendarEmbedUrl}
          sx={{ 
            border: 0, 
            display: 'block', 
            width: '100%', 
            maxWidth: 'lg', // Constrain iframe width directly
            mx: 'auto', // Center iframe
            mb: 4 // Add bottom margin for spacing
          }} 
          height="850" // Increase height significantly again
          frameBorder="0"
          scrolling="no" 
          title="Hall Availability Calendar"
        />
      {/* </Paper> */}

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