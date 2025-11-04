'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  ButtonGroup
} from '@mui/material';

interface FeedbackData {
  name?: string;
  email?: string;
  bookingRef?: string;
  cleanliness?: number;
  valueForMoney?: number;
  easeOfBooking?: number;
  amenitiesAvailable?: number;
  buildingAccessCode?: number;
  responsivenessOfStaff?: number;
  overallSatisfaction?: number;
  cleanlinessImprovement?: string;
  valueForMoneyImprovement?: string;
  easeOfBookingImprovement?: string;
  amenitiesAvailableImprovement?: string;
  buildingAccessCodeImprovement?: string;
  responsivenessOfStaffImprovement?: string;
  overallSatisfactionImprovement?: string;
  generalFeedback?: string;
}

export default function FeedbackPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<FeedbackData>({
    name: '',
    email: '',
    bookingRef: '',
  });

  // Get booking reference from URL on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const bookingRef = params.get('booking') || '';
      if (bookingRef) {
        setFeedback(prev => ({ ...prev, bookingRef }));
      }
    }
  }, []);

  const handleSliderChange = (field: keyof FeedbackData, value: number | number[]) => {
    const numValue = Array.isArray(value) ? value[0] : value;
    setFeedback(prev => ({
      ...prev,
      [field]: numValue,
    }));
  };

  const handleImprovementChange = (field: keyof FeedbackData, value: string) => {
    setFeedback(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGeneralFeedbackChange = (value: string) => {
    setFeedback(prev => ({
      ...prev,
      generalFeedback: value,
    }));
  };

  const handleNameChange = (value: string) => {
    setFeedback(prev => ({
      ...prev,
      name: value,
    }));
  };

  const handleEmailChange = (value: string) => {
    setFeedback(prev => ({
      ...prev,
      email: value,
    }));
  };


  const shouldShowImprovementField = (rating: number | undefined) => rating !== undefined && rating <= 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setSubmitError(null);

    // Validate all ratings are provided
    if (
      feedback.cleanliness === undefined ||
      feedback.valueForMoney === undefined ||
      feedback.easeOfBooking === undefined ||
      feedback.amenitiesAvailable === undefined ||
      feedback.buildingAccessCode === undefined ||
      feedback.responsivenessOfStaff === undefined ||
      feedback.overallSatisfaction === undefined
    ) {
      setSubmitStatus('error');
      setSubmitError('Please provide a rating for all categories');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setSubmitStatus('success');
      // Navigate away after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Share Your Feedback
      </Typography>
      <Typography variant="body1" paragraph sx={{ mb: 4 }}>
        We'd love to hear about your experience at Capitol Hill Hall! Your feedback helps us improve our services.
      </Typography>

      <Paper elevation={3} sx={{ p: 4 }}>
        <form onSubmit={handleSubmit}>
          {/* Optional Name and Email */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Your Information (Optional)
            </Typography>
            <TextField
              fullWidth
              label="Your Name (Optional)"
              value={feedback.name || ''}
              onChange={(e) => handleNameChange(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Your Email (Optional)"
              type="email"
              value={feedback.email || ''}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="We'll send you a thank you email!"
            />
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Feedback Form */}
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Rate Your Experience (1 = Poor, 5 = Excellent)
          </Typography>

          {/* Cleanliness */}
          <Box sx={{ mb: 4 }}>
            <Typography gutterBottom>
              Cleanliness
            </Typography>
            <ButtonGroup sx={{ mb: 2 }}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  variant={feedback.cleanliness === rating ? 'contained' : 'outlined'}
                  onClick={() => handleSliderChange('cleanliness', rating)}
                  sx={{ minWidth: 60 }}
                >
                  {rating}
                </Button>
              ))}
            </ButtonGroup>
            {shouldShowImprovementField(feedback.cleanliness) && (
              <TextField
                fullWidth
                label="How could we improve in this area?"
                multiline
                rows={3}
                value={feedback.cleanlinessImprovement || ''}
                onChange={(e) => handleImprovementChange('cleanlinessImprovement', e.target.value)}
                sx={{ mt: 2 }}
              />
            )}
          </Box>

          {/* Value for Money */}
          <Box sx={{ mb: 4 }}>
            <Typography gutterBottom>
              Value for Money
            </Typography>
            <ButtonGroup sx={{ mb: 2 }}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  variant={feedback.valueForMoney === rating ? 'contained' : 'outlined'}
                  onClick={() => handleSliderChange('valueForMoney', rating)}
                  sx={{ minWidth: 60 }}
                >
                  {rating}
                </Button>
              ))}
            </ButtonGroup>
            {shouldShowImprovementField(feedback.valueForMoney) && (
              <TextField
                fullWidth
                label="How could we improve in this area?"
                multiline
                rows={3}
                value={feedback.valueForMoneyImprovement || ''}
                onChange={(e) => handleImprovementChange('valueForMoneyImprovement', e.target.value)}
                sx={{ mt: 2 }}
              />
            )}
          </Box>

          {/* Ease of Booking */}
          <Box sx={{ mb: 4 }}>
            <Typography gutterBottom>
              Ease of Booking
            </Typography>
            <ButtonGroup sx={{ mb: 2 }}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  variant={feedback.easeOfBooking === rating ? 'contained' : 'outlined'}
                  onClick={() => handleSliderChange('easeOfBooking', rating)}
                  sx={{ minWidth: 60 }}
                >
                  {rating}
                </Button>
              ))}
            </ButtonGroup>
            {shouldShowImprovementField(feedback.easeOfBooking) && (
              <TextField
                fullWidth
                label="How could we improve in this area?"
                multiline
                rows={3}
                value={feedback.easeOfBookingImprovement || ''}
                onChange={(e) => handleImprovementChange('easeOfBookingImprovement', e.target.value)}
                sx={{ mt: 2 }}
              />
            )}
          </Box>

          {/* Amenities Available */}
          <Box sx={{ mb: 4 }}>
            <Typography gutterBottom>
              Amenities Available
            </Typography>
            <ButtonGroup sx={{ mb: 2 }}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  variant={feedback.amenitiesAvailable === rating ? 'contained' : 'outlined'}
                  onClick={() => handleSliderChange('amenitiesAvailable', rating)}
                  sx={{ minWidth: 60 }}
                >
                  {rating}
                </Button>
              ))}
            </ButtonGroup>
            {shouldShowImprovementField(feedback.amenitiesAvailable) && (
              <TextField
                fullWidth
                label="How could we improve in this area?"
                multiline
                rows={3}
                value={feedback.amenitiesAvailableImprovement || ''}
                onChange={(e) => handleImprovementChange('amenitiesAvailableImprovement', e.target.value)}
                sx={{ mt: 2 }}
              />
            )}
          </Box>

          {/* Building Access Code */}
          <Box sx={{ mb: 4 }}>
            <Typography gutterBottom>
              Building Access Code
            </Typography>
            <ButtonGroup sx={{ mb: 2 }}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  variant={feedback.buildingAccessCode === rating ? 'contained' : 'outlined'}
                  onClick={() => handleSliderChange('buildingAccessCode', rating)}
                  sx={{ minWidth: 60 }}
                >
                  {rating}
                </Button>
              ))}
            </ButtonGroup>
            {shouldShowImprovementField(feedback.buildingAccessCode) && (
              <TextField
                fullWidth
                label="How could we improve in this area?"
                multiline
                rows={3}
                value={feedback.buildingAccessCodeImprovement || ''}
                onChange={(e) => handleImprovementChange('buildingAccessCodeImprovement', e.target.value)}
                sx={{ mt: 2 }}
              />
            )}
          </Box>

          {/* Responsiveness of Staff */}
          <Box sx={{ mb: 4 }}>
            <Typography gutterBottom>
              Responsiveness of Staff
            </Typography>
            <ButtonGroup sx={{ mb: 2 }}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  variant={feedback.responsivenessOfStaff === rating ? 'contained' : 'outlined'}
                  onClick={() => handleSliderChange('responsivenessOfStaff', rating)}
                  sx={{ minWidth: 60 }}
                >
                  {rating}
                </Button>
              ))}
            </ButtonGroup>
            {shouldShowImprovementField(feedback.responsivenessOfStaff) && (
              <TextField
                fullWidth
                label="How could we improve in this area?"
                multiline
                rows={3}
                value={feedback.responsivenessOfStaffImprovement || ''}
                onChange={(e) => handleImprovementChange('responsivenessOfStaffImprovement', e.target.value)}
                sx={{ mt: 2 }}
              />
            )}
          </Box>

          {/* Overall Satisfaction */}
          <Box sx={{ mb: 4 }}>
            <Typography gutterBottom>
              Overall Satisfaction
            </Typography>
            <ButtonGroup sx={{ mb: 2 }}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  variant={feedback.overallSatisfaction === rating ? 'contained' : 'outlined'}
                  onClick={() => handleSliderChange('overallSatisfaction', rating)}
                  sx={{ minWidth: 60 }}
                >
                  {rating}
                </Button>
              ))}
            </ButtonGroup>
            {shouldShowImprovementField(feedback.overallSatisfaction) && (
              <TextField
                fullWidth
                label="How could we improve in this area?"
                multiline
                rows={3}
                value={feedback.overallSatisfactionImprovement || ''}
                onChange={(e) => handleImprovementChange('overallSatisfactionImprovement', e.target.value)}
                sx={{ mt: 2 }}
              />
            )}
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* General Feedback */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Additional Comments (Optional)
            </Typography>
            <TextField
              fullWidth
              label="Share any additional thoughts or suggestions"
              multiline
              rows={4}
              value={feedback.generalFeedback || ''}
              onChange={(e) => handleGeneralFeedbackChange(e.target.value)}
            />
          </Box>

          {/* Submit Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting}
              sx={{ minWidth: 200 }}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Submit Feedback'}
            </Button>
          </Box>

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <Alert severity="success" sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Thank You!
              </Typography>
              <Typography>
                Your feedback has been submitted successfully. We appreciate you taking the time to share your experience!
              </Typography>
            </Alert>
          )}

          {submitStatus === 'error' && (
            <Alert severity="error" sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Submission Failed
              </Typography>
              <Typography>
                {submitError || 'There was an error submitting your feedback. Please try again.'}
              </Typography>
            </Alert>
          )}
        </form>
      </Paper>
    </Container>
  );
}
