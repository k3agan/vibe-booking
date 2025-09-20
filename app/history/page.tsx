import React from 'react';
import { Container, Typography, Box, Paper, Grid, Card, CardContent, Button, Link as MuiLink } from '@mui/material';
import Link from 'next/link';

export default function HistoryPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        Historical Significance
      </Typography>
      
      <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, mb: 2 }}>
        A Community Landmark Since 1947
      </Typography>
      
      <Typography variant="body1" paragraph>
        The Capitol Hill Community Hall was constructed in 1947-1948 as a non-partisan public space to serve a variety of community groups, including groups with different political views and religious affiliations. The ability of the founding members to set their differences aside and work collaboratively to construct the hall for the benefit of the wider community is an enduring part of the hall's legacy.
      </Typography>
      
      <Typography variant="body1" paragraph>
        The first meeting of the Capitol Hill Community Hall Association held in the building took place on December 16th, 1947, and final construction work completed in February 1948. An extension was added later in 1948, to extend the building to its current size.
      </Typography>

      {/* Historical Image Section */}
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Paper elevation={3} sx={{ p: 2, display: 'inline-block' }}>
          <img
            src="https://search.heritageburnaby.ca/media/hpo/_Data/_Planning_Images/_Unrestricted/Inventory/BBY-361-Howard-Av--1948-Archives%20258-001.jpg"
            alt="Capitol Hill Community Hall - Historical View 1948"
            style={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: '8px',
              maxHeight: '500px'
            }}
          />
          <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic' }}>
            Capitol Hill Community Hall under construction, 1948. Copyright: City of Burnaby Archives 258-001
          </Typography>
        </Paper>
      </Box>

      {/* Official Heritage Link */}
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Paper elevation={2} sx={{ p: 3, bgcolor: 'primary.light' }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.contrastText' }}>
            Official Heritage Recognition
          </Typography>
          <Typography variant="body2" paragraph sx={{ color: 'primary.contrastText' }}>
            The Capitol Hill Community Hall is officially recognized as a heritage landmark by the City of Burnaby.
          </Typography>
          <Button
            variant="contained"
            component={MuiLink}
            href="https://search.heritageburnaby.ca/link/landmark563"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              bgcolor: 'white',
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'grey.100',
              },
            }}
          >
            View Official Heritage Documentation
          </Button>
        </Paper>
      </Box>

      <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Defining Elements
      </Typography>
      
      <Typography variant="body1" paragraph>
        Key elements that define the heritage character of the Capitol Hill Community Hall include:
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                🏘️ Community Location
              </Typography>
              <Typography variant="body2">
                Located in Burnaby's Capitol Hill neighbourhood and adjacent to the terminus of the Hastings Street streetcar line at Hastings and Ellesmere Avenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                🤝 Social Significance
              </Typography>
              <Typography variant="body2">
                The building has social and community significance to the Capitol Hill neighbourhood, the City of Burnaby, and for local community organizations
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                🗳️ Civic Functions
              </Typography>
              <Typography variant="body2">
                Continuing use of the hall for community functions and events, such as meetings and gatherings, and civic functions as a polling station and as a venue for all-candidates meetings
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                🛠️ Community Construction
              </Typography>
              <Typography variant="body2">
                Modest finishes and volunteer labour, to construct the building in a time of rising labour and building supply costs
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                🏗️ Architectural Design
              </Typography>
              <Typography variant="body2">
                Simple form, scale, and massing as expressed by its one-storey height, rectilinear plan, gabled roof. Consistent scale and design to neighbouring properties at time of construction
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                🌳 Dynes Park Location
              </Typography>
              <Typography variant="body2">
                Located and built on a triangular shaped lot in a community park known as Dynes Park - named after William Dynes, an active member of the Hall Association and also the foreman of construction (the park was dedicated in 1944)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper elevation={2} sx={{ p: 3, mt: 4, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom color="primary">
          🏛️ Construction Details
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Architect:</strong> Harold Cullerne (1890-1976) designed the two-storey community hall in 1943. After returning from service during the First World War, he joined J.H. Bowman in a partnership that lasted from 1919 to 1934. After Bowman retired in 1934, Cullerne practiced on his own, continuing to work on schools and institutional buildings, such as the Art Deco Hollywood Theatre in Vancouver.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Construction:</strong> Wood-framed construction with large attic space. Built in two parts as seen by different construction detailing in the attic, ceiling panels, and foundation walls as per recorded minutes. The building was constructed through volunteer labour, including the work of William James Dynes who served as the project foreman, and George Green who served as the Chairman of the Building Committee.
        </Typography>
        <Typography variant="body2">
          <strong>Original brick chimney</strong> in first section of the hall to be constructed by Ernest Winch, M.P.
        </Typography>
      </Paper>

      <Box sx={{ mt: 4, p: 3, bgcolor: 'primary.light', borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'primary.contrastText' }}>
          Preserving Community Heritage
        </Typography>
        <Typography variant="body2" sx={{ color: 'primary.contrastText' }}>
          Today, the Capitol Hill Community Hall continues to serve as a vital gathering place for the community, 
          maintaining its original purpose while adapting to modern needs. Every rental helps preserve this 
          important piece of Burnaby's history.
        </Typography>
      </Box>
    </Container>
  );
}
