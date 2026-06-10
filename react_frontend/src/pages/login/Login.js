import { useState } from 'react';
import {
    Container, Paper, TextField, Button, Typography, Box,
    IconButton, InputAdornment, CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'context/AuthContext';
import { showSnackbar } from 'utils/snackbar';

const logo = '/assets/logo.png';
const bgImage = '/assets/home.jpg';

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

            {/* LEFT SIDE - Visual & Branding */}
            <Box
                sx={{
                    flex: 1,
                    position: 'relative',
                    backgroundImage: `url(${bgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: { xs: 'none', lg: 'flex' },
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(45deg, rgba(15,23,42,0.92), rgba(51,65,85,0.85))',
                    }}
                />

                <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center', px: 6, maxWidth: 480 }}>
                    <img src={logo} alt="Logo" width="110" style={{ marginBottom: '2rem' }} />

                    <Typography
                        variant="h2"
                        fontWeight="800"
                        color="white"
                        gutterBottom
                        sx={{ lineHeight: 1.1 }}
                    >
                        Smart Inventory
                    </Typography>

                    <Typography
                        variant="h5"
                        color="#bae6fd"
                        sx={{ mb: 4, fontWeight: 400 }}
                    >
                        Scan products with digital mobile scanner, track inventory, manage distribution, boost sales, and grow your business.
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 6 }}>
                        <Typography variant="body2" color="#e0f2fe">✓ Real-time Tracking</Typography>
                        <Typography variant="body2" color="#e0f2fe">✓ Mobile Scanner Ready</Typography>
                        <Typography variant="body2" color="#e0f2fe">✓ Sales Analytics</Typography>
                    </Box>
                </Box>
            </Box>

            {/* RIGHT SIDE - Login Form */}
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
                <Container maxWidth="sm">
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 4, md: 6 },
                            borderRadius: 4,
                            boxShadow: '0 20px 40px rgba(0,0,0,0.07)',
                            border: '1px solid #f1f5f9',
                        }}
                    >
                        <Box textAlign="center" mb={5}>
                            <img src={logo} alt="Logo" width="75" />
                            <Typography variant="h4" fontWeight="700" sx={{ mt: 3 }}>
                                Welcome Back
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Sign in to manage your inventory
                            </Typography>
                        </Box>

                        <form onSubmit={handleSubmit}>
                            <TextField
                                fullWidth
                                label="Email Address"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                                sx={{ mb: 3 }}
                            />

                            <TextField
                                fullWidth
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                sx={{ mb: 1 }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPassword(!showPassword)}>
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            {error && (
                                <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                                    {error}
                                </Typography>
                            )}

                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                disabled={loading}
                                sx={{
                                    mt: 4,
                                    py: 1.8,
                                    fontSize: '1.1rem',
                                    fontWeight: 600,
                                    borderRadius: 3,
                                    textTransform: 'none',
                                    background: 'linear-gradient(90deg, #1e40af, #3b82f6)',
                                    '&:hover': {
                                        background: 'linear-gradient(90deg, #1e3a8a, #2563eb)',
                                        transform: 'translateY(-2px)',
                                    },
                                }}
                            >
                                {loading ? <CircularProgress size={26} color="inherit" /> : 'Sign In'}
                            </Button>

                            <Box textAlign="center" mt={3}>
                                <Button
                                    variant="text"
                                    onClick={() => navigate('/forgot-password')}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Forgot Password?
                                </Button>
                            </Box>
                        </form>

                        <Typography
                            variant="caption"
                            color="text.secondary"
                            align="center"
                            display="block"
                            sx={{ mt: 6 }}
                        >
                            © {new Date().getFullYear()} Muuhsofts-TZ • All Rights Reserved
                        </Typography>
                    </Paper>
                </Container>
            </Box>
        </Box>
    );
}