import React from 'react';
import { Container, Typography, Box, TextField, Button, Paper } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

// TODO: Implement state management for form fields (e.g., useState)
// TODO: Implement form submission logic (e.g., send email, save to DB)
// TODO: Integrate with Availability Calendar if possible for date selection

export default function BookingInquiryPage() {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}> {/* Using md for potentially shorter form */}
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 } }}> {/* Add padding and elevation */}
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Booking Inquiry
        </Typography>
        <Typography variant="body1" paragraph sx={{ mb: 3 }} align="center">
          Please fill out the form below to inquire about booking the hall.
          We will get back to you as soon as possible to confirm availability and details.
        </Typography>

        <Box component="form" noValidate autoComplete="off"> {/* Add form tag */}
          <TextField
            required
            id="contactName"
            label="Contact Name"
            fullWidth
            margin="normal"
          />
          <TextField
            required
            id="email"
            label="Email Address"
            type="email"
            fullWidth
            margin="normal"
          />
          <TextField
            required
            id="phone"
            label="Phone Number"
            fullWidth
            margin="normal"
          />
           <TextField
            id="organization"
            label="Organization (Optional)"
            fullWidth
            margin="normal"
          />
          <TextField
            required
            id="eventType"
            label="Type of Event"
            fullWidth
            margin="normal"
            helperText="e.g., Birthday Party, Meeting, Workshop"
          />
           <TextField
            required
            id="preferredDate"
            label="Preferred Date(s) / Time(s)"
            fullWidth
            margin="normal"
            // TODO: Consider using a Date Picker component
            helperText="Please provide your preferred date(s) and start/end times"
          />
           <TextField
            required
            id="guestCount"
            label="Estimated Number of Guests"
            type="number"
            fullWidth
            margin="normal"
          />
          <TextField
            id="message"
            label="Message / Specific Needs (Optional)"
            multiline
            rows={4}
            fullWidth
            margin="normal"
            helperText="Include any questions or specific requirements you have."
          />

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button variant="contained" size="large" endIcon={<SendIcon />} type="submit">
              Submit Inquiry
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
} 