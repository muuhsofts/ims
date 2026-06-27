import { makeStyles } from "styles/mui";

export default makeStyles((theme) => ({
    visualProfile: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
    },
    profileImage: {
        padding: 5,
        border: `3px dotted ${theme.palette.primary.main}`,
        borderRadius: '50%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        // responsive size handled in component via useMediaQuery, but keep max width
        maxWidth: 200,
        [theme.breakpoints.down('sm')]: {
            maxWidth: 140,
        },
    },
    profileDescription: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        [theme.breakpoints.down('sm')]: {
            alignItems: 'center',
            textAlign: 'center',
        },
    },
    profileTitle: {
        fontWeight: 500,
        // font size controlled by variant in component
        wordBreak: 'break-word',
    },
    profileSubtitle: {
        color: theme.palette.text.secondary,
        marginBottom: theme.spacing(1),
    },
    profileExternalRes: {
        color: theme.palette.primary.main,
        textDecoration: 'none',
        marginBottom: theme.spacing(1),
        wordBreak: 'break-all',
        '&:hover': {
            textDecoration: 'underline',
        },
    },
    chipMargin: {
        marginTop: theme.spacing(1),
        marginBottom: theme.spacing(1),
    },
    socials: {
        display: 'flex',
        gap: theme.spacing(1),
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: theme.spacing(1),
    },
}));