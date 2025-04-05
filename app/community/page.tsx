import React from 'react';
import { Container, Typography, Box, Grid, Card, CardMedia, CardContent, Link as MuiLink, Divider } from '@mui/material';
import { hallInfo } from '../data/hallInfo'; // Import hall data
import { supportedCharities } from '../data/charitiesData'; // Import the new charity data

// Remove the old placeholder charities array
// const charities = [...];

export default function CommunityImpactPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Our Community Impact
      </Typography>

      <Typography variant="h5" component="p" color="primary.main" sx={{ mb: 3, textAlign: 'center' }}>
        Your Rental Makes a Difference
      </Typography>

      <Typography variant="body1" paragraph sx={{ mb: 4 }}>
        Renting the {hallInfo.name} is more than just securing a great space for your event. It's an investment in our community. All proceeds from hall rentals are directly channeled to support the vital work of local charities and non-profit organizations right here in {hallInfo.address.city}. We believe in building a stronger community together, and your booking plays a significant part in that mission.
      </Typography>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h4" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
        Organizations We Support
      </Typography>

      <Grid container spacing={4} justifyContent="center">
        {/* Map over the imported supportedCharities array */}
        {supportedCharities.map((charity) => (
          <Grid item key={charity.name} component="div" xs={12} sm={6} md={4}>
            <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <CardMedia
                component="img"
                height="140"
                image={charity.logoUrl || '/images/logos/placeholder.png'} // Use logoUrl, fallback to placeholder
                alt={`${charity.name} logo`}
                sx={{ objectFit: 'contain', p: 2, backgroundColor: '#f5f5f5' }}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h6" component="div">
                  {charity.name}
                </Typography>
                {/* Conditionally render description if it exists */}
                {charity.description && (
                   <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    ({charity.description})
                  </Typography>
                )}
                {/* Add placeholder for mission description if needed later */}
                {/* <Typography variant="body2" color="text.secondary">[Mission Placeholder]</Typography> */}
              </CardContent>
              {charity.websiteUrl && charity.websiteUrl !== '#' && (
                <Box sx={{ p: 2, pt: 0 }}>
                  <MuiLink href={charity.websiteUrl} target="_blank" rel="noopener noreferrer" variant="body2">
                    Visit Website
                  </MuiLink>
                </Box>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

       <Divider sx={{ my: 4 }} />

       {/* Optional: Testimonials Section */}
       <Box sx={{ my: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ textAlign: 'center' }}>
            From Our Partners
          </Typography>
          <Typography variant="body1" paragraph sx={{ textAlign: 'center', color: 'text.secondary' }}>
            [Placeholder for testimonials from supported charities. Quotes here would be very impactful.]
          </Typography>
          {/* Example Testimonial Structure */}
          {/* <Paper elevation={1} sx={{ p: 2, mt: 2 }}>
             <Typography variant="body1" sx={{ fontStyle: 'italic' }}>"Quote from the charity..."</Typography>
             <Typography variant="caption" display="block" align="right">- Charity Name</Typography>
          </Paper> */}
       </Box>

    </Container>
  );
} 