// src/pages/profile/Profile.jsx
import { useState } from 'react';
import {
  Grid,
  Typography,
  TextField,
  CircularProgress,
  Avatar,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  LinkedIn as LinkedInIcon,
  Twitter as TwitterIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

import useStyles from './profileStyles';   // <-- new styles file
import Widget from '../../components/Widget/Widget';
import { authService } from 'services/auth.service';
import { showSnackbar } from 'utils/snackbar';
import { useAuth } from 'context/AuthContext';

export default function Profile() {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { user, updateUser, roles } = useAuth();

  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [profileLoading, setProfileLoading] = useState(false);

  const [passForm, setPassForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [passLoading, setPassLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const roleDisplayName = user?.role?.display_name || (roles.length > 0 ? roles[0] : 'User');
  const avatarSize = isMobile ? 80 : 120;

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await authService.updateProfile(profileForm);
      if (res.data.success) {
        updateUser(res.data.data.user);
        showSnackbar({ type: 'success', message: 'Profile updated' });
        setEditMode(false);
      } else {
        showSnackbar({ type: 'error', message: res.data.message });
      }
    } catch (err) {
      showSnackbar({ type: 'error', message: err.response?.data?.message || 'Update failed' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passForm.password !== passForm.password_confirmation) {
      showSnackbar({ type: 'error', message: 'New passwords do not match' });
      return;
    }
    setPassLoading(true);
    try {
      const res = await authService.changePassword(
          passForm.current_password,
          passForm.password,
          passForm.password_confirmation
      );
      if (res.data.success) {
        showSnackbar({ type: 'success', message: 'Password changed successfully' });
        setPassForm({ current_password: '', password: '', password_confirmation: '' });
      } else {
        showSnackbar({ type: 'error', message: res.data.message });
      }
    } catch (err) {
      showSnackbar({ type: 'error', message: err.response?.data?.message || 'Password change failed' });
    } finally {
      setPassLoading(false);
    }
  };

  return (
      <Grid container spacing={3} sx={{ width: '100%', margin: 0, padding: { xs: 1, sm: 2 } }}>
        {/* Left column – Profile card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Widget sx={{ height: '100%' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid
                  size={{ xs: 12, sm: 4 }}
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'column',
                  }}
              >
                <div className={classes.visualProfile}>
                  <div className={classes.profileImage}>
                    <Avatar
                        sx={{ width: avatarSize, height: avatarSize }}
                        src={user?.avatar || ''}
                    >
                      {user?.name?.charAt(0) || 'U'}
                    </Avatar>
                  </div>
                  <Chip
                      className={classes.chipMargin}
                      color="secondary"
                      label={roleDisplayName}
                      sx={{ mt: 1 }}
                  />
                </div>
              </Grid>
              <Grid
                  size={{ xs: 12, sm: 8 }}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: { xs: 'center', sm: 'flex-start' },
                    textAlign: { xs: 'center', sm: 'left' },
                  }}
              >
                <div className={classes.profileDescription}>
                  {editMode ? (
                      <form onSubmit={handleProfileUpdate} style={{ width: '100%' }}>
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Full Name"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            required
                            size={isMobile ? 'small' : 'medium'}
                        />
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Phone"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                            size={isMobile ? 'small' : 'medium'}
                        />
                        <div
                            style={{
                              display: 'flex',
                              gap: 8,
                              marginTop: 16,
                              flexWrap: 'wrap',
                              justifyContent: isMobile ? 'center' : 'flex-start',
                            }}
                        >
                          <Button type="submit" variant="contained" color="primary" disabled={profileLoading}>
                            {profileLoading ? <CircularProgress size={24} /> : 'Save'}
                          </Button>
                          <Button variant="outlined" onClick={() => setEditMode(false)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                  ) : (
                      <>
                        <Typography
                            variant={isMobile ? 'h5' : 'h4'}
                            className={classes.profileTitle}
                            gutterBottom
                        >
                          {user?.name}
                        </Typography>
                        <Typography
                            variant="subtitle1"
                            className={classes.profileSubtitle}
                            gutterBottom
                        >
                          {roleDisplayName}
                        </Typography>
                        <a className={classes.profileExternalRes} href={`mailto:${user?.email}`}>
                          {user?.email}
                        </a>
                        <div className={classes.socials}>
                          <IconButton size="small" component="a" href="#">
                            <FacebookIcon fontSize={isMobile ? 'small' : 'medium'} />
                          </IconButton>
                          <IconButton size="small" component="a" href="#">
                            <TwitterIcon fontSize={isMobile ? 'small' : 'medium'} />
                          </IconButton>
                          <IconButton size="small" component="a" href="#">
                            <LinkedInIcon fontSize={isMobile ? 'small' : 'medium'} />
                          </IconButton>
                          <IconButton size="small" component="a" href="#">
                            <InstagramIcon fontSize={isMobile ? 'small' : 'medium'} />
                          </IconButton>
                        </div>
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={() => setEditMode(true)}
                            sx={{ mt: 1 }}
                            fullWidth={isMobile}
                        >
                          Edit Profile
                        </Button>
                      </>
                  )}
                </div>
              </Grid>
            </Grid>
          </Widget>
        </Grid>

        {/* Right column – Change Password card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Widget title="Change Password" sx={{ height: '100%' }}>
            <form onSubmit={handlePasswordChange}>
              <TextField
                  fullWidth
                  margin="normal"
                  type={showCurrentPassword ? 'text' : 'password'}
                  label="Current Password"
                  value={passForm.current_password}
                  onChange={(e) => setPassForm({ ...passForm, current_password: e.target.value })}
                  required
                  size={isMobile ? 'small' : 'medium'}
                  InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              edge="end"
                              size={isMobile ? 'small' : 'medium'}
                          >
                            {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                    ),
                  }}
              />
              <TextField
                  fullWidth
                  margin="normal"
                  type={showNewPassword ? 'text' : 'password'}
                  label="New Password"
                  value={passForm.password}
                  onChange={(e) => setPassForm({ ...passForm, password: e.target.value })}
                  required
                  size={isMobile ? 'small' : 'medium'}
                  InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              edge="end"
                              size={isMobile ? 'small' : 'medium'}
                          >
                            {showNewPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                    ),
                  }}
              />
              <TextField
                  fullWidth
                  margin="normal"
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirm Password"
                  value={passForm.password_confirmation}
                  onChange={(e) => setPassForm({ ...passForm, password_confirmation: e.target.value })}
                  required
                  size={isMobile ? 'small' : 'medium'}
                  InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                              size={isMobile ? 'small' : 'medium'}
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                    ),
                  }}
              />
              <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={passLoading}
                  sx={{ mt: 2 }}
                  fullWidth={isMobile}
              >
                {passLoading ? <CircularProgress size={24} /> : 'Change Password'}
              </Button>
            </form>
          </Widget>
        </Grid>
      </Grid>
  );
}