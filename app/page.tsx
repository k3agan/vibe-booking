import Image from "next/image";
import { Container, Typography, Button, Box } from '@mui/material';
import { hallInfo } from "./data/hallInfo"; // Import hall data

export default function Home() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Box sx={{ position: 'relative', width: '100%', height: '60vh', maxHeight: '500px' }}>
           <Image
              src="/hall-front-hero-image.png"
              alt={`${hallInfo.name} exterior view`}
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
      </Box>
    </Box>
  );
}
