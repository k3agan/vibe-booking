'use client';

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { CalendarToday } from '@mui/icons-material';

interface ScrollableCalendarProps {
  calendarId: string;
  title?: string;
  height?: string;
}

export default function ScrollableCalendar({ 
  calendarId, 
  title = "Upcoming Events",
  height = "400px"
}: ScrollableCalendarProps) {
  // Extract the calendar ID from the Google Calendar URL
  const calendarEmbedId = calendarId.includes('cid=') 
    ? calendarId.split('cid=')[1] 
    : calendarId;

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <CalendarToday color="primary" sx={{ mr: 1, fontSize: 28 }} />
        <Typography variant="h5" component="h3">
          {title}
        </Typography>
      </Box>
      
      <Box 
        sx={{ 
          height: height,
          width: '100%',
          overflow: 'hidden',
          borderRadius: 2,
          border: '1px solid #e0e0e0'
        }}
      >
        <iframe
          src={`https://calendar.google.com/calendar/embed?src=${calendarEmbedId}&ctz=America/Vancouver&mode=AGENDA&showTitle=0&showNav=0&showDate=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0&height=${height.replace('px', '')}`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '8px'
          }}
          title="Community Calendar"
        />
      </Box>
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Scroll to view more events. Click on any event for more details.
      </Typography>
    </Paper>
  );
}
