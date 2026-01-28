'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormControlLabel, 
  RadioGroup, 
  Radio,
  Divider,
  Card,
  CardContent,
  Alert,
  Checkbox
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import RentalAgreement from '../components/RentalAgreement';
import { useStripeConfig } from '../hooks/useStripeConfig';
import { trackPurchase, trackBeginCheckout } from '../../lib/gtm-events';
import { calculateDaysUntilEvent } from '../../lib/enhanced-conversions';

const FRIEND_CODE_REGEX = /(friend|discount)\s*code\s*[:#]\s*[a-z0-9_-]+/i;

// Payment Form Component
function PaymentForm({ formData, calculatedPrice, onPaymentSuccess }: {
  formData: any;
  calculatedPrice: number;
  onPaymentSuccess: (bookingRef: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      setPaymentError('Stripe not loaded. Please refresh the page.');
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      console.log('Creating payment intent for amount:', calculatedPrice);
      
      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: calculatedPrice,
          bookingData: formData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const { clientSecret } = await response.json();
      console.log('Payment intent created, client secret received');

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (error) {
        console.error('Payment error:', error);
        setPaymentError(error.message || 'Payment failed');
      } else if (paymentIntent.status === 'succeeded') {
        console.log('Payment successful:', paymentIntent.id);
        
        // Payment successful
        const successResponse = await fetch('/api/payment-success', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            bookingData: formData,
          }),
        });

        if (!successResponse.ok) {
          throw new Error('Failed to process booking confirmation');
        }

        const { bookingRef } = await successResponse.json();
        onPaymentSuccess(bookingRef);
      }
    } catch (error) {
      console.error('Payment process error:', error);
      setPaymentError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Payment Information
      </Typography>
      
      <Box component="form" onSubmit={handlePayment}>
        <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </Box>

        {paymentError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {paymentError}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={!stripe || isProcessing}
          sx={{ py: 2 }}
        >
          {isProcessing ? 'Processing Payment...' : `Pay $${calculatedPrice}`}
        </Button>
      </Box>
    </Box>
  );
}

