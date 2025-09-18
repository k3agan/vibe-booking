'use client';

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Button, 
  Box, 
  Card, 
  CardContent, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Chip,
  Alert,
  CircularProgress,
  TextField
} from '@mui/material';
import { 
  Email as EmailIcon, 
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

interface Booking {
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  hoursUntilEvent: number;
  reminderSent: boolean;
  needsReminder: boolean;
}

interface AdminBooking {
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
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [adminBookings, setAdminBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'reminders' | 'bookings'>('reminders');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/send-reminders');
      const data = await response.json();
      
      if (data.success) {
        setBookings(data.bookings);
        setMessage({ type: 'info', text: `Found ${data.totalBookings} upcoming bookings, ${data.bookingsNeedingReminders} need reminders` });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to fetch bookings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch bookings' });
    } finally {
      setLoading(false);
    }
  };

  const sendReminders = async () => {
    setSendingReminders(true);
    try {
      const response = await fetch('/api/send-reminders', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `Reminders sent: ${data.remindersSent} successful, ${data.remindersFailed} failed` 
        });
        // Refresh bookings to show updated reminder status
        fetchBookings();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to send reminders' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send reminders' });
    } finally {
      setSendingReminders(false);
    }
  };

  const sendFollowUps = async () => {
    setSendingReminders(true);
    try {
      const response = await fetch('/api/send-followups', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `Follow-ups sent: ${data.followUpsSent} successful, ${data.followUpsFailed} failed` 
        });
        // Refresh bookings to show updated follow-up status
        fetchBookings();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to send follow-ups' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send follow-ups' });
    } finally {
      setSendingReminders(false);
    }
  };

  const testReminder = async () => {
    try {
      const response = await fetch('/api/test-reminder', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Test reminder email sent successfully!' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to send test reminder' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send test reminder' });
    }
  };

  const fetchAdminBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/bookings');
      const data = await response.json();
      
      if (data.success) {
        setAdminBookings(data.bookings);
        setMessage({ type: 'info', text: `Found ${data.bookings.length} total bookings` });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to fetch bookings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch bookings' });
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      const response = await fetch('/api/admin/cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Booking cancelled successfully' });
        fetchAdminBookings(); // Refresh the list
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to cancel booking' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cancel booking' });
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple password check - in production, use proper authentication
    if (password === 'capitol2024') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid password');
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center">
              Admin Login
            </Typography>
            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!authError}
                helperText={authError}
                sx={{ mb: 3 }}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
              >
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Admin Dashboard
        </Typography>
        <Button
          variant="outlined"
          onClick={() => setIsAuthenticated(false)}
        >
          Logout
        </Button>
      </Box>
      
      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={activeTab === 'reminders' ? 'contained' : 'text'}
            onClick={() => setActiveTab('reminders')}
          >
            Email Management
          </Button>
          <Button
            variant={activeTab === 'bookings' ? 'contained' : 'text'}
            onClick={() => setActiveTab('bookings')}
          >
            Booking Management
          </Button>
        </Box>
      </Box>

      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* Email Management Tab */}
      {activeTab === 'reminders' && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Email Management
          </Typography>
          
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchBookings}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Refresh Bookings'}
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<EmailIcon />}
              onClick={sendReminders}
              disabled={sendingReminders}
            >
              {sendingReminders ? <CircularProgress size={20} /> : 'Send Reminders'}
            </Button>
            
            <Button
              variant="contained"
              color="secondary"
              startIcon={<EmailIcon />}
              onClick={sendFollowUps}
              disabled={sendingReminders}
            >
              {sendingReminders ? <CircularProgress size={20} /> : 'Send Follow-ups'}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<EmailIcon />}
              onClick={testReminder}
            >
              Test Reminder Email
            </Button>
          </Box>
        </Box>
      )}

      {/* Booking Management Tab */}
      {activeTab === 'bookings' && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Booking Management
          </Typography>
          
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchAdminBookings}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Refresh Bookings'}
            </Button>
          </Box>
        </Box>
      )}

      {/* Email Management Tab */}
      {activeTab === 'reminders' && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Upcoming Bookings (Next 7 Days)
            </Typography>
            
            {bookings.length === 0 ? (
              <Typography color="text.secondary">
                No upcoming bookings found.
              </Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Booking Ref</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Event Type</TableCell>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Hours Until Event</TableCell>
                      <TableCell>Reminder Status</TableCell>
                      <TableCell>Action Needed</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.bookingRef}>
                        <TableCell>{booking.bookingRef}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {booking.customerName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {booking.customerEmail}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{booking.eventType}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {new Date(booking.eventDate).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {booking.eventTime}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={`${booking.hoursUntilEvent}h`}
                            color={booking.hoursUntilEvent < 24 ? 'error' : booking.hoursUntilEvent < 48 ? 'warning' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {booking.reminderSent ? (
                            <Chip 
                              icon={<CheckCircleIcon />}
                              label="Sent"
                              color="success"
                              size="small"
                            />
                          ) : (
                            <Chip 
                              icon={<ErrorIcon />}
                              label="Not Sent"
                              color="default"
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {booking.needsReminder ? (
                            <Chip 
                              label="Send Reminder"
                              color="warning"
                              size="small"
                            />
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              No action needed
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Booking Management Tab */}
      {activeTab === 'bookings' && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              All Bookings
            </Typography>
            
            {adminBookings.length === 0 ? (
              <Typography color="text.secondary">
                No bookings found. Click "Refresh Bookings" to load.
              </Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Booking Ref</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Event Type</TableCell>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Guests</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {adminBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>{booking.booking_ref}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {booking.customer_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {booking.customer_email}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{booking.event_type}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {new Date(booking.selected_date).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {booking.start_time} - {booking.end_time}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{booking.guest_count}</TableCell>
                        <TableCell>${booking.calculated_price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={booking.status}
                            color={booking.status === 'confirmed' ? 'success' : booking.status === 'cancelled' ? 'error' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {booking.status === 'confirmed' && (
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              onClick={() => cancelBooking(booking.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          How Reminders Work
        </Typography>
        <Typography variant="body2" paragraph>
          • Reminders are automatically sent 24-48 hours before events
        </Typography>
        <Typography variant="body2" paragraph>
          • Use "Send Reminders" to manually trigger the reminder system
        </Typography>
        <Typography variant="body2" paragraph>
          • Use "Test Reminder Email" to send a test email to verify the system works
        </Typography>
        <Typography variant="body2">
          • The system tracks which reminders have been sent to avoid duplicates
        </Typography>
      </Box>
    </Container>
  );
}
