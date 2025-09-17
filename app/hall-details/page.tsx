import React from 'react';
import { Container, Typography, Box, List, ListItem, ListItemIcon, ListItemText, Divider, Grid, Card, CardContent, Button, CardMedia } from '@mui/material';
import Link from 'next/link';
import { 
  Info as InfoIcon,
  PhotoLibrary as PhotoLibraryIcon,
  Map as MapIcon,
  People as PeopleIcon,
  SquareFoot as SquareFootIcon,
  DirectionsCar as ParkingIcon,
  Wc as BathroomIcon,
  Chair as FurnitureIcon,
  Kitchen as KitchenIcon,
  Tv as AVIcon,
  Wifi as WifiIcon,
  Accessible as AccessibilityIcon
} from '@mui/icons-material';
import { hallInfo } from '../data/hallInfo'; // Import hall data
import PhotoGallery from '../components/PhotoGallery';

export default function HallDetailsPage() {
  // Function to get the appropriate icon for each feature
  const getFeatureIcon = (primary: string) => {
    const iconMap: { [key: string]: React.ElementType } = {
      'Capacity': PeopleIcon,
      'Building Size': SquareFootIcon,
      'Total Lot Area': SquareFootIcon,
      'Free Parking': ParkingIcon,
      'Bathrooms': BathroomIcon,
      'Furniture': FurnitureIcon,
      'Kitchen Facilities': KitchenIcon,
      'AV Equipment': AVIcon,
      'Free WiFi': WifiIcon,
      'Accessibility': AccessibilityIcon,
    };
    return iconMap[primary] || InfoIcon;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Hall Details
      </Typography>

      {/* 3.2.1 Description - Use data from hallInfo */}
      <Box sx={{ my: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Description
        </Typography>
        <Typography variant="body1" paragraph>
          {hallInfo.description}
        </Typography>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Features & Amenities with modern card layout */}
      <Box sx={{ my: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
          Features & Amenities
        </Typography>
        <Grid container spacing={3}>
          {hallInfo.features.map((feature, index) => {
            const IconComponent = getFeatureIcon(feature.primary);
            return (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card 
                  elevation={2} 
                  sx={{ 
                    height: '100%',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      elevation: 4,
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Box sx={{ mb: 2 }}>
                      <IconComponent 
                        sx={{ 
                          fontSize: 40, 
                          color: 'primary.main',
                          mb: 1 
                        }} 
                      />
                    </Box>
                    <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {feature.primary}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.secondary}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Call to Action Buttons */}
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
          Ready to Book?
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="large"
            href="/availability"
            sx={{ 
              minWidth: 200,
              py: 1.5,
              px: 4,
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            Check Availability
          </Button>
          <Button
            variant="contained"
            size="large"
            component={Link}
            href="/book-now"
            sx={{ 
              minWidth: 200,
              py: 1.5,
              px: 4,
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            Book Now
          </Button>
        </Box>
      </Box>

      {/* Photo Gallery Preview */}
      <Box sx={{ my: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Photo Gallery
        </Typography>
        <Typography variant="body1" paragraph sx={{ mb: 3 }}>
          Take a virtual tour of our beautiful community hall. See the spacious main hall, 
          modern kitchen facilities, and all the amenities we offer.
        </Typography>
        
        {/* Preview Images Grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: 200, overflow: 'hidden' }}>
              <CardMedia
                component="img"
                height="200"
                image="/images/hall/main-hall-wide-view.jpg"
                alt="Main hall wide view"
                sx={{ objectFit: 'cover' }}
              />
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: 200, overflow: 'hidden' }}>
              <CardMedia
                component="img"
                height="200"
                image="/images/exterior/exterior-street-view-with-skyline.jpg"
                alt="Building exterior"
                sx={{ objectFit: 'cover' }}
              />
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: 200, overflow: 'hidden' }}>
              <CardMedia
                component="img"
                height="200"
                image="/images/kitchen/kitchen-fridge-and-stove.jpg"
                alt="Kitchen facilities"
                sx={{ objectFit: 'cover' }}
              />
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: 200, overflow: 'hidden' }}>
              <CardMedia
                component="img"
                height="200"
                image="/images/amenities/amenities-main-entrance-doors.jpg"
                alt="Main entrance"
                sx={{ objectFit: 'cover' }}
              />
            </Card>
          </Grid>
        </Grid>
        
        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="outlined"
            size="large"
            component={Link}
            href="/gallery"
            startIcon={<PhotoLibraryIcon />}
          >
            View Full Gallery
          </Button>
        </Box>
      </Box>


    </Container>
  );
} 