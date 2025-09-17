'use client';

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardMedia,
  Modal,
  IconButton,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
} from '@mui/icons-material';

interface PhotoItem {
  src: string;
  alt: string;
  type: 'image' | 'video';
  category: string;
}

interface PhotoGalleryProps {
  photos: PhotoItem[];
  title?: string;
  maxItems?: number;
}

export default function PhotoGallery({ photos, title = "Photo Gallery", maxItems }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [open, setOpen] = useState(false);

  const displayPhotos = maxItems ? photos.slice(0, maxItems) : photos;

  const handlePhotoClick = (photo: PhotoItem) => {
    setSelectedPhoto(photo);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedPhoto(null);
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      exterior: '#2e7d32',
      interior: '#1976d2',
      kitchen: '#f57c00',
      hall: '#7b1fa2',
      amenities: '#d32f2f',
    };
    return colors[category] || '#666';
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
        {title}
      </Typography>
      
      <Grid container spacing={2}>
        {displayPhotos.map((photo, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: 4,
                }
              }}
              onClick={() => handlePhotoClick(photo)}
            >
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component={photo.type === 'video' ? 'video' : 'img'}
                  height="200"
                  image={photo.src}
                  alt={photo.alt}
                  sx={{ 
                    objectFit: 'cover',
                    '& video': {
                      objectFit: 'cover',
                    }
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    display: 'flex',
                    gap: 1,
                  }}
                >
                  <Chip
                    label={photo.category}
                    size="small"
                    sx={{
                      backgroundColor: getCategoryColor(photo.category),
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                  {photo.type === 'video' && (
                    <Chip
                      icon={<PlayIcon />}
                      label="Video"
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                      }}
                    />
                  )}
                </Box>
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    right: 8,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: 1,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" noWrap>
                    {photo.alt}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Modal for full-size viewing */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'black',
            color: 'white',
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{selectedPhoto?.alt}</Typography>
          <IconButton onClick={handleClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedPhoto && (
            <Box sx={{ textAlign: 'center' }}>
              {selectedPhoto.type === 'video' ? (
                <video
                  controls
                  autoPlay
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '70vh',
                  }}
                >
                  <source src={selectedPhoto.src} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                  src={selectedPhoto.src}
                  alt={selectedPhoto.alt}
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                  }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} sx={{ color: 'white' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
