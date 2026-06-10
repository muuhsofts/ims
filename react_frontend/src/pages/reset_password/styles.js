import { makeStyles } from 'styles/mui';

export default makeStyles((theme) => ({
    container: {
        height: '100vh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: 0,
        left: 0,
    },
    logotypeContainer: {
        backgroundColor: theme.palette.primary.main,
        width: '60%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1rem',
        [theme.breakpoints.down('md')]: {
            width: '50%',
            display: 'none',
        },
    },
    logotypeImage: {
        width: 165,
        marginBottom: theme.spacing(4),
    },
    logotypeText: {
        color: 'white',
        fontWeight: 500,
        fontSize: 84,
        textAlign: 'center',
        [theme.breakpoints.down('md')]: {
            fontSize: 48,
        },
    },
    formContainer: {
        width: '40%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        alignItems: 'center',
        [theme.breakpoints.down('md')]: {
            width: '50%',
            overflow: 'visible',
        },
    },
    form: {
        width: 320,
    },
    greeting: {
        fontWeight: 500,
        textAlign: 'center',
        marginTop: theme.spacing(4),
    },
    subGreeting: {
        fontWeight: 500,
        textAlign: 'center',
        marginTop: theme.spacing(2),
    },
    errorMessage: {
        textAlign: 'center',
        color: '#ff0000ba',
    },
    formButtons: {
        width: '100%',
        marginTop: theme.spacing(4),
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    copyright: {
        marginTop: theme.spacing(4),
        whiteSpace: 'nowrap',
        [theme.breakpoints.up('md')]: {
            bottom: theme.spacing(2),
        },
    },
}));