// src/pages/returns/ReturnsModal.js
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Box, CircularProgress,
    Typography, Chip, Alert, Divider
} from '@mui/material';
import { showSnackbar } from 'utils/snackbar';
import { useReturns } from '@/hooks/useReturns';

export default function ReturnsModal({ open, onClose, onSuccess }) {
    const { createReturn, validateImei, loading } = useReturns();
    const [form, setForm] = useState({
        imei: '',
        customer_name: '',
        notes: '',
    });
    const [validationResult, setValidationResult] = useState(null);
    const [validating, setValidating] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Reset form when modal closes
    useEffect(() => {
        if (!open) {
            setForm({ imei: '', customer_name: '', notes: '' });
            setValidationResult(null);
            setValidating(false);
            setSubmitting(false);
        }
    }, [open]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        // Reset validation when IMEI changes
        if (name === 'imei') {
            setValidationResult(null);
        }
    };

    const handleValidateImei = async () => {
        if (!form.imei) {
            showSnackbar({ type: 'error', message: 'Please enter an IMEI' });
            return;
        }

        setValidating(true);
        try {
            const result = await validateImei(form.imei);
            setValidationResult(result);

            if (!result.valid) {
                showSnackbar({ type: 'warning', message: result.message });
            } else {
                showSnackbar({ type: 'success', message: 'IMEI is valid for return' });
            }
        } catch (err) {
            showSnackbar({ type: 'error', message: err.message || 'Validation failed' });
        } finally {
            setValidating(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validationResult?.valid) {
            showSnackbar({ type: 'error', message: 'Please validate IMEI first' });
            return;
        }

        if (!form.customer_name) {
            showSnackbar({ type: 'error', message: 'Customer name is required' });
            return;
        }

        setSubmitting(true);
        try {
            await createReturn(form);
            onSuccess?.();
            onClose();
        } catch (err) {
            // Error handled in hook
        } finally {
            setSubmitting(false);
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
            <form onSubmit={handleSubmit}>
                <DialogTitle sx={{ pb: 1, fontSize: '1.5rem' }}>
                    New Return
                </DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        {/* IMEI Field with Validate Button */}
                        <Box display="flex" gap={1}>
                            <TextField
                                name="imei"
                                label="IMEI"
                                value={form.imei}
                                onChange={handleChange}
                                required
                                fullWidth
                                size="small"
                                placeholder="Enter IMEI number"
                                disabled={validating || submitting}
                            />
                            <Button
                                variant="outlined"
                                onClick={handleValidateImei}
                                disabled={!form.imei || validating || submitting}
                                sx={{ minWidth: 100 }}
                            >
                                {validating ? <CircularProgress size={24} /> : 'Validate'}
                            </Button>
                        </Box>

                        {/* Validation Result */}
                        {validationResult && (
                            <Alert severity={validationResult.valid ? 'success' : 'error'} sx={{ mt: 1 }}>
                                {validationResult.message}
                                {validationResult.valid && validationResult.product && (
                                    <Box mt={1}>
                                        <Typography variant="caption" display="block">
                                            <strong>SKU:</strong> {validationResult.product.sku}
                                        </Typography>
                                        <Typography variant="caption" display="block">
                                            <strong>Category:</strong> {validationResult.product.category}
                                        </Typography>
                                        <Typography variant="caption" display="block">
                                            <strong>Model:</strong> {validationResult.product.model}
                                        </Typography>
                                        <Typography variant="caption" display="block">
                                            <strong>Status:</strong> {validationResult.product.status}
                                        </Typography>
                                        <Typography variant="caption" display="block">
                                            <strong>Stock Status:</strong> {validationResult.product.stock_status}
                                        </Typography>
                                        {validationResult.sale && (
                                            <>
                                                <Divider sx={{ my: 1 }} />
                                                <Typography variant="caption" display="block" color="primary">
                                                    <strong>Sale Info:</strong> {validationResult.sale.total_amount} TSh ({validationResult.sale.payment_method})
                                                </Typography>
                                                <Typography variant="caption" display="block">
                                                    <strong>Sale Date:</strong> {new Date(validationResult.sale.sale_date).toLocaleString()}
                                                </Typography>
                                            </>
                                        )}
                                        {validationResult.customer && (
                                            <Typography variant="caption" display="block">
                                                <strong>Customer:</strong> {validationResult.customer.customer_name} ({validationResult.customer.phone})
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            </Alert>
                        )}

                        {/* Customer Name */}
                        <TextField
                            name="customer_name"
                            label="Customer Name"
                            value={form.customer_name}
                            onChange={handleChange}
                            required
                            fullWidth
                            size="small"
                            disabled={submitting}
                        />

                        {/* Notes */}
                        <TextField
                            name="notes"
                            label="Notes (Optional)"
                            value={form.notes}
                            onChange={handleChange}
                            multiline
                            rows={3}
                            fullWidth
                            size="small"
                            disabled={submitting}
                            placeholder="Reason for return or additional notes"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!validationResult?.valid || submitting}
                    >
                        {submitting ? <CircularProgress size={24} /> : 'Create Return'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}