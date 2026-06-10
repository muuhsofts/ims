// src/pages/auth/ResetPassword.jsx
import { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    IconButton,
    InputAdornment,
    CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import {showSnackbar} from "utils/snackbar";
import {authService} from "services/auth.service";


export default function ResetPassword() {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || '';

    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        if (!email) navigate('/forgot-password');
    }, [email, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (otp.length !== 6) {
            setError('OTP must be 6 digits');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await authService.resetPassword(email, otp, password, confirmPassword);
            if (res.data.success) {
                showSnackbar({ type: 'success', message: 'Password reset successful! Redirecting...' });
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(res.data.message || 'Reset failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Password reset failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Container maxWidth="sm">
                <Paper elevation={10} sx={{ p: 4, borderRadius: 4 }}>
                    <Typography variant="h4" align="center" fontWeight="bold" gutterBottom>
                        Reset Password
                    </Typography>
                    <Typography variant="body2" align="center" color="textSecondary" mb={3}>
                        Enter the OTP sent to <strong>{email}</strong> and your new password
                    </Typography>
                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="OTP Code"
                            margin="normal"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                            autoFocus
                        />
                        <TextField
                            fullWidth
                            label="New Password"
                            type={showPassword ? 'text' : 'password'}
                            margin="normal"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            fullWidth
                            label="Confirm Password"
                            type={showConfirm ? 'text' : 'password'}
                            margin="normal"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end">
                                            {showConfirm ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
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
                            {loading ? <CircularProgress size={24} /> : 'Reset Password'}
                        </Button>
                        <Button
                            fullWidth
                            variant="text"
                            onClick={() => navigate('/forgot-password')}
                            sx={{ mt: 2, textTransform: 'none' }}
                        >
                            Back
                        </Button>
                    </form>
                </Paper>
            </Container>
        </Box>
    );
}