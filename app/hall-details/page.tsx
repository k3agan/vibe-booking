import React from 'react';
import { Container, Typography, Box, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info'; // Example icon
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import MapIcon from '@mui/icons-material/Map';

export default function HallDetailsPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Hall Details
      </Typography>

      {/* 3.2.1 Description */}
      <Box sx={{ my: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Description
        </Typography>
        <Typography variant="body1" paragraph>
          [Detailed text describing the hall's atmosphere, potential uses, and unique characteristics will go here...]
        </Typography>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* 3.2.2 Features & Amenities */}
      <Box sx={{ my: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Features & Amenities
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon><InfoIcon /></ListItemIcon>
            <ListItemText primary="Capacity" secondary="[Seated: X, Standing: Y]" />
          </ListItem>
          <ListItem>
            <ListItemIcon><InfoIcon /></ListItemIcon>
            <ListItemText primary="Dimensions" secondary="[XXm x YYm / ZZZ sq ft]" />
          </ListItem>
          <ListItem>
            <ListItemIcon><InfoIcon /></ListItemIcon>
            <ListItemText primary="Furniture" secondary="[Tables: Count/Type, Chairs: Count/Type]" />
          </ListItem>
           <ListItem>
            <ListItemIcon><InfoIcon /></ListItemIcon>
            <ListItemText primary="Kitchen Facilities" secondary="[Oven, Fridge, Sink, Microwave, etc.]" />
          </ListItem>
          <ListItem>
            <ListItemIcon><InfoIcon /></ListItemIcon>
            <ListItemText primary="AV Equipment" secondary="[Projector, Screen, Sound System, WiFi Details]" />
          </ListItem>
           <ListItem>
            <ListItemIcon><InfoIcon /></ListItemIcon>
            <ListItemText primary="Washrooms" secondary="[Details]" />
          </ListItem>
           <ListItem>
            <ListItemIcon><InfoIcon /></ListItemIcon>
            <ListItemText primary="Accessibility" secondary="[Ramps, Accessible Washrooms, etc.]" />
          </ListItem>
           <ListItem>
            <ListItemIcon><InfoIcon /></ListItemIcon>
            <ListItemText primary="Parking" secondary="[Availability/Instructions]" />
          </ListItem>
          {/* Add more features as needed */}
        </List>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* 3.2.3 Photo & Video Gallery */}
      <Box sx={{ my: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
           Photo & Video Gallery
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, bgcolor: 'grey.200', borderRadius: 1 }}>
          <PhotoLibraryIcon sx={{ fontSize: 40, color: 'grey.500' }} />
          <Typography sx={{ ml: 1, color: 'grey.600' }}>[Image Gallery / Video Tour Placeholder]</Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* 3.2.4 Floor Plan */}
      <Box sx={{ my: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Floor Plan
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, bgcolor: 'grey.200', borderRadius: 1 }}>
           <MapIcon sx={{ fontSize: 40, color: 'grey.500' }} />
           <Typography sx={{ ml: 1, color: 'grey.600' }}>[Floor Plan Image Placeholder - View/Download]</Typography>
        </Box>
      </Box>

    </Container>
  );
} 