'use client';

import React, { useEffect } from 'react';
import { Container, Typography } from '@mui/material';
import PhotoGallery from '../components/PhotoGallery';
import { trackSelectContent } from '../../lib/gtm-events';

export default function GalleryPage() {
  // Track gallery view
  useEffect(() => {
    trackSelectContent('photo_gallery', 'gallery_view');
  }, []);

  const photos: Array<{ src: string; alt: string; type: 'image' | 'video'; category: string }> = [
    // Exterior photos
    { src: '/images/exterior/exterior-parking-lot-full-view.jpg', alt: 'Parking lot full view', type: 'image', category: 'exterior' },
    { src: '/images/exterior/exterior-street-view-with-skyline.jpg', alt: 'Street view with skyline', type: 'image', category: 'exterior' },
    { src: '/images/exterior/exterior-side-view-sign.jpg', alt: 'Side view with sign', type: 'image', category: 'exterior' },
    { src: '/images/exterior/exterior-ramp-view.jpg', alt: 'Accessible ramp entrance', type: 'image', category: 'exterior' },
    { src: '/images/exterior/exterior-building-and-sign.jpg', alt: 'Building exterior with sign', type: 'image', category: 'exterior' },
    { src: '/images/exterior/exterior-parking-lot-view.jpg', alt: 'Parking lot overview', type: 'image', category: 'exterior' },
    
    // Main hall photos
    { src: '/images/hall/main-hall-wide-view.jpg', alt: 'Main hall wide view', type: 'image', category: 'hall' },
    { src: '/images/hall/main-hall-wide-pan.jpg', alt: 'Main hall panoramic view', type: 'image', category: 'hall' },
    { src: '/images/hall/main-hall-pan.jpg', alt: 'Main hall interior view', type: 'image', category: 'hall' },
    { src: '/images/hall/main-hall-alternate-view.jpg', alt: 'Main hall alternate angle', type: 'image', category: 'hall' },
    
    // Kitchen photos
    { src: '/images/kitchen/kitchen-cabinets-sink.jpg', alt: 'Kitchen cabinets and sink', type: 'image', category: 'kitchen' },
    { src: '/images/kitchen/kitchen-fridge-and-stove.jpg', alt: 'Kitchen appliances', type: 'image', category: 'kitchen' },
    { src: '/images/kitchen/kitchen-serving-hatch.jpg', alt: 'Kitchen serving hatch', type: 'image', category: 'kitchen' },
    { src: '/images/kitchen/kitchen-overview.jpg', alt: 'Kitchen overview', type: 'image', category: 'kitchen' },
    { src: '/images/kitchen/kitchen-appliances.jpg', alt: 'Kitchen appliances detail', type: 'image', category: 'kitchen' },
    { src: '/images/kitchen/kitchen-cabinets-sink-pan.jpg', alt: 'Kitchen cabinets and sink area', type: 'image', category: 'kitchen' },
    
    // Amenities photos
    { src: '/images/amenities/amenities-bulletin-board.jpg', alt: 'Information bulletin board', type: 'image', category: 'amenities' },
    { src: '/images/amenities/amenities-main-entrance-doors.jpg', alt: 'Main entrance doors', type: 'image', category: 'amenities' },
    { src: '/images/amenities/amenities-main-entrance.jpg', alt: 'Main entrance view', type: 'image', category: 'amenities' },
    { src: '/images/amenities/amenities-coat-room.jpg', alt: 'Coat room facilities', type: 'image', category: 'amenities' },
    
    // Interior photos
    { src: '/images/interior/hallway-and-washrooms.jpg', alt: 'Hallway and washroom facilities', type: 'image', category: 'interior' },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Photo Gallery
      </Typography>

      <Typography variant="body1" paragraph sx={{ mb: 4 }}>
        Explore our beautiful community hall through these photos. See the spacious main hall, 
        modern kitchen facilities, accessible features, and all the amenities we offer.
      </Typography>

      {/* Full Photo Gallery */}
      <PhotoGallery photos={photos} title="Complete Hall Gallery" />
    </Container>
  );
}
