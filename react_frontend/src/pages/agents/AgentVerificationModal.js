// src/pages/agents/AgentVerificationModal.js
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Typography,
    Alert,
    CircularProgress,
    IconButton,
    InputAdornment
} from '@mui/material';
import { Close as CloseIcon, Send as SendIcon } from '@mui/icons-material';
import { agentService } from 'services/agent.service';
import { showSnackbar } from 'utils/snackbar';

export default function AgentVerificationModal({ open, onClose, agent, onVerified }) {
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [otpSent, setOtpSent] = useState(false);

    const handleVerify = async () => {
        if (!otp || otp.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await agentService.verifyAgentOTP({
                email: agent.email,
                otp: otp
            });

            if (response.data?.success) {
                // ✅ FIX: DON'T show toast here - let parent handle it
                // Just call onVerified and close the modal
                if (onVerified) {
                    onVerified(); // Parent will show toast and refresh
                }
                onClose();
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to verify agent';
            setError(errorMsg);
            showSnackbar({ type: 'error', message: errorMsg }); // Only show errors
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setResending(true);
        setError('');

        try {
            await agentService.resendAgentVerification(agent?.id);
            setOtpSent(true);
            showSnackbar({
                type: 'success',
                message: `New OTP sent to ${agent?.email}`
            });
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to resend OTP';
            setError(errorMsg);
            showSnackbar({ type: 'error', message: errorMsg });
        } finally {
            setResending(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Verify Agent</Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                        Enter the 6-digit OTP sent to <strong>{agent?.email}</strong>
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {otpSent && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        OTP resent successfully! Check your email.
                    </Alert>
                )}

                <TextField
                    fullWidth
                    label="OTP Code"
                    value={otp}
                    onChange={(e) => {
                        setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                        setError('');
                    }}
                    placeholder="Enter 6-digit OTP"
                    inputProps={{ maxLength: 6 }}
                    sx={{ mb: 2 }}
                    disabled={loading}
                    autoFocus
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Typography variant="body2" color="text.secondary">
                                    OTP:
                                </Typography>
                            </InputAdornment>
                        ),
                    }}
                />

                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Button
                        size="small"
                        onClick={handleResendOTP}
                        disabled={resending}
                    >
                        {resending ? 'Sending...' : 'Resend OTP'}
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                        OTP expires in 10 minutes
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 0 }}>
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleVerify}
                    disabled={loading || otp.length !== 6}
                    startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                >
                    {loading ? 'Verifying...' : 'Verify Agent'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}