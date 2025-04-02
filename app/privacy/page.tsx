import React from 'react';
import { Container, Typography, Box } from '@mui/material';

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
          [Your Organization Name/Community Hall Name] ("we," "us," or "our") is committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website [Your Website URL],
          including any other media form, media channel, mobile website, or mobile application related or connected thereto (collectively, the "Site").
          Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
        </Typography>

        {/* Add standard privacy policy sections below */}
        <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
          Information We Collect
        </Typography>
        <Typography variant="body1" paragraph>
          [Details on the types of information collected, e.g., Personally Identifiable Information like name, email, phone number submitted through forms,
          and potentially non-personal information like browser type, IP address through analytics (if used).]
        </Typography>

        <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
          How We Use Your Information
        </Typography>
        <Typography variant="body1" paragraph>
          [Explain the purposes for using the collected information, e.g., responding to inquiries, processing booking requests, improving the website, sending confirmations/updates.]
        </Typography>

         <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
          Disclosure of Your Information
        </Typography>
        <Typography variant="body1" paragraph>
          [Explain if/when information might be shared, e.g., with third-party service providers for specific functions like email delivery, or if required by law. State that you do not sell personal information.]
        </Typography>

         <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
          Security of Your Information
        </Typography>
        <Typography variant="body1" paragraph>
          [Describe the security measures taken to protect user data (e.g., administrative, technical, physical security measures). Mention that no method is 100% secure.]
        </Typography>

        <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
          Your Privacy Rights
        </Typography>
        <Typography variant="body1" paragraph>
          [Mention user rights, e.g., right to access, correct, or delete their personal information, and how they can exercise these rights, typically by contacting you.]
        </Typography>

         <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
          Contact Us
        </Typography>
         <Typography variant="body1" paragraph>
          If you have questions or comments about this Privacy Policy, please contact us at: [Provide Contact Email/Link to Contact Page].
        </Typography>

        <Typography variant="caption" display="block" sx={{ mt: 4 }}>
          Last updated: [Date]
        </Typography>
      </Box>
    </Container>
  );
} 