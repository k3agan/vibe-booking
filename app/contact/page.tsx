import React from 'react';
import { Container, Typography, Box, Grid, TextField, Button, Paper, Link as MuiLink, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SendIcon from '@mui/icons-material/Send';
import { hallInfo } from '../data/hallInfo'; // Import hall data

export default function ContactPage() {
  // Construct the full address string for display
  const addressString = `${hallInfo.address.street}, ${hallInfo.address.city}, ${hallInfo.address.province}, ${hallInfo.address.postalCode}`;
  // Use the specific map embed URL provided by the user
  const staticMapUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2602.754983864563!2d-122.98668082355104!3d49.28103977139262!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x5486774d455d286f%3A0xb14757d048b9016b!2sCapital%20Hill%20Community%20Hall%2C%20361%20Howard%20Ave%2C%20Burnaby%2C%20BC%20V5B%203P7!5e0!3m2!1sen!2sca!4v1743729177882!5m2!1sen!2sca";

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Contact Us
      </Typography>
      <Typography variant="body1" paragraph sx={{ mb: 4 }}>
        Have questions? Want to discuss your event needs? Get in touch with us using the form below or through our direct contact details.
      </Typography>

      <Grid container spacing={4}>
        {/* Contact Form */}
        <Grid item xs={12} md={6}>
          <Typography variant="h5" component="h2" gutterBottom>
            Send Us a Message
          </Typography>
          <Box component="form" noValidate autoComplete="off"> {/* TODO: Add form submission logic */}
            <TextField required id="name" label="Your Name" fullWidth margin="normal" />
            <TextField required id="email" label="Your Email" type="email" fullWidth margin="normal" />
            <TextField id="phone" label="Phone Number (Optional)" fullWidth margin="normal" />
            <TextField required id="subject" label="Subject" fullWidth margin="normal" />
            <TextField
              required
              id="message"
              label="Your Message"
              multiline
              rows={4}
              fullWidth
              margin="normal"
            />
            <Button variant="contained" endIcon={<SendIcon />} sx={{ mt: 2 }} type="submit">
              Send Message
            </Button>
          </Box>
        </Grid>

        {/* Contact Details & Map */}
        <Grid item xs={12} md={6}>
          <Typography variant="h5" component="h2" gutterBottom>
            Our Information
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon><LocationOnIcon /></ListItemIcon>
              <ListItemText primary="Address" secondary={addressString} />
            </ListItem>
            <ListItem>
              <ListItemIcon><EmailIcon /></ListItemIcon>
              <ListItemText primary="Email" secondary={<MuiLink href="mailto:[your-email@example.com]">[your-email@example.com]</MuiLink>} />
            </ListItem>
            <ListItem>
              <ListItemIcon><PhoneIcon /></ListItemIcon>
              <ListItemText primary="Phone" secondary="[Your Phone Number]" />
            </ListItem>
            <ListItem>
              <ListItemIcon><AccessTimeIcon /></ListItemIcon>
              <ListItemText primary="Phone Inquiry Hours" secondary="[e.g., Monday - Friday, 9 AM - 5 PM]" />
            </ListItem>
          </List>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 4 }}>
            Find Us
          </Typography>
          <Box
             component="iframe"
             src={staticMapUrl}
             width="100%" // Keep 100% width for responsiveness
             height="450" // Use height from user's iframe
             sx={{ border: 0 }} // style="border:0;"
             allowFullScreen // allowfullscreen=""
             loading="lazy"
             referrerPolicy="no-referrer-when-downgrade"
             title={`Google Map showing location of ${hallInfo.name}`}
          />
        </Grid>
      </Grid>
    </Container>
  );
} 