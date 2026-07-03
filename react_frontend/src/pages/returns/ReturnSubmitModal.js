// src/pages/returns/ReturnSubmitModal.js
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Box, CircularProgress,
    FormControl, InputLabel, Select, MenuItem,
    Typography, Chip
} from '@mui/material';
import { showSnackbar } from 'utils/snackbar';
import { useReturns } from '@/hooks/useReturns';
import { warehouseService } from 'services/warehouse.service';

export default function ReturnSubmitModal({ open, onClose, returnItem, onSuccess }) {
    const { submitReturn } = useReturns();
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
            await submitReturn(returnItem.return_id, form);
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
                    Submit Return
                </DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        {/* Return Info */}
                        <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
                            <Typography variant="body2">
                                <strong>Customer:</strong> {returnItem?.customer_name}
                            </Typography>
                            <Typography variant="body2">
                                <strong>IMEI:</strong> {returnItem?.imei}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Product:</strong> {returnItem?.product?.sku || 'N/A'}
                            </Typography>
                            <Chip
                                label="Pending"
                                color="warning"
                                size="small"
                                sx={{ mt: 1 }}
                            />
                        </Box>

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
                            placeholder="Any additional information about the return"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="success"
                        disabled={!form.warehouse_id || submitting}
                    >
                        {submitting ? <CircularProgress size={24} /> : 'Submit Return'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}