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
        Please review our rental agreement and policies carefully before booking. Understanding these terms ensures a smooth and successful event for everyone.
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Key Rules & Responsibilities Summary
        </Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 3, color: 'text.secondary' }}>
           <li>Booking & Payment: [Brief summary of deposit, final payment deadlines]</li>
           <li>Cancellation: [Brief summary of cancellation terms, link to full policy]</li>
           <li>Setup & Cleanup: [Brief summary of renter responsibilities, time constraints]</li>
           <li>Decorations: [Brief summary of key restrictions (e.g., no wall attachments, confetti)]</li>
           <li>Alcohol & Smoking: [Brief summary of policies]</li>
           <li>Noise Levels: [Brief summary of restrictions]</li>
           <li>Capacity Limits: [State maximum occupancy]</li>
           <li>Insurance: [Briefly state if required]</li>
           <li>Damages: [Renter responsibility for damages]</li>
           {/* Add other critical points */}
        </Typography>
        <Typography variant="body1">
          This is a summary only. Please refer to the full Rental Agreement for complete details.
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