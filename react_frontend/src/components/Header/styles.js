import { makeStyles } from 'styles/mui';
import { alpha } from '@mui/material/styles';

export default makeStyles((theme) => ({
  // ----- Top Bar -----
  appBar: {
    width: '100%',
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  toolbar: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    minHeight: 56, // better touch targets on mobile
    [theme.breakpoints.up('sm')]: {
      minHeight: 64,
    },
  },

  // ----- Logo / Title -----
  logotype: {
    color: 'white',
    marginLeft: theme.spacing(2.5),
    marginRight: theme.spacing(2.5),
    fontWeight: 500,
    fontSize: 18,
    whiteSpace: 'nowrap',
    [theme.breakpoints.down('xs')]: {
      display: 'none',
    },
  },

  // ----- Utilities -----
  grow: {
    flexGrow: 1,
  },
  hide: {
    display: 'none',
  },

  // ----- Search (unused in current Header, kept for completeness) -----
  search: {
    position: 'relative',
    borderRadius: 25,
    paddingLeft: theme.spacing(2.5),
    width: 36,
    backgroundColor: alpha(theme.palette.common.black, 0),
    transition: theme.transitions.create(['background-color', 'width']),
    '&:hover': {
      cursor: 'pointer',
      backgroundColor: alpha(theme.palette.common.black, 0.08),
    },
  },
  searchFocused: {
    backgroundColor: alpha(theme.palette.common.black, 0.08),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: 250,
    },
  },
  searchIcon: {
    width: 36,
    right: 0,
    height: '100%',
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: theme.transitions.create('right'),
    '&:hover': {
      cursor: 'pointer',
    },
  },
  searchIconOpened: {
    right: theme.spacing(1.25),
  },
  inputRoot: {
    color: 'inherit',
    width: '100%',
  },
  inputInput: {
    height: 36,
    padding: 0,
    paddingRight: 36 + theme.spacing(1.25),
    width: '100%',
  },

  // ----- Header Buttons / Icons -----
  headerMenuButton: {
    marginLeft: theme.spacing(2),
    padding: theme.spacing(0.5),
    // increase touch area on mobile
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1),
    },
  },
  headerMenuButtonSandwich: {
    marginLeft: 9,
    [theme.breakpoints.down('sm')]: {
      marginLeft: 0,
    },
    padding: theme.spacing(0.5),
  },
  headerMenuButtonCollapse: {
    marginRight: theme.spacing(2),
  },
  headerIcon: {
    fontSize: 28,
    color: 'rgba(255, 255, 255, 0.35)',
  },
  headerIconCollapse: {
    color: 'white',
  },

  // ----- Profile Menu (Dropdown) -----
  headerMenu: {
    marginTop: theme.spacing(2),
  },
  headerMenuList: {
    display: 'flex',
    flexDirection: 'column',
  },
  headerMenuItem: {
    '&:hover, &:focus': {
      backgroundColor: theme.palette.background.light,
    },
  },

  profileMenu: {
    minWidth: 265,
    // On mobile, the paper will be full‑width via the sx prop, but we keep this as fallback:
    [theme.breakpoints.down('sm')]: {
      minWidth: '100%',
    },
  },
  profileMenuUser: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`, // visual separation
  },
  profileMenuItem: {
    color: theme.palette.text.hint,
    minHeight: 48, // larger touch target
    padding: theme.spacing(1.5, 2),
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  profileMenuIcon: {
    marginRight: theme.spacing(2),
    color: theme.palette.text.hint,
    '&:hover': {
      color: theme.palette.primary.main,
    },
  },
  profileMenuLink: {
    fontSize: 16,
    textDecoration: 'none',
    padding: theme.spacing(1.5, 0),
    display: 'inline-block',
    '&:hover': {
      cursor: 'pointer',
      textDecoration: 'underline',
    },
  },

  // ----- Greeting Label -----
  profileLabel: {
    fontSize: 14,
    [theme.breakpoints.down('xs')]: {
      display: 'none', // hide on extra‑small screens to save space
    },
  },

  // ----- Message & Other (unused in current Header, kept for completeness) -----
  messageContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  messageNotification: {
    height: 'auto',
    display: 'flex',
    alignItems: 'center',
    '&:hover, &:focus': {
      backgroundColor: theme.palette.background.light,
    },
  },
  messageNotificationSide: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: theme.spacing(2),
  },
  messageNotificationBodySide: {
    alignItems: 'flex-start',
    marginRight: 0,
  },
  sendMessageButton: {
    margin: theme.spacing(4),
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    textTransform: 'none',
  },
  sendButtonIcon: {
    marginLeft: theme.spacing(2),
  },
  purchaseBtn: {
    [theme.breakpoints.down('sm')]: {
      display: 'none',
    },
    marginRight: theme.spacing(3),
  },
}));