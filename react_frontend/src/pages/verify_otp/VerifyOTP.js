import { useState, useEffect } from 'react';
import { Container, Paper, TextField, Button, Typography, Box, CircularProgress } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import {authService} from "services/auth.service";
import {showSnackbar} from "utils/snackbar";
import {useAuth} from "context/AuthContext";
import {verificationService} from "services/verification.service";


export default function VerifyOTP() {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || '';
    const { setAuth } = useAuth();
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!email) navigate('/login');
    }, [email, navigate]);

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await authService.verifyOTP(email, otp);
            if (res.data.success && res.data.data) {
                const { user, role, token } = res.data.data;
                const roleNames = role ? [role.name] : [];
                setAuth(user, token, roleNames);
                showSnackbar({ type: 'success', message: 'Email verified! Redirecting...' });
                navigate('/');
            } else {
                setError(res.data.message || 'Verification failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setLoading(true);
        try {
            const res = await verificationService.resendOTP(email);
            if (res.data.success) {
                showSnackbar({ type: 'success', message: 'New OTP sent' });
            } else {
                showSnackbar({ type: 'error', message: res.data.message });
            }
        } catch (err) {
            showSnackbar({ type: 'error', message: err.response?.data?.message || 'Failed to resend' });
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
                        Verify OTP
                    </Typography>
                    <Typography variant="body2" align="center" color="textSecondary" mb={3}>
                        Enter the 6‑digit code sent to <strong>{email}</strong>
                    </Typography>
                    <form onSubmit={handleVerify}>
                        <TextField
                            fullWidth
                            label="OTP Code"
                            margin="normal"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
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
                            {loading ? <CircularProgress size={24} /> : 'Verify'}
                        </Button>
                        <Button
                            fullWidth
                            variant="text"
                            onClick={handleResend}
                            disabled={loading}
                            sx={{ mt: 2, textTransform: 'none' }}
                        >
                            Resend OTP
                        </Button>
                        <Button
                            fullWidth
                            variant="text"
                            onClick={() => navigate('/login')}
                            sx={{ mt: 1, textTransform: 'none' }}
                        >
                            Back to Login
                        </Button>
                    </form>
                </Paper>
            </Container>
        </Box>
    );
}