import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import Link from 'next/link'; // Use Next.js Link for navigation
import { hallInfo } from '../data/hallInfo'; // Import hall data

export default function Header() {
  return (
    <AppBar position="static"> {/* Or position="sticky" for a sticky header */}
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link href="/" passHref style={{ textDecoration: 'none', color: 'inherit' }}>
            {hallInfo.name} {/* Use hall name from data */}
          </Link>
        </Typography>

        {/* Navigation Links */}
        <Box>
          <Button color="inherit" component={Link} href="/hall-details">Hall Details</Button>
          <Button color="inherit" component={Link} href="/gallery">Gallery</Button>
          <Button color="inherit" component={Link} href="/history">History</Button>
          <Button color="inherit" component={Link} href="/membership">Membership</Button>
          <Button color="inherit" component={Link} href="/rates">Rates</Button>
          <Button color="inherit" component={Link} href="/availability">Availability</Button>
          <Button color="inherit" component={Link} href="/community">Community Impact</Button>
          <Button color="inherit" component={Link} href="/contact">Contact</Button>
          <Button 
            variant="contained" 
            component={Link} 
            href="/book-now"
            sx={{ 
              ml: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1rem',
              px: 3,
              py: 1.2,
              borderRadius: '8px',
              textTransform: 'none',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
              border: 'none',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              minHeight: '40px',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                '&::before': {
                  transform: 'scale(1)',
                  opacity: 1,
                }
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
                transform: 'scale(0)',
                opacity: 0,
                transition: 'all 0.3s ease',
                borderRadius: '8px',
              },
              '&:active': {
                transform: 'translateY(0px)',
                boxShadow: '0 3px 12px rgba(102, 126, 234, 0.3)',
              }
            }}
          >
            Book Now
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
} 