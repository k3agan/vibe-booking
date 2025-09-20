import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Grid
} from '@mui/material';

interface RentalAgreementProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  formData: any;
  calculatedPrice: number;
}

export default function RentalAgreement({ open, onClose, onAccept, formData, calculatedPrice }: RentalAgreementProps) {
  // Calculate end time for display
  const getEndTime = () => {
    if (formData.bookingType === 'fullday') {
      return '11:00 PM';
    }
    if (formData.startTime && formData.duration) {
      const startHour = parseInt(formData.startTime.split(':')[0]);
      const startMinute = parseInt(formData.startTime.split(':')[1]);
      const endHour = startHour + formData.duration;
      const endMinute = startMinute;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      return new Date(2000, 0, 1, endHour, endMinute).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    return 'TBD';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
          RENTAL AGREEMENT
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
          Between: CAPITOL HILL COMMUNITY HALL ASSOCIATION and {formData.name || 'Renter'}
        </Typography>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
          {/* Event Details */}
          <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: '#f5f5f5' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              EVENT DETAILS
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2"><strong>Date:</strong> {formData.selectedDate ? formatDate(formData.selectedDate) : 'Selected Date'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2"><strong>Event Type:</strong> {formData.eventType || 'Event'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2"><strong>Start Time:</strong> {formData.startTime ? new Date(2000, 0, 1, parseInt(formData.startTime.split(':')[0]), parseInt(formData.startTime.split(':')[1])).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '8:00 AM'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2"><strong>End Time:</strong> {getEndTime()}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2"><strong>Guest Count:</strong> {formData.guestCount || 'TBD'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2"><strong>Total Cost:</strong> ${calculatedPrice}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2"><strong>Contact Person:</strong> {formData.name || 'Renter'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2"><strong>Phone:</strong> {formData.phone || 'Not provided'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2"><strong>Email:</strong> {formData.email || 'Not provided'}</Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Main Contract Terms */}
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
            RENTAL TERMS & CONDITIONS
          </Typography>

          <Typography variant="body2" paragraph sx={{ fontWeight: 'bold' }}>
            Hall Address: 361 Howard Avenue, Burnaby, B.C. V5B 3P7
          </Typography>

          <Typography variant="body2" paragraph sx={{ fontWeight: 'bold' }}>
            FULL BALANCE OF RENTAL AND DAMAGE DEPOSIT to be paid in full 31 days prior to event or function. 
            Notice of cancellation must be received 21 days in advance of event or function to receive refund or deposit. 
            The Cancellation Fee is 50% of the Rental Fee up to a maximum of $450.
          </Typography>

          <Typography variant="body2" paragraph sx={{ fontWeight: 'bold' }}>
            ALL GUESTS MUST VACATE THE PREMISES AND ALL MUSIC AND/OR BAR SERVICE must cease at 11:00 p.m. 
            Please be courteous to our neighbours and be aware of Burnaby Bylaws regarding decibels of music allowed. 
            The Hall shall be cleaned and vacated not later than 12 midnight.
          </Typography>

          <Typography variant="body2" paragraph sx={{ fontWeight: 'bold' }}>
            NO CONFETTI, RICE, GLITTER, BEADS OR OTHER SIMILAR ITEMS can be brought into the facility. 
            If ANY OF THESE ITEMS are found on the floors after the function the renter agrees to pay expenses 
            incurred by the Association for such extra clean-up and the same be deducted from damage deposit.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
            IT IS HEREBY UNDERSTOOD AND AGREED THAT:
          </Typography>

          <List dense>
            <ListItem>
              <ListItemText 
                primary="The Renter is responsible for unlocking the lock box to get the key at the start of the function and putting it back in front of the office before leaving."
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="The Renter shall take out insurance covering all liabilities including but not limited to negligence that may arise out of or result from the use and occupation of the premises. Proof of insurance shall be provided at the time of Deposit."
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="The Renter agrees to indemnify and save harmless the Association from all costs, loss, damage, proceedings, actions, claims, demands, and expenses suffered by the Association and sustained or caused by the renter's occupation on account of or in respect of the premises or the use and occupation thereof."
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="The Association shall not be responsible for any loss, damage or injury that may happen to or be suffered by the Renter or its agents, servants, invitees, guests or property from any cause whatsoever, prior, during or subsequent to the period covered by the agreement."
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Alcoholic beverages on the premises are not allowed unless the Renter has obtained and presented: Liquor/cannabis license, Serving it Right, Food Safe and additional insurance ($200,000.00) for special events liability and liquor liability."
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="The Renter shall not install or permit the installations of any wiring, electrical appliances, plugs, nails, tape, tacks, pins, screws, staples, or similar items on any surfaces. No gum either."
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Chairs and tables are provided. The Renter must set them up and take them down, clean and stack them in the appropriate cupboards in the same fashion as they were found."
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="The Renter is responsible for the cleaning of the Hall after function which includes everything that is listed on the Hall Closing Checklist."
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="FIRE DEPARTMENT REGULATIONS list the capacity of the hall to be 140 persons maximum and require a clear access to the fire exits."
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="This agreement must be signed by a responsible adult (19 years or older) having authority over the group and such adult shall always remain with the group while on the premises and be responsible for all group actions."
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="The Renter agrees to pay the Association the total cost of any damage to the building, furnishings or equipment resulting in any manner whatsoever from the rental and the use of the hall."
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Paper elevation={1} sx={{ p: 2, bgcolor: '#e3f2fd' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
              By proceeding with payment, you acknowledge that you have read, understood, and agree to be bound by all the terms and conditions outlined in this rental agreement.
            </Typography>
          </Paper>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" size="large">
          Cancel Booking
        </Button>
        <Button 
          onClick={onAccept} 
          variant="contained" 
          color="primary"
          size="large"
        >
          I Agree - Proceed to Payment
        </Button>
      </DialogActions>
    </Dialog>
  );
}
