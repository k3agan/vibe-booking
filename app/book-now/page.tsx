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
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

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
    selectedDate: null,
    startTime: '',
    
    // Duration Selection
    bookingType: 'hourly', // 'hourly' or 'fullday'
    duration: 1, // hours for hourly booking
  });

  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

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
        !formData.guestCount || !formData.selectedDate || !formData.startTime) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Check availability first
    const isAvailable = await checkAvailability();
    if (!isAvailable) {
      return; // Stop if not available
    }
    
    console.log('Form submitted, showing payment form');
    console.log('Stripe publishable key:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = (ref: string) => {
    setBookingRef(ref);
    setBookingSuccess(true);
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

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Elements stripe={stripePromise}>
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
                        <MenuItem value="birthday">Birthday Party</MenuItem>
                        <MenuItem value="wedding">Wedding</MenuItem>
                        <MenuItem value="corporate">Corporate Event</MenuItem>
                        <MenuItem value="community">Community Meeting</MenuItem>
                        <MenuItem value="fitness">Fitness Class</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
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
                </Grid>

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
                  {isCheckingAvailability ? 'Checking Availability...' : 'Proceed to Payment'}
                </Button>
              </form>

              {/* Payment Form */}
              {showPaymentForm && (
                <Box sx={{ mt: 3, p: 2, border: '2px solid #1976d2', borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Payment Form (Debug Mode)
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Stripe Key: {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Set' : 'Not Set'}
                  </Typography>
                  <Elements stripe={stripePromise}>
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
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    {formData.bookingType === 'hourly' ? 'Hourly Rate' : 'Full Day Rate'}
                  </Typography>
                  <Typography variant="body2">
                    ${calculatedPrice}
                  </Typography>
                </Box>

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
    </LocalizationProvider>
  );
}
