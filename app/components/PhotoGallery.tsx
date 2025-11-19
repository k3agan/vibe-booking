'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
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
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
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
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [open, setOpen] = useState(false);

  const displayPhotos = maxItems ? photos.slice(0, maxItems) : photos;

  const handlePhotoClick = (photo: PhotoItem, index: number) => {
    setSelectedPhoto(photo);
    setSelectedIndex(index);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedPhoto(null);
    setSelectedIndex(-1);
  };

  const handlePrevious = () => {
    if (selectedIndex > 0) {
      const newIndex = selectedIndex - 1;
      setSelectedIndex(newIndex);
      setSelectedPhoto(displayPhotos[newIndex]);
    }
  };

  const handleNext = () => {
    if (selectedIndex < displayPhotos.length - 1) {
      const newIndex = selectedIndex + 1;
      setSelectedIndex(newIndex);
      setSelectedPhoto(displayPhotos[newIndex]);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && selectedIndex > 0) {
        const newIndex = selectedIndex - 1;
        setSelectedIndex(newIndex);
        setSelectedPhoto(displayPhotos[newIndex]);
      } else if (event.key === 'ArrowRight' && selectedIndex < displayPhotos.length - 1) {
        const newIndex = selectedIndex + 1;
        setSelectedIndex(newIndex);
        setSelectedPhoto(displayPhotos[newIndex]);
      } else if (event.key === 'Escape') {
        setOpen(false);
        setSelectedPhoto(null);
        setSelectedIndex(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, displayPhotos]);

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
              onClick={() => handlePhotoClick(photo, index)}
            >
              <Box sx={{ position: 'relative', height: 200, overflow: 'hidden' }}>
                {photo.type === 'video' ? (
                  <Box
                    component="video"
                    src={photo.src}
                    preload="none"
                    muted
                    sx={{ 
                      objectFit: 'cover',
                      width: '100%',
                      height: '100%',
                    }}
                  />
                ) : (
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 33vw"
                    style={{ objectFit: 'cover' }}
                    loading="lazy"
                  />
                )}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              {selectedPhoto?.alt}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {selectedIndex >= 0 && `${selectedIndex + 1} / ${displayPhotos.length}`}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          {selectedPhoto && (
            <Box sx={{ textAlign: 'center', position: 'relative' }}>
              {/* Previous Button */}
              {selectedIndex > 0 && (
                <IconButton
                  onClick={handlePrevious}
                  sx={{
                    position: 'absolute',
                    left: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    zIndex: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.7)',
                    },
                  }}
                  aria-label="Previous image"
                >
                  <ChevronLeftIcon fontSize="large" />
                </IconButton>
              )}

              {/* Next Button */}
              {selectedIndex < displayPhotos.length - 1 && (
                <IconButton
                  onClick={handleNext}
                  sx={{
                    position: 'absolute',
                    right: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    zIndex: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.7)',
                    },
                  }}
                  aria-label="Next image"
                >
                  <ChevronRightIcon fontSize="large" />
                </IconButton>
              )}

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
                <Image
                  src={selectedPhoto.src}
                  alt={selectedPhoto.alt}
                  width={1200}
                  height={800}
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                  }}
                  priority
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 2 }}>
          <Box>
            {selectedIndex > 0 && (
              <Button 
                onClick={handlePrevious} 
                startIcon={<ChevronLeftIcon />}
                sx={{ color: 'white' }}
              >
                Previous
              </Button>
            )}
          </Box>
          <Button onClick={handleClose} sx={{ color: 'white' }}>
            Close
          </Button>
          <Box>
            {selectedIndex < displayPhotos.length - 1 && (
              <Button 
                onClick={handleNext} 
                endIcon={<ChevronRightIcon />}
                sx={{ color: 'white' }}
              >
                Next
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
