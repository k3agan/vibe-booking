'use client'; // Keep for potential future client-side interactions, though not strictly needed now

import React from 'react'; // Removed useState
import { Container, Typography, Box, Grid, Button, Paper, Link as MuiLink, List, ListItem, ListItemIcon, ListItemText } from '@mui/material'; // Removed TextField, CircularProgress, Alert
import Link from 'next/link';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventAvailableIcon from '@mui/icons-material/EventAvailable'; // Icon for booking button
// Removed SendIcon
import { hallInfo } from '../data/hallInfo';

// Removed Server Action (sendContactEmail function)

export default function ContactPage() {
  // Removed state variables (isSubmitting, submitStatus)
  // Removed handleSubmit function

  const addressString = `${hallInfo.address.street}, ${hallInfo.address.city}, ${hallInfo.address.province}, ${hallInfo.address.postalCode}`;
  const staticMapUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2602.754983864563!2d-122.98668082355104!3d49.28103977139262!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x5486774d455d286f%3A0xb14757d048b9016b!2sCapital%20Hill%20Community%20Hall%2C%20361%20Howard%20Ave%2C%20Burnaby%2C%20BC%20V5B%203P7!5e0!3m2!1sen!2sca!4v1743729177882!5m2!1sen!2sca";

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Contact Us
      </Typography>
      <Typography variant="body1" paragraph sx={{ mb: 4 }}>
        Have questions? Want to discuss your event needs? Review our details below or proceed directly to our booking request form.
      </Typography>

      <Grid container spacing={4} justifyContent="center"> {/* Center the single item */}
        {/* Remove Contact Form Grid Item */}

        {/* Contact Details, CTA & Map - Now full width */}
        <Grid item xs={12} md={8}> {/* Use md={8} to constrain width slightly, centered by justifyContent */}
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Our Information
            </Typography>
            <List>
             {/* ... ListItems for Address, Email, Phone, Hours ... */}
              <ListItem>
                <ListItemIcon><LocationOnIcon /></ListItemIcon>
                <ListItemText primary="Address" secondary={addressString} />
              </ListItem>
              <ListItem>
                <ListItemIcon><EmailIcon /></ListItemIcon>
                <ListItemText primary="Email" secondary={<MuiLink href={`mailto:${hallInfo.email}`}>{hallInfo.email}</MuiLink>} />
              </ListItem>
              <ListItem>
                <ListItemIcon><PhoneIcon /></ListItemIcon>
                <ListItemText 
                  primary="Phone" 
                  secondary={
                    <Box>
                      <MuiLink 
                        href={`tel:${hallInfo.phone}`}
                        onClick={() => trackGenerateLead('CAD')}
                        sx={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        {hallInfo.phone}
                      </MuiLink>
                      <Typography variant="caption" display="block" sx={{ color: 'warning.main', mt: 0.5 }}>
                        ⚠️ May have interruptions due to staffing availability
                      </Typography>
                    </Box>
                  } 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><AccessTimeIcon /></ListItemIcon>
                <ListItemText primary="Phone Inquiry Hours" secondary="Monday to Sunday, 9 AM - 6 PM" />
              </ListItem>
            </List>

            {/* Contact Preference Note */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ color: 'info.contrastText', textAlign: 'center' }}>
                <strong>📧 We prefer email inquiries for general questions.</strong><br/>
                For booking requests, please use our online booking system below. Phone calls are reserved for urgent matters or emergencies.
              </Typography>
            </Box>

            {/* Add CTA Button Section */}
            <Box sx={{ textAlign: 'center', my: 4, py: 3, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
               <Typography variant="h6" component="h3" gutterBottom>
                 Ready to Book?
               </Typography>
               <Button
                  variant="contained"
                  size="large"
                  color="primary" // Use theme primary color
                  startIcon={<EventAvailableIcon />}
                  component={Link}
                  href="/book-now"
                >
                  Book Now
                </Button>
            </Box>

            <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 2 }}>
              Find Us
            </Typography>
            <Box
              component="iframe"
              src={staticMapUrl}
              width="100%"
              height="400" // Reduced height slightly as it's now in a narrower column
              sx={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Google Map showing location of ${hallInfo.name}`}
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
} 