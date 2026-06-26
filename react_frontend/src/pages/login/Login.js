import { useState } from 'react';
import {
    Container, Paper, TextField, Button, Typography, Box,
    IconButton, InputAdornment, CircularProgress, Chip
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'context/AuthContext';
import { showSnackbar } from 'utils/snackbar';

// Use your actual asset paths
const bgImage = '/assets/home.jpg';
const mobileView = '/assets/mobile_view.jpeg';
const mobileView1 = '/assets/mobile_view1.jpeg';

// Inline SVG logo — matches your logo.svg (blue bg + white triangle)
const ImsLogo = ({ size = 56 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ borderRadius: 14, display: 'block' }}
    >
        <rect width="56" height="56" fill="#4F5FE8" rx="12" />
        <polyline
            points="10,44 28,14 46,44"
            fill="none"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await login(email, password);
            showSnackbar({ type: 'success', message: 'Login successful' });
            navigate('/app/dashboard');
        } catch (err) {
            setError(err.message || 'Invalid credentials');
            showSnackbar({ type: 'error', message: err.message || 'Login failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex' }}>

            {/* ── LEFT PANEL ── */}
            <Box
                sx={{
                    flex: 1.1,
                    position: 'relative',
                    overflow: 'hidden',
                    display: { xs: 'none', lg: 'flex' },
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#0f1729',
                }}
            >
                {/* Background image with dark overlay */}
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${bgImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.18,
                    }}
                />

                {/* Blue gradient top band (matches logo color) */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0,
                        height: '5px',
                        background: 'linear-gradient(90deg, #4F5FE8, #818CF8)',
                    }}
                />

                {/* Content */}
                <Box sx={{ position: 'relative', zIndex: 2, px: 6, maxWidth: 520, width: '100%' }}>
                    {/* Logo + brand name */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 5 }}>
                        <ImsLogo size={52} />
                        <Box>
                            <Typography
                                sx={{
                                    color: '#fff',
                                    fontWeight: 800,
                                    fontSize: '1.35rem',
                                    letterSpacing: '-0.3px',
                                    lineHeight: 1,
                                }}
                            >
                                IMS
                            </Typography>
                            <Typography
                                sx={{
                                    color: '#94a3b8',
                                    fontSize: '0.68rem',
                                    letterSpacing: '2.5px',
                                    textTransform: 'uppercase',
                                    lineHeight: 1.3,
                                }}
                            >
                                Inventory Management System
                            </Typography>
                        </Box>
                    </Box>

                    <Typography
                        sx={{
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: '2.6rem',
                            lineHeight: 1.1,
                            mb: 2,
                        }}
                    >
                        Smart Inventory,<br />
                        <Box component="span" sx={{ color: '#818CF8' }}>Anywhere.</Box>
                    </Typography>

                    <Typography sx={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.7, mb: 5 }}>
                        Scan products with a digital mobile scanner, track stock in real-time,
                        manage distribution, and grow your business.
                    </Typography>

                    {/* Feature chips */}
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 6 }}>
                        {['Real-time Tracking', 'Mobile Scanner', 'Sales Analytics', 'Multi-user'].map(f => (
                            <Chip
                                key={f}
                                label={f}
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(79,95,232,0.18)',
                                    color: '#a5b4fc',
                                    border: '1px solid rgba(129,140,248,0.3)',
                                    fontWeight: 500,
                                    fontSize: '0.75rem',
                                }}
                            />
                        ))}
                    </Box>

                    {/* ── Two floating phone mockups ── */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: 2,
                            position: 'relative',
                            height: 320,
                        }}
                    >
                        {/* Back phone — slightly smaller & offset */}
                        <Box
                            sx={{
                                position: 'absolute',
                                left: '50%',
                                bottom: 0,
                                transform: 'translateX(-10%) rotate(4deg)',
                                width: 175,
                                height: 300,
                                borderRadius: '22px',
                                overflow: 'hidden',
                                border: '2px solid rgba(255,255,255,0.12)',
                                boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
                            }}
                        >
                            <Box
                                component="img"
                                src={mobileView1}
                                alt="IMS Add Products screen"
                                sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                            />
                        </Box>

                        {/* Front phone — larger */}
                        <Box
                            sx={{
                                position: 'absolute',
                                left: '8%',
                                bottom: 0,
                                transform: 'rotate(-3deg)',
                                width: 190,
                                height: 315,
                                borderRadius: '24px',
                                overflow: 'hidden',
                                border: '2px solid rgba(255,255,255,0.18)',
                                boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
                                zIndex: 2,
                            }}
                        >
                            <Box
                                component="img"
                                src={mobileView}
                                alt="IMS Analytics Dashboard"
                                sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                            />
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* ── RIGHT PANEL — Login Form ── */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#f8fafc',
                    p: 3,
                }}
            >
                <Container maxWidth="xs">

                    {/* Mobile-only top logo */}
                    <Box
                        sx={{
                            display: { xs: 'flex', lg: 'none' },
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1.5,
                            mb: 4,
                        }}
                    >
                        <ImsLogo size={40} />
                        <Typography fontWeight={800} fontSize="1.2rem" letterSpacing="-0.3px">IMS</Typography>
                    </Box>

                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 4, md: 5 },
                            borderRadius: '20px',
                            boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
                            border: '1px solid #e2e8f0',
                            bgcolor: '#fff',
                        }}
                    >
                        {/* Form header */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                            <ImsLogo size={44} />
                            <Box>
                                <Typography fontWeight={700} fontSize="1.3rem" lineHeight={1.1}>
                                    Welcome back
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Sign in to your IMS account
                                </Typography>
                            </Box>
                        </Box>

                        <form onSubmit={handleSubmit}>
                            <TextField
                                fullWidth
                                label="Email address"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                                sx={{
                                    mb: 2.5,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '10px',
                                        '&.Mui-focused fieldset': { borderColor: '#4F5FE8' },
                                    },
                                    '& label.Mui-focused': { color: '#4F5FE8' },
                                }}
                            />

                            <TextField
                                fullWidth
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                sx={{
                                    mb: 1,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '10px',
                                        '&.Mui-focused fieldset': { borderColor: '#4F5FE8' },
                                    },
                                    '& label.Mui-focused': { color: '#4F5FE8' },
                                }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowPassword(!showPassword)}
                                                edge="end"
                                                size="small"
                                            >
                                                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            {/* Forgot password — right-aligned */}
                            <Box textAlign="right" mb={1}>
                                <Button
                                    variant="text"
                                    size="small"
                                    onClick={() => navigate('/forgot-password')}
                                    sx={{
                                        textTransform: 'none',
                                        color: '#4F5FE8',
                                        fontWeight: 500,
                                        fontSize: '0.8rem',
                                        p: '2px 4px',
                                        minWidth: 0,
                                    }}
                                >
                                    Forgot password?
                                </Button>
                            </Box>

                            {error && (
                                <Box
                                    sx={{
                                        bgcolor: '#fef2f2',
                                        border: '1px solid #fecaca',
                                        borderRadius: '8px',
                                        px: 2,
                                        py: 1.2,
                                        mb: 1,
                                    }}
                                >
                                    <Typography color="error" variant="body2" fontWeight={500}>
                                        {error}
                                    </Typography>
                                </Box>
                            )}

                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                disabled={loading}
                                sx={{
                                    mt: 2.5,
                                    py: 1.6,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    borderRadius: '10px',
                                    textTransform: 'none',
                                    bgcolor: '#4F5FE8',
                                    boxShadow: '0 4px 16px rgba(79,95,232,0.35)',
                                    '&:hover': {
                                        bgcolor: '#3B4DD0',
                                        boxShadow: '0 6px 20px rgba(79,95,232,0.45)',
                                        transform: 'translateY(-1px)',
                                    },
                                    '&:active': { transform: 'translateY(0)' },
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {loading
                                    ? <CircularProgress size={22} sx={{ color: '#fff' }} />
                                    : 'Sign In'
                                }
                            </Button>
                        </form>
                    </Paper>

                    <Typography
                        variant="caption"
                        color="text.secondary"
                        align="center"
                        display="block"
                        sx={{ mt: 3 }}
                    >
                        © {new Date().getFullYear()} Hanai Technologies Ltd • All Rights Reserved
                    </Typography>
                </Container>
            </Box>
        </Box>
    );
}