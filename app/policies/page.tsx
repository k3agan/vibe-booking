import React from 'react';
import { Container, Typography, Box, Paper, Button, Link as MuiLink, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel'; // Example icon for rules
import DescriptionIcon from '@mui/icons-material/Description'; // Icon for document

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
           <li><strong>Payment:</strong> Full balance and damage deposit due 31 days prior to event</li>
           <li><strong>Cancellation:</strong> 21 days notice required for refund; 50% cancellation fee (max $450)</li>
           <li><strong>Event Hours:</strong> All guests must vacate by 11:00 PM; hall cleaned and vacated by 12:00 AM</li>
           <li><strong>Decorations:</strong> No confetti, rice, glitter, beads, or similar items; no wall attachments</li>
           <li><strong>Alcohol:</strong> Requires liquor license, Serving it Right, Food Safe, and additional $200,000 insurance</li>
           <li><strong>Noise:</strong> Music must cease at 11:00 PM; respect Burnaby noise bylaws</li>
           <li><strong>Capacity:</strong> Maximum 140 persons; clear access to fire exits required</li>
           <li><strong>Insurance:</strong> Renter must provide liability insurance proof at time of deposit</li>
           <li><strong>Setup/Cleanup:</strong> Renter responsible for all setup, takedown, and cleaning per checklist</li>
           <li><strong>Key Access:</strong> Renter unlocks lockbox for key at start, returns to office before leaving</li>
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
          variant="contained"
          startIcon={<DescriptionIcon />}
          href="https://drive.google.com/file/d/15EikKMr1QP4vmVrKq7h7gp1XXlevhnQW/view?usp=sharing" // Updated with Google Drive link
          target="_blank" // Keep target blank to open in new tab
          rel="noopener noreferrer"
          sx={{ mr: 2 }}
        >
          View/Download Rental Agreement (PDF)
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