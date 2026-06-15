// src/pages/suppliers/SupplierModal.js
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    MenuItem,
    Box,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    useMediaQuery,
    useTheme
} from '@mui/material';
import { showSnackbar } from 'utils/snackbar';
import { useSuppliers } from '@/hooks/useSuppliers';

export default function SupplierModal({ open, onClose, supplier }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const { create, update } = useSuppliers();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        supplier_name: '',
        contact_person: '',
        phone: '',
        email: '',
        status: 'active',
    });

    useEffect(() => {
        if (supplier) {
            setForm({
                supplier_name: supplier.supplier_name || '',
                contact_person: supplier.contact_person || '',
                phone: supplier.phone || '',
                email: supplier.email || '',
                status: supplier.status || 'active',
            });
        } else {
            setForm({
                supplier_name: '',
                contact_person: '',
                phone: '',
                email: '',
                status: 'active',
            });
        }
    }, [supplier]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.supplier_name.trim()) {
            showSnackbar({ type: 'error', message: 'Supplier name is required' });
            return;
        }

        setLoading(true);
        try {
            if (supplier) {
                await update(supplier.supplier_id, form);
                showSnackbar({ type: 'success', message: 'Supplier updated successfully' });
            } else {
                await create(form);
                showSnackbar({ type: 'success', message: 'Supplier created successfully' });
            }
            onClose(true);
        } catch (err) {
            showSnackbar({
                type: 'error',
                message: err.response?.data?.message || err.message || 'Operation failed',
            });
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
            PaperProps={{ sx: { borderRadius: { xs: 0, sm: 2 } } }}
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle sx={{ pb: 1, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                    {supplier ? 'Edit Supplier' : 'Add New Supplier'}
                </DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="Supplier Name *"
                            name="supplier_name"
                            value={form.supplier_name}
                            onChange={handleChange}
                            required
                            fullWidth
                            autoFocus
                            size="small"
                        />
                        <TextField
                            label="Contact Person"
                            name="contact_person"
                            value={form.contact_person}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Phone"
                            name="phone"
                            value={form.phone}
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
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                name="status"
                                value={form.status}
                                label="Status"
                                onChange={handleChange}
                            >
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                                <MenuItem value="suspended">Suspended</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
                    <Button onClick={() => onClose(false)} disabled={loading}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : supplier ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}