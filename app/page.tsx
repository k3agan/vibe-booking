import Image from "next/image";
import { Container, Typography, Button, Box } from '@mui/material';
import { hallInfo } from "./data/hallInfo"; // Import hall data

export default function Home() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Box sx={{ position: 'relative', width: '100%', height: '60vh', maxHeight: '500px' }}>
           <Image
              src="/images/exterior/exterior-street-view-with-skyline.jpg"
              alt={`${hallInfo.name} exterior view with skyline`}
              fill
              style={{ objectFit: 'cover' }}
              priority
           />
        </Box>

        <Container maxWidth="md" sx={{ mt: -8, mb: 4, position: 'relative', zIndex: 1 }}>
          <Box sx={{ bgcolor: 'background.paper', p: 4, borderRadius: 2, boxShadow: 3, textAlign: 'center' }}>
            <Typography variant="h2" component="h1" gutterBottom>
              Welcome to {hallInfo.name}
            </Typography>
            <Typography variant="h5" component="p" color="text.secondary" paragraph>
              Your perfect space for events, supporting local charities with every booking.
            </Typography>
            <Box sx={{ mt: 4 }}>
              <Button variant="contained" size="large" sx={{ mr: 2 }} href="/availability">
                Check Availability
              </Button>
              <Button variant="outlined" size="large" sx={{ mr: 2 }} href="/hall-details">
                Explore the Space
              </Button>
              <Button variant="outlined" size="large" href="/rates">
                View Rates
              </Button>
            </Box>
          </Box>
        </Container>

        {/* Photo Preview Section */}
        <Container maxWidth="lg" sx={{ mt: 6, mb: 4 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
            Take a Look Around
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            <Box sx={{ position: 'relative', height: 250, borderRadius: 2, overflow: 'hidden' }}>
              <Image
                src="/images/hall/main-hall-wide-view.jpg"
                alt="Main hall wide view"
                fill
                style={{ objectFit: 'cover' }}
              />
            </Box>
            <Box sx={{ position: 'relative', height: 250, borderRadius: 2, overflow: 'hidden' }}>
              <Image
                src="/images/kitchen/kitchen-fridge-and-stove.jpg"
                alt="Kitchen facilities"
                fill
                style={{ objectFit: 'cover' }}
              />
            </Box>
            <Box sx={{ position: 'relative', height: 250, borderRadius: 2, overflow: 'hidden' }}>
              <Image
                src="/images/exterior/exterior-parking-lot-full-view.jpg"
                alt="Parking facilities"
                fill
                style={{ objectFit: 'cover' }}
              />
            </Box>
          </Box>
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button variant="outlined" size="large" href="/hall-details">
              View Full Gallery
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
