import React from 'react';
import { Container, Typography, Box, Paper, Grid, Card, CardContent, Button, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { 
  GroupAdd, 
  CalendarToday, 
  Email, 
  LocationOn, 
  AccessTime,
  CheckCircle,
  People,
  Handshake,
  VolunteerActivism
} from '@mui/icons-material';
import ScrollableCalendar from '../components/ScrollableCalendar';

export default function MembershipPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        Join Our Community
      </Typography>
      
      <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
        Become a Member of the Capitol Hill Community Hall Association
      </Typography>
      
      <Typography variant="body1" paragraph sx={{ textAlign: 'center', fontSize: '1.1rem', color: 'text.secondary' }}>
        Help preserve and support your community hall while connecting with neighbors and making a difference in Burnaby.
      </Typography>

      {/* Meeting Information Card */}
      <Paper elevation={3} sx={{ p: 4, mb: 4, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CalendarToday sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Regular Association Meetings
          </Typography>
          <Typography variant="h6" gutterBottom>
            Every Second Tuesday of the Month
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            <AccessTime />
            <Typography variant="body1">7:00 PM - 9:00 PM</Typography>
          </Box>
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            <LocationOn />
            <Typography variant="body1">Capitol Hill Community Hall, 361 Howard Avenue, Burnaby</Typography>
          </Box>
          <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
            All community members are welcome to attend and learn about becoming a member!
          </Typography>
        </Box>
      </Paper>

      {/* Community Calendar */}
      <ScrollableCalendar 
        calendarId="MzcwZjk5NjkwM2NjMTZkZWQ0MGUzMzBhMmY5MzUxYzU2ODk5ZjY2OTQzNzk5ZjY2NDFlOTcyMzQwZGFmNWE0YUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t"
        title="Community Events & Meetings"
        height="450px"
      />

      {/* Benefits Grid */}
      <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, mb: 3 }}>
        Why Join Our Association?
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <ListItemIcon sx={{ mb: 2 }}>
                <Handshake color="primary" sx={{ fontSize: 40 }} />
              </ListItemIcon>
              <Typography variant="h6" gutterBottom>
                Community Leadership
              </Typography>
              <Typography variant="body2">
                Have a voice in decisions about your community hall and help shape its future direction and improvements.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <ListItemIcon sx={{ mb: 2 }}>
                <VolunteerActivism color="primary" sx={{ fontSize: 40 }} />
              </ListItemIcon>
              <Typography variant="h6" gutterBottom>
                Volunteer Opportunities
              </Typography>
              <Typography variant="body2">
                Participate in community events, maintenance projects, and special initiatives that benefit the neighborhood.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <ListItemIcon sx={{ mb: 2 }}>
                <People color="primary" sx={{ fontSize: 40 }} />
              </ListItemIcon>
              <Typography variant="h6" gutterBottom>
                Community Connections
              </Typography>
              <Typography variant="body2">
                Meet your neighbors, build lasting friendships, and become part of a close-knit community that cares about Burnaby.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <ListItemIcon sx={{ mb: 2 }}>
                <CheckCircle color="primary" sx={{ fontSize: 40 }} />
              </ListItemIcon>
              <Typography variant="h6" gutterBottom>
                Hall Rental Benefits
              </Typography>
              <Typography variant="body2">
                Members receive priority booking and special rates for hall rentals, plus access to member-only events and activities.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* How to Join */}
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
          How to Become a Member
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom color="primary">
              Step 1: Attend a Meeting
            </Typography>
            <Typography variant="body2" paragraph>
              Come to our next monthly meeting (second Tuesday of each month at 7:00 PM) to learn more about the association and meet current members.
            </Typography>
            
            <Typography variant="h6" gutterBottom color="primary">
              Step 2: Complete Membership Application
            </Typography>
            <Typography variant="body2" paragraph>
              Fill out a membership application form available at the meeting. Membership is open to all residents of the Capitol Hill area and surrounding communities.
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom color="primary">
              Step 3: Pay Annual Dues
            </Typography>
            <Typography variant="body2" paragraph>
              Annual membership dues are $1 per member. This helps support hall maintenance, community events, and association activities.
            </Typography>
            
            <Typography variant="h6" gutterBottom color="primary">
              Step 4: Get Involved
            </Typography>
            <Typography variant="body2" paragraph>
              Once approved, you'll receive voting rights and can participate in all association activities, committees, and decision-making processes.
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Mailing List Signup */}
      <Paper elevation={2} sx={{ p: 4, mb: 4, bgcolor: 'grey.50' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Email sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Stay Connected
          </Typography>
          <Typography variant="body1" paragraph>
            Can't make it to meetings? Join our mailing list to stay informed about:
          </Typography>
          
          <List sx={{ maxWidth: 400, mx: 'auto' }}>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText primary="Meeting announcements and minutes" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText primary="Community events and activities" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText primary="Hall maintenance updates" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText primary="Volunteer opportunities" />
            </ListItem>
          </List>

          <Box sx={{ mt: 3 }}>
            <Button 
              variant="contained" 
              size="large"
              startIcon={<Email />}
              href="mailto:info@caphillhall.ca?subject=Join Mailing List&body=Please add me to the Capitol Hill Community Hall Association mailing list. My name is [Your Name] and my email is [Your Email]."
              sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                }
              }}
            >
              Join Mailing List
            </Button>
          </Box>
          
          <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
            Click the button above to send us an email and we'll add you to our mailing list
          </Typography>
        </Box>
      </Paper>

      {/* Contact Information */}
      <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Questions About Membership?
        </Typography>
        <Typography variant="body2" paragraph>
          Contact us at <strong>info@caphillhall.ca</strong> or call <strong>(604) 500-9505</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          We'd love to answer any questions you have about joining our community association!
        </Typography>
      </Paper>
    </Container>
  );
}
