import { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, Box, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {showSnackbar} from "utils/snackbar";
import {authService} from "services/auth.service";


export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            setError('Email is required');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await authService.forgotPassword(email);
            if (res.data.success) {
                showSnackbar({ type: 'success', message: 'Reset OTP sent to your email' });
                navigate('/reset-password', { state: { email } });
            } else {
                setError(res.data.message || 'Failed to send OTP');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
        >
            <Container maxWidth="sm">
                <Paper elevation={10} sx={{ p: 4, borderRadius: 4 }}>
                    <Typography variant="h4" align="center" fontWeight="bold" gutterBottom>
                        Forgot Password
                    </Typography>
                    <Typography variant="body2" align="center" color="textSecondary" mb={3}>
                        Enter your email to receive a reset OTP
                    </Typography>
                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            margin="normal"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                        {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            sx={{ mt: 3, py: 1.5, borderRadius: 2 }}
                            disabled={loading}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Send Reset OTP'}
                        </Button>
                        <Button
                            fullWidth
                            variant="text"
                            onClick={() => navigate('/login')}
                            sx={{ mt: 2, textTransform: 'none' }}
                        >
                            Back to Login
                        </Button>
                    </form>
                </Paper>
            </Container>
        </Box>
    );
}