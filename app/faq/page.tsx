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
    id: 'booking-process', // Added id
    question: 'What is the booking process?',
    answer: '[Detailed answer about the steps to book the hall, e.g., Check availability -> Submit inquiry form -> We contact you -> Sign agreement -> Pay deposit...]',
  },
  {
    id: 'cancellation-policy', // Added id
    question: 'What is the cancellation policy?',
    answer: '[Details about cancellation deadlines, potential refunds, or fees. Link to the full policy page if applicable.]',
  },
  {
    id: 'alcohol-policy', // Added id
    question: 'Are we allowed to bring our own alcohol?',
    answer: '[Explain the hall\'s policy on alcohol, including any permit requirements, corkage fees, or restrictions.]',
  },
  {
    id: 'noise-restrictions', // Added id
    question: 'Are there noise restrictions?',
    answer: '[Detail any specific noise level rules or time restrictions (e.g., music must be off by 11 PM).]',
  },
    {
    id: 'decorations-policy', // Added id
    question: 'Can we decorate the hall?',
    answer: '[Explain rules regarding decorations, what is allowed/disallowed (e.g., no tape on walls, no confetti), and cleanup requirements.]',
  },
  {
    id: 'parking-info', // Added id
    question: 'Is parking available?',
    answer: '[Information about parking availability, location, cost (if any), and any specific instructions.]',
  },
  {
    id: 'setup-cleanup-time', // Added id
    question: 'Is setup and cleanup time included in the rental period?',
    answer: '[Clarify whether renters need to factor setup/cleanup into their booked time or if separate time is allocated/available.]',
  },
   {
    id: 'event-insurance', // Added id
    question: 'Do we need event insurance?',
    answer: '[State whether event liability insurance is required, recommended amount, and if proof is needed.]',
  },
  // Add more common questions with unique ids
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