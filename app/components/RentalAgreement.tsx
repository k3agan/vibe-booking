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
import { getBookingWindowTimeStrings } from '../../lib/booking';

interface RentalAgreementProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  formData: any;
  calculatedPrice: number;
}

export default function RentalAgreement({ open, onClose, onAccept, formData, calculatedPrice }: RentalAgreementProps) {
  const formatTimeLabel = (timeString: string) => {
    const [hour, minute] = timeString.split(':').map(Number);
    return new Date(2000, 0, 1, hour, minute).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTimeWindow = () => {
    if (!formData.selectedDate) {
      return { startLabel: 'TBD', endLabel: 'TBD' };
    }

    if (formData.bookingType === 'hourly' && !formData.startTime) {
      return { startLabel: 'TBD', endLabel: 'TBD' };
    }

    const windowTimes = getBookingWindowTimeStrings({
      selectedDate: formData.selectedDate,
      startTime: formData.startTime,
      bookingType: formData.bookingType,
      duration: formData.duration,
      earlyAccessOption: formData.earlyAccessOption,
      lateAccessOption: formData.lateAccessOption,
    });
    const endSuffix = windowTimes.endDayOffset > 0 ? ' (next day)' : '';
    return {
      startLabel: formatTimeLabel(windowTimes.startTime),
      endLabel: `${formatTimeLabel(windowTimes.endTime)}${endSuffix}`,
    };
  };

  const timeWindow = getTimeWindow();

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
                <Typography variant="body2"><strong>Start Time:</strong> {timeWindow.startLabel}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2"><strong>End Time:</strong> {timeWindow.endLabel}</Typography>
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
            FULL RENTAL BALANCE to be paid at the time of booking. The Association reserves the right to charge up to 50% of the booking rate as a damage deposit if necessary. 
            Notice of cancellation must be received 21 days in advance of the event or function to receive a refund. 
            The Cancellation Fee is 50% of the Rental Fee up to a maximum of $450.
          </Typography>

          <Typography variant="body2" paragraph sx={{ fontWeight: 'bold' }}>
            STANDARD BOOKINGS END AT 10:00 P.M. Late access is available for a fee until 12:00 a.m., and after-midnight
            access can extend until 2:00 a.m. when arranged in advance. The Hall must be vacated by your booked end time.
            Music must cease at your booked end time. All events must strictly comply with the Burnaby Noise or Sound Abatement Bylaw (noise levels are restricted, particularly after 10:00 PM to a maximum of 75 dBA, and renters are responsible for any fines incurred).
          </Typography>

          <Typography variant="body2" paragraph sx={{ fontWeight: 'bold' }}>
            NO CONFETTI, RICE, GLITTER, BEADS OR OTHER SIMILAR ITEMS can be brought into the facility. 
            If ANY OF THESE ITEMS are found on the floors after the function, the renter agrees to pay expenses 
            incurred by the Association for such extra clean-up.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
            IT IS HEREBY UNDERSTOOD AND AGREED THAT:
          </Typography>

          <List dense>
            <ListItem>
              <ListItemText 
                primary="The Renter will receive an access code via email prior to the event (we no longer use lockboxes)."
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary={
                  <>
                    The Renter must take out liability insurance covering the use and occupation of the premises and provide proof of insurance. We recommend using <a href="https://duuo.ca/" target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'underline' }}>Duuo Event Insurance</a>. Costs vary from approximately $25 for non-liquor events up to $200+ for events with alcohol, depending on attendee count. (Hint: When getting an insurance quote, estimating a lower end of your expected attendee count can help reduce your premium).
                  </>
                }
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
                primary="Alcoholic beverages on the premises are not allowed unless the Renter has obtained and presented: Liquor/cannabis license and Serving It Right. Food Safe is only required if the event is open to the public (it is not strictly required for private events)."
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
                primary="Chairs and tables are provided. The Renter must set them up, take them down, and stack them in the appropriate cupboards in the same fashion as they were found (wiping down only if visibly soiled)."
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="The Renter is responsible for cleaning up after their function as outlined in the Hall Closing Checklist (spot clean spills and large messes, remove confetti/tape/decorations and anything brought in, take out garbage/recycling, and leave the Hall tidy and secure). Cleaning contractors visit the Hall twice a week to handle regular sweeping, mopping, and deep cleaning — the renter cleaning standard is not the same as the contractor cleaning standard."
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
          I Agree
        </Button>
      </DialogActions>
    </Dialog>
  );
}
