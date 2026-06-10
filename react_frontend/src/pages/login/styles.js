// src/pages/auth/styles.js
import { makeStyles } from 'styles/mui';

export const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  // Floating circles
  circle1: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)',
    top: '-100px',
    right: '-100px',
    zIndex: 1,
  },
  circle2: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)',
    bottom: '-50px',
    left: '-50px',
    zIndex: 1,
  },
  circle3: {
    position: 'absolute',
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    top: '30%',
    left: '10%',
    zIndex: 1,
  },
  cardContainer: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: '450px',
    margin: '0 auto',
    padding: theme.spacing(2),
  },
  card: {
    padding: theme.spacing(4),
    borderRadius: theme.spacing(2),
    backdropFilter: 'blur(2px)',
    backgroundColor: 'rgba(255,255,255,0.95)',
    boxShadow: theme.shadows[10],
  },
  logo: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: theme.spacing(2),
  },
  logoImage: {
    width: '80px',
    height: 'auto',
  },
  title: {
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: theme.spacing(0.5),
  },
  subtitle: {
    textAlign: 'center',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(3),
  },
  textField: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  errorMessage: {
    color: theme.palette.error.main,
    marginTop: theme.spacing(1),
    fontSize: '0.875rem',
  },
  loginButton: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(2),
    paddingTop: theme.spacing(1.5),
    paddingBottom: theme.spacing(1.5),
    borderRadius: theme.spacing(2),
  },
  forgotLink: {
    textTransform: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
}));