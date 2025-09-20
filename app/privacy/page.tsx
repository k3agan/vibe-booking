import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { hallInfo } from '../data/hallInfo'; // Import hall data

export default function PrivacyPolicyPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Privacy Policy
      </Typography>

      <Box sx={{ my: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Introduction
        </Typography>
        <Typography variant="body1" paragraph>
          {hallInfo.name} ("we," "us," or "our") is committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website caphillhall.ca,
          including any other media form, media channel, mobile website, or mobile application related or connected thereto (collectively, the "Site").
          Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
        </Typography>

        <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
          Information We Collect
        </Typography>
        <Typography variant="body1" paragraph>
          We collect information you provide directly to us, such as when you create an account, make a booking, or contact us. This may include:
        </Typography>
        <Typography variant="body1" component="ul" sx={{ pl: 2 }}>
          <li>Personal information (name, email address, phone number, mailing address)</li>
          <li>Booking information (event details, guest count, special requirements)</li>
          <li>Payment information (processed securely through Stripe)</li>
          <li>Communication preferences and correspondence</li>
        </Typography>
        <Typography variant="body1" paragraph>
          We also automatically collect certain information when you visit our website, including your IP address, browser type, operating system, and usage patterns through analytics tools.
        </Typography>

        <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
          How We Use Your Information
        </Typography>
        <Typography variant="body1" paragraph>
          We use the information we collect to:
        </Typography>
        <Typography variant="body1" component="ul" sx={{ pl: 2 }}>
          <li>Process and manage your hall bookings and reservations</li>
          <li>Send booking confirmations, reminders, and follow-up communications</li>
          <li>Process payments and handle billing inquiries</li>
          <li>Provide customer support and respond to your inquiries</li>
          <li>Improve our website and services</li>
          <li>Comply with legal obligations and protect our rights</li>
        </Typography>

        <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
          Disclosure of Your Information
        </Typography>
        <Typography variant="body1" paragraph>
          We do not sell, trade, or otherwise transfer your personal information to third parties except in the following circumstances:
        </Typography>
        <Typography variant="body1" component="ul" sx={{ pl: 2 }}>
          <li>With your explicit consent</li>
          <li>To trusted service providers who assist us in operating our website and conducting our business (such as payment processors and email services)</li>
          <li>When required by law or to protect our rights, property, or safety</li>
          <li>In connection with a business transfer or acquisition</li>
        </Typography>

        <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
          Security of Your Information
        </Typography>
        <Typography variant="body1" paragraph>
          We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:
        </Typography>
        <Typography variant="body1" component="ul" sx={{ pl: 2 }}>
          <li>SSL encryption for data transmission</li>
          <li>Secure payment processing through Stripe</li>
          <li>Regular security assessments and updates</li>
          <li>Limited access to personal information on a need-to-know basis</li>
        </Typography>
        <Typography variant="body1" paragraph>
          However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee absolute security.
        </Typography>

        <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
          Your Privacy Rights
        </Typography>
        <Typography variant="body1" paragraph>
          You have the right to:
        </Typography>
        <Typography variant="body1" component="ul" sx={{ pl: 2 }}>
          <li>Access and review your personal information</li>
          <li>Request correction of inaccurate or incomplete information</li>
          <li>Request deletion of your personal information (subject to legal obligations)</li>
          <li>Opt out of certain communications from us</li>
          <li>Withdraw consent where applicable</li>
        </Typography>
        <Typography variant="body1" paragraph>
          To exercise these rights, please contact us using the information provided below.
        </Typography>

        <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
          Contact Us
        </Typography>
        <Typography variant="body1" paragraph>
          If you have questions or comments about this Privacy Policy, please contact us at:
        </Typography>
        <Typography variant="body1" component="ul" sx={{ pl: 2 }}>
          <li>Email: info@caphillhall.ca</li>
          <li>Phone: (604) 500-9505</li>
          <li>Address: 361 Howard Avenue, Burnaby, B.C. V5B 3P7</li>
        </Typography>

        <Typography variant="caption" display="block" sx={{ mt: 4 }}>
          Last updated: January 2025
        </Typography>
      </Box>
    </Container>
  );
} 