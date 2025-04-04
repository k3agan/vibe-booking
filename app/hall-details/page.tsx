import React from 'react';
import { Container, Typography, Box, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info'; // Keeping generic icon for now
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import MapIcon from '@mui/icons-material/Map';
import { hallInfo } from '../data/hallInfo'; // Import hall data

export default function HallDetailsPage() {
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

      {/* 3.2.2 Features & Amenities - Use data from hallInfo */}
      <Box sx={{ my: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Features & Amenities
        </Typography>
        <List>
          {hallInfo.features.map((feature, index) => (
            <ListItem key={index}> {/* Using index as key for now, could use a feature id if added */}
              <ListItemIcon>
                {/* TODO: Could assign specific icons based on feature.primary or in hallInfo.ts */}
                <InfoIcon />
              </ListItemIcon>
              <ListItemText primary={feature.primary} secondary={feature.secondary} />
            </ListItem>
          ))}
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