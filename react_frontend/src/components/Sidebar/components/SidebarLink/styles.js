import { makeStyles } from 'styles/mui';

export default makeStyles((theme) => ({
  link: {
    borderRadius: 12,
    margin: '4px 8px',
    padding: '10px 16px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      transform: 'translateX(4px)',
    },
  },
  active: {
    backgroundColor: theme.palette.primary.light + '22',
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 5,
      height: '60%',
      backgroundColor: theme.palette.primary.main,
      borderRadius: '0 6px 6px 0',
    },
  },
  icon: {
    minWidth: 40,
    color: theme.palette.text.secondary,
    transition: 'color 0.2s',
  },
  iconActive: {
    color: theme.palette.primary.main,
  },
  text: {
    fontWeight: 500,
    fontSize: '0.96rem',
    color: theme.palette.text.primary,
  },
  textActive: {
    fontWeight: 600,
    color: theme.palette.primary.main,
  },
  textHidden: {
    opacity: 0,
    width: 0,
  },
  expandIcon: {
    transition: 'transform 0.3s',
    color: theme.palette.text.secondary,
  },
  expandOpen: {
    transform: 'rotate(180deg)',
  },
  sectionTitle: {
    paddingLeft: 24,
    marginTop: 24,
    marginBottom: 8,
    fontSize: '0.78rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: theme.palette.text.secondary,
  },
  hidden: {
    opacity: 0,
  },
}));