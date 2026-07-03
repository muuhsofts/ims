// src/pages/returns/ApproveReturnModal.js
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Box, CircularProgress,
    FormControl, InputLabel, Select, MenuItem,
    Typography, Chip, Alert, Divider
} from '@mui/material';
import { showSnackbar } from 'utils/snackbar';
import { useReturns } from '@/hooks/useReturns';
import { warehouseService } from 'services/warehouse.service';

export default function ApproveReturnModal({ open, onClose, returnItem, onSuccess }) {
    const { approveReturn } = useReturns();
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        warehouse_id: '',
        notes: '',
    });

    useEffect(() => {
        if (open) {
            fetchWarehouses();
            setForm({ warehouse_id: '', notes: '' });
        }
    }, [open]);

    const fetchWarehouses = async () => {
        setLoading(true);
        try {
            const response = await warehouseService.getWarehousesDropdown();
            if (response.data?.success) {
                setWarehouses(response.data.data);
            }
        } catch (err) {
            showSnackbar({ type: 'error', message: 'Failed to load warehouses' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.warehouse_id) {
            showSnackbar({ type: 'error', message: 'Please select a warehouse' });
            return;
        }

        setSubmitting(true);
        try {
            await approveReturn(returnItem.return_id, form);
            onSuccess?.();
            onClose();
        } catch (err) {
            // Error handled in hook
        } finally {
            setSubmitting(false);
        }
    };

    if (!returnItem) return null;

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
                    Approve Return
                </DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        {/* Return Info */}
                        <Alert severity="info">
                            <Typography variant="body2">
                                <strong>Customer:</strong> {returnItem.customer_name}
                            </Typography>
                            <Typography variant="body2">
                                <strong>IMEI:</strong> {returnItem.imei}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Product:</strong> {returnItem.product?.sku || 'N/A'} - {returnItem.product?.category?.category_name || 'N/A'}
                            </Typography>
                            {returnItem.sale && (
                                <Typography variant="body2">
                                    <strong>Sale Amount:</strong> {returnItem.sale.total_amount} TSh ({returnItem.sale.payment_method})
                                </Typography>
                            )}
                            <Box mt={1}>
                                <Chip
                                    label="Pending Approval"
                                    color="warning"
                                    size="small"
                                />
                            </Box>
                        </Alert>

                        <Divider />

                        {/* Warehouse Selection */}
                        <FormControl fullWidth required>
                            <InputLabel>Select Warehouse</InputLabel>
                            <Select
                                name="warehouse_id"
                                value={form.warehouse_id}
                                label="Select Warehouse"
                                onChange={handleChange}
                                size="small"
                                disabled={loading || submitting}
                            >
                                <MenuItem value="">Select warehouse</MenuItem>
                                {warehouses.map(wh => (
                                    <MenuItem key={wh.id} value={wh.id}>
                                        {wh.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Notes */}
                        <TextField
                            name="notes"
                            label="Additional Notes (Optional)"
                            value={form.notes}
                            onChange={handleChange}
                            multiline
                            rows={3}
                            fullWidth
                            size="small"
                            disabled={submitting}
                            placeholder="Any additional information about the return approval"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={!form.warehouse_id || submitting}
                    >
                        {submitting ? <CircularProgress size={24} /> : 'Approve Return'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}