import React from 'react';
import { Container, Typography, Box, Paper, Button } from '@mui/material';
// Remove CalendarMonthIcon import if no longer needed
// import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import Link from 'next/link';

export default function AvailabilityPage() {
  // Construct the Google Calendar embed URL using the correct calendar ID
  const calendarId = "capitolhillhallrent@gmail.com";
  const encodedCalendarId = encodeURIComponent(calendarId);
  const timezone = "America/Vancouver"; // Set appropriate timezone
  const encodedTimezone = encodeURIComponent(timezone);
  // Configure for weekly view with better visibility and ensure events show
  const calendarEmbedUrl = `https://calendar.google.com/calendar/embed?src=${encodedCalendarId}&ctz=${encodedTimezone}&mode=WEEK&showTitle=0&showNav=1&showDate=1&showTabs=1&showCalendars=1&showTz=0&wkst=1`;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Availability Calendar
      </Typography>

      <Typography variant="body1" paragraph sx={{ mb: 4 }}>
        Check the weekly calendar below to see currently available dates and times for booking the hall.
        <strong>Available slots are those not marked as busy.</strong> The calendar shows in weekly view for easy planning.
      </Typography>

      <Box sx={{ mb: 3, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'info.contrastText' }}>
          📅 How to Use This Calendar
        </Typography>
        <Typography variant="body2" sx={{ color: 'info.contrastText' }}>
          • <strong>White/empty spaces</strong> = Available for booking<br/>
          • <strong>Colored blocks</strong> = Already booked<br/>
          • <strong>Weekday availability</strong> = Evenings and afternoons only (Monday-Thursday)<br/>
          • <strong>Weekend availability</strong> = Full day options (Friday-Sunday)
        </Typography>
      </Box>

      {/* Google Calendar Embed with enhanced styling */}
      <Paper 
        elevation={6} 
        sx={{ 
          p: 2, 
          borderRadius: 3,
          background: 'linear-gradient(145deg, #f8f9fa, #e9ecef)',
          border: '1px solid #dee2e6',
          mb: 4,
          overflow: 'hidden'
        }}
      >
        <Box
          component="iframe"
          src={calendarEmbedUrl}
          sx={{ 
            border: 0, 
            display: 'block', 
            width: '100%', 
            height: { xs: '600px', sm: '700px', md: '800px', lg: '900px' },
            borderRadius: 2,
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.15)',
            }
          }} 
          frameBorder="0"
          scrolling="no" 
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