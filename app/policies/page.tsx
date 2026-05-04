import React from 'react';
import { Container, Typography, Box, Paper, Button, Link as MuiLink, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel'; // Example icon for rules
import DescriptionIcon from '@mui/icons-material/Description'; // Icon for document
import Link from 'next/link';

export default function PoliciesPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Rental Agreement & Policies
      </Typography>
      <Typography variant="body1" paragraph sx={{ mb: 4 }}>
        Please review our rental agreement and policies carefully before booking. These terms are legally binding and will be presented for your acceptance during the booking process. Understanding these requirements ensures a smooth and successful event for everyone.
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Key Rules & Responsibilities Summary
        </Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 3, color: 'text.secondary' }}>
           <li><strong>Payment:</strong> Full rental balance to be paid at the time of booking. The Association reserves the right to charge up to 50% of the booking rate as a damage deposit if necessary.</li>
           <li><strong>Cancellation:</strong> 21 days notice required for refund; 50% cancellation fee (max $450).</li>
          <li><strong>Event Hours:</strong> Standard bookings end at 10:00 PM. Late access is available for a fee until 12:00 AM; after-midnight access can extend until 2:00 AM when arranged in advance.</li>
           <li><strong>Decorations:</strong> No confetti, rice, glitter, beads, or similar items; no wall attachments</li>
           <li><strong>Alcohol:</strong> Requires liquor license and Serving It Right. Food Safe is only required if the event is open to the public.</li>
          <li><strong>Noise:</strong> Music must cease at your booked end time; strictly comply with Burnaby Noise or Sound Abatement Bylaw (max 75 dBA after 10:00 PM).</li>
           <li><strong>Capacity:</strong> Maximum 140 persons; clear access to fire exits required</li>
           <li><strong>Insurance:</strong> Renter must provide liability insurance proof. <a href="https://duuo.ca/" target="_blank" rel="noopener noreferrer">Duuo Event Insurance</a> is recommended (approx. $25 - $200+ depending on alcohol/attendees).</li>
           <li><strong>Setup/Cleanup:</strong> Renter responsible for setup, takedown, and cleaning up after themselves per the Hall Closing Checklist (spot clean spills, remove confetti/tape/decorations, take out garbage). Contractors handle regular deep cleaning twice a week — no deep-clean required from renters.</li>
           <li><strong>Access:</strong> Access codes will be sent via email prior to your event (we no longer use lockboxes).</li>
           <li><strong>Age Requirement:</strong> Responsible adult (19+) must remain on premises at all times</li>
        </Typography>
        <Typography variant="body1">
          This is a summary only. The complete rental agreement will be presented during the booking process and must be accepted before payment can be processed.
        </Typography>
      </Paper>

      <Box sx={{ textAlign: 'center', mb: 4 }}>
         <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>
           Full Rental Agreement Document
        </Typography>
        {/* Option 1: Link to a PDF - Use the provided Google Drive link */}
        <Button
          component={Link}
          variant="contained"
          startIcon={<DescriptionIcon />}
          href="/contract"
          sx={{ mr: 2 }}
        >
          View / Print Rental Agreement
        </Button>

        {/* Option 2: Or Embed the document viewer (if feasible/desired) */}
        {/* <Box sx={{ border: '1px solid grey', height: '600px', mt: 2 }}>[Document Embed Placeholder]</Box> */}
      </Box>

      <Typography variant="body2" align="center" sx={{ color: 'text.secondary' }}>
        If you have any questions regarding these policies, please don't hesitate to <MuiLink href="/contact">contact us</MuiLink>.
      </Typography>
    </Container>
  );
} 