import { makeStyles } from 'styles/mui';

const drawerWidth = 280;

export default makeStyles((theme) => ({
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    background: theme.palette.mode === 'dark'
        ? 'linear-gradient(180deg, #0f172a 0%, #1e2937 100%)'
        : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    borderRight: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '4px 0 20px rgba(0,0,0,0.06)',
  },
  drawerOpen: {
    width: drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: 280,
    }),
  },
  drawerClose: {
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: 240,
    }),
    overflowX: 'hidden',
    width: 72,
    [theme.breakpoints.down('sm')]: { width: drawerWidth },
  },
  toolbar: {
    ...theme.mixins.toolbar,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(2),
  },
  sidebarList: {
    padding: theme.spacing(1, 1.5),
    marginTop: theme.spacing(1),
  },
  mobileBackButton: {
    marginTop: theme.spacing(1),
    marginLeft: theme.spacing(2),
    [theme.breakpoints.up('md')]: { display: 'none' },
  },
}));