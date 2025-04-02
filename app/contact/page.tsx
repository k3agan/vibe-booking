import React from 'react';
import { Container, Typography, Box, Grid, TextField, Button, Paper, Link as MuiLink, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SendIcon from '@mui/icons-material/Send';

export default function ContactPage() {
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
              <ListItemText primary="Address" secondary="[Your Community Hall Full Address, City, Postal Code]" />
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
          {/* Placeholder for Google Map Embed */}
          <Paper elevation={2} sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.200' }}>
              <LocationOnIcon sx={{ fontSize: 40, color: 'grey.500' }}/>
              <Typography sx={{ ml: 1, color: 'grey.600' }}>[Embedded Google Map Placeholder]</Typography>
              {/* TODO: Embed actual Google Map iframe */}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
} 