export default function BookNowPage() {
  const { stripe, isLoading: isStripeLoading, error: stripeError } = useStripeConfig();
  
  const [formData, setFormData] = useState({
    // Contact Information
    name: '',
    email: '',
    phone: '',
    organization: '',
    
    // Event Details
    eventType: '',
    guestCount: '',
    specialRequirements: '',
    
    // Date/Time Selection
    selectedDate: null as Date | null,
    startTime: '',
    
    // Duration Selection
    bookingType: 'hourly' as 'hourly' | 'fullday',
    duration: 1, // hours for hourly booking
  });

  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [friendBookingError, setFriendBookingError] = useState<string | null>(null);
  const [isFriendBookingProcessing, setIsFriendBookingProcessing] = useState(false);
  const [showRentalAgreement, setShowRentalAgreement] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  // Generate time options with 30-minute granularity (6 AM to 11 PM)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 6; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(2000, 0, 1, hour, minute).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        options.push({ value: timeString, label: displayTime });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Update price when form data changes
  useEffect(() => {
    setCalculatedPrice(calculatePrice());
  }, [formData.selectedDate, formData.bookingType, formData.duration]);

  // Pricing calculation
  const calculatePrice = () => {
    const { selectedDate, bookingType, duration } = formData;
    
    if (!selectedDate) return 0;
    
    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0; // Fri, Sat, Sun
    
    let basePrice = 0;
    
    if (bookingType === 'fullday') {
      basePrice = isWeekend ? 900 : 750;
    } else {
      const hourlyRate = isWeekend ? 100 : 50;
      basePrice = hourlyRate * duration;
    }
    
    return basePrice;
  };

  const handleInputChange = (field: string, value: any) => {
    const newFormData = {
      ...formData,
      [field]: value
    };
    
    setFormData(newFormData);

    if (field === 'specialRequirements') {
      setFriendBookingError(null);
    }
    
    // Track begin_checkout when user starts filling the form
    if (['name', 'email', 'phone'].includes(field) && value && !(formData as Record<string, any>)[field]) {
      trackBeginCheckout('CAD', calculatedPrice);
    }
    
    // Recalculate price when relevant fields change
    if (['selectedDate', 'bookingType', 'duration', 'startTime'].includes(field)) {
      // Use the new form data for calculation
      const dayOfWeek = newFormData.selectedDate?.getDay() || 0;
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
      
      let basePrice = 0;
      
      if (newFormData.bookingType === 'fullday') {
        basePrice = isWeekend ? 900 : 750;
      } else {
        const hourlyRate = isWeekend ? 100 : 50;
        basePrice = hourlyRate * newFormData.duration;
      }
      
      setCalculatedPrice(basePrice);
    }
  };

  const checkAvailability = async () => {
    setIsCheckingAvailability(true);
    setAvailabilityError(null);

    try {
      const response = await fetch('/api/check-availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedDate: formData.selectedDate?.toISOString().split('T')[0],
          startTime: formData.startTime,
          duration: formData.duration,
          bookingType: formData.bookingType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to check availability');
      }

      if (!result.available) {
        setAvailabilityError(`This time slot is not available. Conflicting events: ${result.conflictingEvents.map((e: any) => e.summary).join(', ')}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Availability check error:', error);
      setAvailabilityError('Failed to check availability. Please try again.');
      return false;
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.email || !formData.phone || !formData.eventType || 
        !formData.guestCount || !formData.selectedDate) {
      alert('Please fill in all required fields');
      return;
    }
    
    // For hourly bookings, start time is required
    if (formData.bookingType === 'hourly' && !formData.startTime) {
      alert('Please select a start time for hourly bookings');
      return;
    }
    
    // For full-day bookings, set default start time to 8 AM
    if (formData.bookingType === 'fullday' && !formData.startTime) {
      setFormData(prev => ({ ...prev, startTime: '08:00' }));
    }
    
    // Check availability first
    const isAvailable = await checkAvailability();
    if (!isAvailable) {
      return; // Stop if not available
    }
    
    console.log('Form submitted, showing rental agreement');
    setShowRentalAgreement(true);
  };

  const handlePaymentSuccess = (ref: string) => {
    setBookingRef(ref);
    setBookingSuccess(true);
    
    // Track purchase conversion
    const daysUntilEvent = formData.selectedDate ? 
      calculateDaysUntilEvent(formData.selectedDate.toISOString().split('T')[0]) : 0;
    
    trackPurchase(ref, calculatedPrice, 'CAD', {
      event_type: formData.eventType,
      booking_type: formData.bookingType,
      days_until_event: daysUntilEvent,
      guest_count: parseInt(formData.guestCount)
    });
  };

  const handleFriendBookingSuccess = (ref: string) => {
    setBookingRef(ref);
    setBookingSuccess(true);
  };

  const handleAgreementAccept = async () => {
    setAgreementAccepted(true);
    setShowRentalAgreement(false);

    if (FRIEND_CODE_REGEX.test(formData.specialRequirements || '')) {
      setIsFriendBookingProcessing(true);
      setFriendBookingError(null);
      try {
        const response = await fetch('/api/friend-booking', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookingData: formData,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          setFriendBookingError(result.error || 'Friend booking failed. Please continue with payment.');
          setShowPaymentForm(true);
          return;
        }

        handleFriendBookingSuccess(result.bookingRef);
        return;
      } catch (error) {
        console.error('Friend booking error:', error);
        setFriendBookingError('Friend booking failed. Please continue with payment.');
        setShowPaymentForm(true);
        return;
      } finally {
        setIsFriendBookingProcessing(false);
      }
    }

    setShowPaymentForm(true);
    console.log('Agreement accepted, showing payment form');
  };

  const handleAgreementClose = () => {
    setShowRentalAgreement(false);
    setAgreementAccepted(false);
  };


  // Show success message
  if (bookingSuccess) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box textAlign="center">
          <Typography variant="h3" component="h1" gutterBottom color="success.main">
            ✅ Booking Confirmed!
          </Typography>
          <Typography variant="h6" gutterBottom>
            Booking Reference: {bookingRef}
          </Typography>
          <Typography variant="body1" paragraph>
            Thank you for your booking! A confirmation email has been sent to {formData.email}.
          </Typography>
          <Button 
            variant="contained" 
            href="/availability"
            sx={{ mr: 2 }}
          >
            View Calendar
          </Button>
          <Button 
            variant="outlined" 
            href="/"
          >
            Return Home
          </Button>
        </Box>
      </Container>
    );
  }

  // Show loading state while Stripe is initializing
  if (isStripeLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Book the Hall
        </Typography>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6">Loading payment system...</Typography>
        </Box>
      </Container>
    );
  }

  // Show error state if Stripe failed to load
  if (stripeError) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Book the Hall
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          Payment system error: {stripeError}
        </Alert>
        <Typography variant="body1">
          Please refresh the page or contact support if the issue persists.
        </Typography>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Elements stripe={stripe}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Book the Hall
        </Typography>
        
        <Typography variant="body1" paragraph sx={{ mb: 4 }}>
          Reserve your perfect space for your event. All bookings support local charities in our community.
        </Typography>

        {/* Availability Notice */}
        <Alert severity="warning" sx={{ mb: 4 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            ⚠️ Important: Check Availability First
          </Typography>
          <Typography variant="body2">
            Please consult the <strong>Availability Calendar</strong> before submitting your booking. 
            Bookings will not be processed if there is an existing booking for your selected date and time.
          </Typography>
          <Button 
            variant="outlined" 
            size="small" 
            href="/availability" 
            sx={{ mt: 1 }}
          >
            View Availability Calendar
          </Button>
        </Alert>

        <Grid container spacing={4}>
          {/* Booking Form */}
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 4 }}>
              <form onSubmit={handleFormSubmit}>
                {/* Contact Information */}
                <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                  Contact Information
                </Typography>
                
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Full Name *"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email Address *"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone Number *"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Organization (Optional)"
                      value={formData.organization}
                      onChange={(e) => handleInputChange('organization', e.target.value)}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                {/* Event Details */}
                <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                  Event Details
                </Typography>
                
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Event Type *</InputLabel>
                      <Select
                        value={formData.eventType}
                        onChange={(e) => handleInputChange('eventType', e.target.value)}
                        required
                      >
                        <MenuItem value="anniversary">Anniversary Celebration</MenuItem>
                        <MenuItem value="art-craft">Art & Craft Workshop</MenuItem>
                        <MenuItem value="baby-shower">Baby Shower</MenuItem>
                        <MenuItem value="birthday">Birthday Party</MenuItem>
                        <MenuItem value="community">Community Meeting</MenuItem>
                        <MenuItem value="corporate">Corporate/Team Event</MenuItem>
                        <MenuItem value="cultural">Cultural Celebration</MenuItem>
                        <MenuItem value="dance">Dance Class/Workshop</MenuItem>
                        <MenuItem value="fitness">Fitness Class</MenuItem>
                        <MenuItem value="fundraiser">Fundraiser</MenuItem>
                        <MenuItem value="game-night">Game Night</MenuItem>
                        <MenuItem value="graduation">Graduation Party</MenuItem>
                        <MenuItem value="martial-arts">Martial Arts Training</MenuItem>
                        <MenuItem value="movie-night">Movie Night</MenuItem>
                        <MenuItem value="music">Music Lesson/Concert</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                        <MenuItem value="religious">Religious Service/Event</MenuItem>
                        <MenuItem value="retirement">Retirement Party</MenuItem>
                        <MenuItem value="wedding">Wedding Reception</MenuItem>
                        <MenuItem value="workshop">Educational Workshop</MenuItem>
                        <MenuItem value="yoga">Yoga Class</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Expected Guest Count *"
                      type="number"
                      value={formData.guestCount}
                      onChange={(e) => handleInputChange('guestCount', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Special Requirements or Notes"
                      multiline
                      rows={3}
                      value={formData.specialRequirements}
                      onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                {/* Date/Time Selection */}
                <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                  Date & Time Selection
                </Typography>
                
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Select Date *"
                      value={formData.selectedDate}
                      onChange={(date) => handleInputChange('selectedDate', date)}
                      minDate={new Date()}
                    />
                  </Grid>
                  {formData.bookingType === 'hourly' && (
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Start Time *</InputLabel>
                        <Select
                          value={formData.startTime}
                          onChange={(e) => handleInputChange('startTime', e.target.value)}
                          required
                        >
                          {timeOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                </Grid>

                {formData.bookingType === 'fullday' && (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Full-day bookings run from 8:00 AM to 11:00 PM
                  </Alert>
                )}

                <Divider sx={{ my: 3 }} />

                {/* Duration Selection */}
                <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                  Booking Duration
                </Typography>
                
                <FormControl component="fieldset" sx={{ mb: 3 }}>
                  <RadioGroup
                    value={formData.bookingType}
                    onChange={(e) => handleInputChange('bookingType', e.target.value)}
                  >
                    <FormControlLabel 
                      value="hourly" 
                      control={<Radio />} 
                      label="Hourly Booking (1-7 hours)" 
                    />
                    <FormControlLabel 
                      value="fullday" 
                      control={<Radio />} 
                      label="Full Day (8+ hours)" 
                    />
                  </RadioGroup>
                </FormControl>

                {formData.bookingType === 'hourly' && (
                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Duration (Hours)</InputLabel>
                        <Select
                          value={formData.duration}
                          onChange={(e) => handleInputChange('duration', e.target.value)}
                        >
                          {[1, 2, 3, 4, 5, 6, 7].map(hours => (
                            <MenuItem key={hours} value={hours}>
                              {hours} {hours === 1 ? 'Hour' : 'Hours'}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                )}

                {/* Availability Error */}
                {availabilityError && (
                  <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                    {availabilityError}
                  </Alert>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={isCheckingAvailability}
                  sx={{ mt: 3, py: 2 }}
                >
                  {isCheckingAvailability ? 'Checking Availability...' : 'Review Rental Agreement'}
                </Button>
              </form>

              {isFriendBookingProcessing && (
                <Alert severity="info" sx={{ mt: 3 }}>
                  Processing friend booking...
                </Alert>
              )}

              {friendBookingError && (
                <Alert severity="warning" sx={{ mt: 3 }}>
                  {friendBookingError}
                </Alert>
              )}

              {/* Payment Form */}
              {showPaymentForm && (
                <Box sx={{ mt: 3, p: 2, border: '2px solid #1976d2', borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Payment Information
                  </Typography>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    ✓ Rental agreement accepted. Proceed with secure payment to confirm your booking.
                  </Alert>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Payment System: {stripeError ? 'Error' : 'Ready'}
                  </Typography>
                  <Elements stripe={stripe}>
                    <PaymentForm
                      formData={formData}
                      calculatedPrice={calculatedPrice}
                      onPaymentSuccess={handlePaymentSuccess}
                    />
                  </Elements>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Pricing Summary */}
          <Grid item xs={12} md={4}>
            <Card elevation={3} sx={{ position: 'sticky', top: 20 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Booking Summary
                </Typography>
                
                {formData.selectedDate && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Date: {formData.selectedDate?.toLocaleDateString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Type: {formData.bookingType === 'hourly' ? 'Hourly' : 'Full Day'}
                    </Typography>
                    {formData.bookingType === 'hourly' && (
                      <Typography variant="body2" color="text.secondary">
                        Duration: {formData.duration} {formData.duration === 1 ? 'Hour' : 'Hours'}
                      </Typography>
                    )}
                    {(() => {
                      const dayOfWeek = formData.selectedDate?.getDay() || 0;
                      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
                      return (
                        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
                          {isWeekend ? 'Weekend Rate' : 'Weekday Rate'} Applied
                        </Typography>
                      );
                    })()}
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {formData.selectedDate && (() => {
                  const dayOfWeek = formData.selectedDate?.getDay() || 0;
                  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
                  const hourlyRate = isWeekend ? 100 : 50;
                  const fullDayRate = isWeekend ? 900 : 750;
                  
                  return (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">
                        {formData.bookingType === 'hourly' 
                          ? `Hourly Rate (${isWeekend ? 'Weekend' : 'Weekday'})` 
                          : `Full Day Rate (${isWeekend ? 'Weekend' : 'Weekday'})`
                        }
                      </Typography>
                      <Typography variant="body2">
                        ${formData.bookingType === 'hourly' ? hourlyRate : fullDayRate}
                        {formData.bookingType === 'hourly' && ` × ${formData.duration}`}
                      </Typography>
                    </Box>
                  );
                })()}

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6">${calculatedPrice}</Typography>
                </Box>

                <Alert severity="info" sx={{ mt: 2 }}>
                  Payment required to confirm booking. All bookings support local charities.
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        </Container>
      </Elements>
      
      {/* Rental Agreement Modal */}
      <RentalAgreement
        open={showRentalAgreement}
        onClose={handleAgreementClose}
        onAccept={handleAgreementAccept}
        formData={formData}
        calculatedPrice={calculatedPrice}
      />
    </LocalizationProvider>
  );
}
