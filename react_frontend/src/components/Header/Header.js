import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Person as AccountIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import classNames from 'classnames';

import useStyles from './styles';
import { toggleSidebar, useLayoutDispatch, useLayoutState } from 'context/LayoutContext';
import { useAuth } from 'context/AuthContext';

const profileImg = '/assets/favicon.png';

export default function Header() {
  const classes = useStyles();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('xs'));
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const layoutState = useLayoutState();
  const layoutDispatch = useLayoutDispatch();

  const [profileMenu, setProfileMenu] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
      <AppBar position="fixed" className={classes.appBar}>
        <Toolbar className={classes.toolbar}>
          <IconButton
              color="inherit"
              onClick={() => toggleSidebar(layoutDispatch)}
              className={classNames(classes.headerMenuButton, classes.headerMenuButtonCollapse)}
          >
            {layoutState.isSidebarOpened ? (
                <ArrowBackIcon classes={{ root: classNames(classes.headerIcon, classes.headerIconCollapse) }} />
            ) : (
                <MenuIcon classes={{ root: classNames(classes.headerIcon, classes.headerIconCollapse) }} />
            )}
          </IconButton>

          <Typography variant="h6" className={classes.logotype}>
            IMS
          </Typography>

          <div className={classes.grow} />

          <IconButton
              aria-haspopup="true"
              color="inherit"
              className={classes.headerMenuButton}
              aria-controls="profile-menu"
              onClick={(e) => setProfileMenu(e.currentTarget)}
          >
            <Avatar src={user?.avatar || profileImg} classes={{ root: classes.headerIcon }}>
              {user?.name?.charAt(0) || 'U'}
            </Avatar>
          </IconButton>

          {/* Greeting – hidden on extra‑small screens to save space */}
          {!isXs && (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                <Box component="span" className={classes.profileLabel}>Hi,&nbsp;</Box>
                <Box component="span" fontWeight="bold" className={classes.profileLabel}>
                  {user?.name?.split(' ')[0] || 'User'}
                </Box>
              </Box>
          )}

          <Menu
              id="profile-menu"
              open={Boolean(profileMenu)}
              anchorEl={profileMenu}
              onClose={() => setProfileMenu(null)}
              className={classes.headerMenu}
              classes={{ paper: classes.profileMenu }}
              disableAutoFocusItem
              // On mobile, anchor to the top of the screen for full‑width
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'center',
              }}
              sx={{
                '& .MuiPaper-root': {
                  width: isSm ? '100%' : 'auto',
                  maxWidth: isSm ? '100%' : 320,
                  left: isSm ? '0 !important' : 'auto',
                  right: isSm ? '0 !important' : 'auto',
                  marginTop: isSm ? theme.spacing(1) : 0,
                  borderRadius: isSm ? 0 : theme.shape.borderRadius,
                },
              }}
          >
            <div className={classes.profileMenuUser}>
              <Typography variant="h4" fontWeight="medium">
                {user?.name}
              </Typography>
            </div>
            <MenuItem
                className={classNames(classes.profileMenuItem, classes.headerMenuItem)}
                onClick={() => {
                  setProfileMenu(null);
                  navigate('/app/profile');
                }}
            >
              <AccountIcon className={classes.profileMenuIcon} />
              Profile
            </MenuItem>
            <div className={classes.profileMenuUser}>
              <Typography className={classes.profileMenuLink} color="primary" onClick={handleLogout}>
                Sign Out
              </Typography>
            </div>
          </Menu>
        </Toolbar>
      </AppBar>
  );
}