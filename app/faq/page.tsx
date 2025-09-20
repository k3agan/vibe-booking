import React from 'react';
import {
  Container, Typography, Box,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Placeholder FAQ data - replace with actual Q&As
// Add a unique id to each FAQ item for stable accessibility props
const faqs = [
  {
    id: 'booking-process',
    question: 'What is the booking process?',
    answer: 'Booking is simple and automated! Check our availability calendar, select your date and time, fill out the booking form, review and accept the rental agreement, then proceed to secure payment. You\'ll receive instant confirmation and all necessary details via email.',
  },
  {
    id: 'cancellation-policy',
    question: 'What is the cancellation policy?',
    answer: 'Cancellations require 21 days advance notice for a full refund. Cancellations with less than 21 days notice incur a 50% cancellation fee (maximum $450). Please review our full rental agreement for complete details.',
  },
  {
    id: 'alcohol-policy',
    question: 'Are we allowed to bring our own alcohol?',
    answer: 'Yes, but alcohol service requires a valid liquor license, Serving it Right certification, Food Safe certification, and additional $200,000 liability insurance. All requirements must be provided at the time of deposit.',
  },
  {
    id: 'noise-restrictions',
    question: 'Are there noise restrictions?',
    answer: 'Yes, all music and bar service must cease at 11:00 PM. We ask that you be courteous to our neighbors and respect Burnaby noise bylaws. The hall must be cleaned and vacated by 12:00 AM.',
  },
  {
    id: 'decorations-policy',
    question: 'Can we decorate the hall?',
    answer: 'Yes, but with restrictions. No confetti, rice, glitter, beads, or similar items are allowed. No wall attachments or tape on walls. All decorations must be removed during cleanup. If prohibited items are found, extra cleanup costs will be deducted from your damage deposit.',
  },
  {
    id: 'parking-info',
    question: 'Is parking available?',
    answer: 'Yes! We offer free parking for all guests. The parking lot can accommodate multiple vehicles and is conveniently located adjacent to the hall entrance.',
  },
  {
    id: 'setup-cleanup-time',
    question: 'Is setup and cleanup time included in the rental period?',
    answer: 'Setup and cleanup time is included in your rental period. Please factor this time into your booking. You\'ll receive a detailed checklist to ensure proper cleanup. A responsible adult (19+) must remain on premises at all times.',
  },
  {
    id: 'event-insurance',
    question: 'Do we need event insurance?',
    answer: 'Yes, you must provide proof of liability insurance covering all liabilities that may arise from your use of the premises. This proof must be provided at the time of deposit. The insurance should cover negligence and other potential claims.',
  },
  {
    id: 'capacity-limits',
    question: 'What is the maximum capacity?',
    answer: 'The hall can accommodate up to 140 persons. Clear access to all fire exits must be maintained at all times for safety compliance.',
  },
  {
    id: 'payment-terms',
    question: 'When is payment due?',
    answer: 'Full payment and damage deposit are due 31 days prior to your event. We accept secure online payments through our booking system. A 50% deposit is required at booking, with the balance due 31 days before your event.',
  }
];

export default function FAQPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        Frequently Asked Questions
      </Typography>

      <Box sx={{ mt: 4 }}>
        {faqs.map((faq, index) => (
          // Use the faq.id for key and accessibility props
          <Accordion key={faq.id} defaultExpanded={index === 0}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              // Restore props using the stable faq.id
              aria-controls={`${faq.id}-content`}
              id={`${faq.id}-header`}
            >
              <Typography variant="h6">{faq.question}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ color: 'text.secondary' }}>
                {faq.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Container>
  );
} 