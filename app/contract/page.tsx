'use client';

import React from 'react';
import { Container, Typography, Box, Paper, Button, List, ListItem, ListItemText, Divider } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';

export default function ContractPage() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      {/* Hide controls when printing */}
      <Box sx={{ '@media print': { display: 'none' }, display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button 
          component={Link} 
          href="/policies" 
          startIcon={<ArrowBackIcon />}
          color="inherit"
        >
          Back to Policies
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<PrintIcon />} 
          onClick={handlePrint}
        >
          Print / Save as PDF
        </Button>
      </Box>

      <Paper elevation={3} sx={{ p: { xs: 3, md: 6 }, '@media print': { boxShadow: 'none', p: 0 } }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom sx={{ fontWeight: 'bold' }}>
          Capitol Hill Community Hall Association
        </Typography>
        <Typography variant="h5" component="h2" align="center" gutterBottom color="text.secondary">
          Rental Agreement
        </Typography>

        <Box sx={{ my: 4 }}>
          <Typography variant="body1" paragraph>
            <strong>Hall Address:</strong> 361 Howard Avenue, Burnaby, B.C. V5B 3P7
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            <em>(The following fields are completed electronically during the booking process)</em>
          </Typography>
          <Box sx={{ pl: 2, borderLeft: '3px solid #e0e0e0', mb: 4 }}>
            <Typography variant="body1"><strong>Renter Name:</strong> ___________________________</Typography>
            <Typography variant="body1"><strong>Event Date:</strong> ___________________________</Typography>
            <Typography variant="body1"><strong>Time Period:</strong> ___________ to ___________</Typography>
            <Typography variant="body1"><strong>Type of Event:</strong> ___________________________</Typography>
            <Typography variant="body1"><strong>Approx. Attendees:</strong> ___________________________</Typography>
            <Typography variant="body1"><strong>Contact Info:</strong> Phone: ______________ Email: ______________</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          1. Payment & Cancellation
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="The full rental balance is paid at the time of booking. The Association reserves the right to charge up to 50% of the booking rate as a damage deposit if necessary." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Notice of cancellation must be received 21 days in advance of the event to receive a refund. The Cancellation Fee is 50% of the Rental Fee up to a maximum of $450." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
          2. Event Hours & Noise Rules
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Standard bookings end at 10:00 p.m. Late access is available for a fee until 12:00 a.m. After-midnight access can extend until 2:00 a.m. only when arranged in advance. The Hall must be vacated by your booked end time." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Music must cease at your booked end time. Please respect our neighbours and strictly comply with the Burnaby Noise or Sound Abatement Bylaw. Noise levels must be kept reasonable and drop significantly (max 75 dBA) after 10:00 p.m. Renters are responsible for any fines incurred due to noise complaints." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
          3. Access & Security
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="We no longer use lockboxes. You will receive an email with your access code prior to your event." />
          </ListItem>
          <ListItem>
            <ListItemText primary="This agreement must be signed by a responsible adult (19 years or older). This individual must remain with the group on the premises at all times and is responsible for all group actions." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
          4. Insurance, Alcohol & Food
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Renters must take out liability insurance covering the use of the premises and provide proof of insurance. We recommend using Duuo Event Insurance (https://duuo.ca/). Costs vary from approximately $25 for non-liquor events up to $200+ for events with alcohol, depending on attendee count." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Alcoholic beverages are only allowed if the Renter has obtained and presented: a Liquor/Cannabis License, and a Serving It Right certificate." />
          </ListItem>
          <ListItem>
            <ListItemText primary="A Food Safe certificate is only required if the event is open to the public (it is not strictly required for private events)." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
          5. Hall Usage & Decorations
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="NO confetti, rice, glitter, beads, or similar items are allowed in the facility. Renters will be charged for any extra clean-up required if these are found." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Do not install or permit the installation of any wiring, electrical appliances, plugs, nails, tape, tacks, pins, screws, staples, or gum on any surfaces." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Fire Department regulations limit the hall capacity to 140 persons maximum. Clear access to fire exits must be maintained." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Chairs and tables are provided. The Renter must set them up, clean them, and stack them back in the appropriate cupboards as they were found." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
          6. Cleaning Responsibilities
        </Typography>
        <Typography variant="body1" paragraph sx={{ pl: 2 }}>
          The Hall is professionally cleaned twice a week, so you are not expected to deep-clean. However, you are responsible for basic clean-up per the Hall Closing Checklist, which includes:
        </Typography>
        <List dense sx={{ pl: 2 }}>
          <ListItem><ListItemText primary="• Spot cleaning spills on floors or counters." /></ListItem>
          <ListItem><ListItemText primary="• Wiping down tables/chairs if soiled." /></ListItem>
          <ListItem><ListItemText primary="• Removing all decorations, food, and items you brought in." /></ListItem>
          <ListItem><ListItemText primary="• Emptying garbage/recycling into the outdoor bins." /></ListItem>
          <ListItem><ListItemText primary="• Ensuring all doors/windows are locked and lights/appliances are turned off before leaving." /></ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
          7. Liability & Indemnity
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="The Renter agrees to pay for any damage to the building, furnishings, or equipment resulting from the rental." />
          </ListItem>
          <ListItem>
            <ListItemText primary="The Renter agrees to indemnify and hold harmless the Association from all costs, loss, damage, or claims arising from the use of the premises." />
          </ListItem>
          <ListItem>
            <ListItemText primary="The Association is not responsible for any loss, damage, or injury suffered by the Renter or guests." />
          </ListItem>
          <ListItem>
            <ListItemText primary="The Renter must comply with all laws, bylaws, and regulations, obtaining any necessary permits." />
          </ListItem>
        </List>

        <Divider sx={{ my: 4 }} />

        <Typography variant="body2" align="center" color="text.secondary" paragraph>
          <em>The Association reserves the right to cancel any event due to circumstances beyond its control (deposit fully refunded), if misrepresented, or to refuse any Renter at any time.</em>
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 8, px: 4 }}>
          <Box sx={{ width: '40%' }}>
            <Divider sx={{ mb: 1, borderColor: '#000' }} />
            <Typography variant="body2">SIGNED (Renter)</Typography>
          </Box>
          <Box sx={{ width: '40%' }}>
            <Divider sx={{ mb: 1, borderColor: '#000' }} />
            <Typography variant="body2">SIGNED (Association)</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, px: 4, mb: 4 }}>
          <Box sx={{ width: '40%' }}>
            <Divider sx={{ mb: 1, borderColor: '#000' }} />
            <Typography variant="body2">Date</Typography>
          </Box>
          <Box sx={{ width: '40%' }}>
            <Divider sx={{ mb: 1, borderColor: '#000' }} />
            <Typography variant="body2">Date</Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
