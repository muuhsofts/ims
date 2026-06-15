// src/pages/customers/CustomerFormModal.js
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Box, CircularProgress, MenuItem,
    useMediaQuery, useTheme
} from '@mui/material';
import { useCustomers } from 'hooks/useCustomers';
import { showSnackbar } from 'utils/snackbar';

export default function CustomerFormModal({ open, onClose, customer }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const { create, update } = useCustomers();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        customer_name: '',
        nida: '',
        msisdn: '',
        email: '',
        status: 'active',
    });

    useEffect(() => {
        if (customer) {
            setForm({
                customer_name: customer.customer_name || '',
                nida: customer.nida || '',
                msisdn: customer.msisdn || '',
                email: customer.email || '',
                status: customer.status || 'active',
            });
        } else {
            setForm({
                customer_name: '',
                nida: '',
                msisdn: '',
                email: '',
                status: 'active',
            });
        }
    }, [customer]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (customer) {
                await update(customer.id, form);
                showSnackbar({ type: 'success', message: 'Customer updated' });
            } else {
                await create(form);
                showSnackbar({ type: 'success', message: 'Customer created' });
            }
            onClose(true);
        } catch (err) {
            showSnackbar({ type: 'error', message: err.response?.data?.message || 'Operation failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={() => onClose(false)}
            maxWidth="sm"
            fullWidth
            fullScreen={fullScreen}
            PaperProps={{
                sx: { borderRadius: { xs: 0, sm: 2 } }
            }}
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle sx={{ pb: 1, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                    {customer ? 'Edit Customer' : 'New Customer'}
                </DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="Full Name"
                            name="customer_name"
                            value={form.customer_name}
                            onChange={handleChange}
                            required
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="NIDA"
                            name="nida"
                            value={form.nida}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Phone (MSISDN)"
                            name="msisdn"
                            value={form.msisdn}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            select
                            label="Status"
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                        >
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
                    <Button onClick={() => onClose(false)}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : (customer ? 'Update' : 'Create')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}