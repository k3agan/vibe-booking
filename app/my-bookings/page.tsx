'use client';

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Button, 
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import { 
  Search as SearchIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Event as EventIcon
} from '@mui/icons-material';

interface Booking {
  id: string;
  booking_ref: string;
  customer_name: string;
  customer_email: string;
  event_type: string;
  selected_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  calculated_price: number;
  booking_type: string;
  duration: number;
  status: string;
  created_at: string;
}

export default function MyBookingsPage() {
  const [email, setEmail] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const searchBookings = async () => {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/my-bookings?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (data.success) {
        setBookings(data.bookings);
        setMessage({ 
          type: 'info', 
          text: `Found ${data.bookings.length} booking${data.bookings.length === 1 ? '' : 's'}` 
        });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to fetch bookings' });
        setBookings([]);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch bookings' });
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleModifyBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setModifyDialogOpen(true);
  };

  const handleCancelBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-CA', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'cancelled': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Bookings
      </Typography>
      
      <Typography variant="body1" paragraph sx={{ mb: 4 }}>
        Enter your email address to view and manage your bookings at Capitol Hill Hall.
      </Typography>

      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* Search Section */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              onKeyPress={(e) => e.key === 'Enter' && searchBookings()}
            />
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
              onClick={searchBookings}
              disabled={loading}
              sx={{ minWidth: 120 }}
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Bookings List */}
      {bookings.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Your Bookings ({bookings.length})
          </Typography>
          
          <Grid container spacing={3}>
            {bookings.map((booking) => (
              <Grid item xs={12} md={6} key={booking.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Typography variant="h6" component="h3">
                        {booking.booking_ref}
                      </Typography>
                      <Chip 
                        label={booking.status} 
                        color={getStatusColor(booking.status) as any}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>{booking.event_type}</strong>
                    </Typography>
                    
                    <Typography variant="body2" gutterBottom>
                      📅 {formatDate(booking.selected_date)}
                    </Typography>
                    
                    <Typography variant="body2" gutterBottom>
                      🕐 {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    </Typography>
                    
                    <Typography variant="body2" gutterBottom>
                      👥 {booking.guest_count} guests
                    </Typography>
                    
                    <Typography variant="body2" gutterBottom>
                      💰 ${booking.calculated_price.toFixed(2)} CAD
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Booked on {new Date(booking.created_at).toLocaleDateString()}
                    </Typography>
                    
                    {booking.status === 'confirmed' && (
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleModifyBooking(booking)}
                        >
                          Modify
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<CancelIcon />}
                          onClick={() => handleCancelBooking(booking)}
                        >
                          Cancel
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {bookings.length === 0 && email && !loading && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <EventIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No bookings found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No bookings found for {email}. Please check your email address or contact us if you believe this is an error.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Modify Booking Dialog */}
      <Dialog open={modifyDialogOpen} onClose={() => setModifyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modify Booking</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Booking modifications are subject to availability and may incur additional charges. 
            Please contact us at capitol.hill.hall@gmail.com for assistance.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModifyDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            href={`mailto:capitol.hill.hall@gmail.com?subject=Modify Booking ${selectedBooking?.booking_ref}`}
          >
            Contact Us
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Booking Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Booking</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Booking cancellations are subject to our refund policy. 
            Please contact us at capitol.hill.hall@gmail.com to process your cancellation.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            color="error"
            href={`mailto:capitol.hill.hall@gmail.com?subject=Cancel Booking ${selectedBooking?.booking_ref}`}
          >
            Contact Us
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
