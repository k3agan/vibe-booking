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
    { src: '/images/exterior/exterior-building-and-sign.mp4', alt: 'Building exterior tour', type: 'video', category: 'exterior' },
    { src: '/images/exterior/exterior-parking-lot-view.mp4', alt: 'Parking lot overview', type: 'video', category: 'exterior' },
    
    // Main hall photos
    { src: '/images/hall/main-hall-wide-view.jpg', alt: 'Main hall wide view', type: 'image', category: 'hall' },
    { src: '/images/hall/main-hall-wide-pan.mp4', alt: 'Main hall panoramic view', type: 'video', category: 'hall' },
    { src: '/images/hall/main-hall-pan.mp4', alt: 'Main hall interior tour', type: 'video', category: 'hall' },
    { src: '/images/hall/main-hall-alternate-view.mp4', alt: 'Main hall alternate angle', type: 'video', category: 'hall' },
    
    // Kitchen photos
    { src: '/images/kitchen/kitchen-cabinets-sink.jpg', alt: 'Kitchen cabinets and sink', type: 'image', category: 'kitchen' },
    { src: '/images/kitchen/kitchen-fridge-and-stove.jpg', alt: 'Kitchen appliances', type: 'image', category: 'kitchen' },
    { src: '/images/kitchen/kitchen-serving-hatch.jpg', alt: 'Kitchen serving hatch', type: 'image', category: 'kitchen' },
    { src: '/images/kitchen/kitchen-overview.mp4', alt: 'Kitchen overview tour', type: 'video', category: 'kitchen' },
    { src: '/images/kitchen/kitchen-appliances.mp4', alt: 'Kitchen appliances tour', type: 'video', category: 'kitchen' },
    { src: '/images/kitchen/kitchen-cabinets-sink-pan.mp4', alt: 'Kitchen cabinets tour', type: 'video', category: 'kitchen' },
    { src: '/images/kitchen/kitchen-serving-hatch.mp4', alt: 'Kitchen serving area', type: 'video', category: 'kitchen' },
    
    // Amenities photos
    { src: '/images/amenities/amenities-bulletin-board.jpg', alt: 'Information bulletin board', type: 'image', category: 'amenities' },
    { src: '/images/amenities/amenities-main-entrance-doors.jpg', alt: 'Main entrance doors', type: 'image', category: 'amenities' },
    { src: '/images/amenities/amenities-rental-checklist.jpg', alt: 'Rental checklist', type: 'image', category: 'amenities' },
    { src: '/images/amenities/amenities-main-entrance.mp4', alt: 'Main entrance tour', type: 'video', category: 'amenities' },
    { src: '/images/amenities/amenities-coat-room.mp4', alt: 'Coat room facilities', type: 'video', category: 'amenities' },
    
    // Interior photos
    { src: '/images/interior/hallway-and-washrooms.mp4', alt: 'Hallway and washroom facilities', type: 'video', category: 'interior' },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Photo Gallery
      </Typography>

      <Typography variant="body1" paragraph sx={{ mb: 4 }}>
        Explore our beautiful community hall through these photos and videos. See the spacious main hall, 
        modern kitchen facilities, accessible features, and all the amenities we offer.
      </Typography>

      {/* Full Photo Gallery */}
      <PhotoGallery photos={photos} title="Complete Hall Gallery" />
    </Container>
  );
}
