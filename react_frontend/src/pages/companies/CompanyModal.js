// src/pages/companies/CompanyModal.js
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Box, CircularProgress, FormControl,
    InputLabel, Select, MenuItem, Grid, InputAdornment,
    Typography, Chip, Alert
} from '@mui/material';
import { showSnackbar } from 'utils/snackbar';
import { useCompanies } from '@/hooks/useCompanies';
import { Business as BusinessIcon } from '@mui/icons-material';

export default function CompanyModal({ open, onClose, company }) {
    const { create, update } = useCompanies();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        company_name: '',
        address: '',
        phone: '',
        email: '',
        status: 'active',
    });

    // Set form data when editing
    useEffect(() => {
        if (company) {
            setForm({
                company_name: company.company_name || '',
                address: company.address || '',
                phone: company.phone || '',
                email: company.email || '',
                status: company.status || 'active',
            });
        } else {
            setForm({
                company_name: '',
                address: '',
                phone: '',
                email: '',
                status: 'active',
            });
        }
    }, [company, open]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.company_name.trim()) {
            showSnackbar({ type: 'error', message: 'Company name is required' });
            return;
        }

        setLoading(true);
        try {
            const submitData = {
                company_name: form.company_name.trim(),
                address: form.address || null,
                phone: form.phone || null,
                email: form.email || null,
                status: form.status,
            };

            if (company) {
                await update(company.id, submitData);
                showSnackbar({ type: 'success', message: 'Company updated successfully' });
            } else {
                await create(submitData);
                showSnackbar({ type: 'success', message: 'Company created successfully' });
            }
            onClose(true);
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message;
            showSnackbar({ type: 'error', message: errorMsg });
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
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle sx={{ pb: 1, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon color="primary" />
                    {company ? 'Edit Company' : 'Add New Company'}
                </DialogTitle>

                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2.5} mt={1}>
                        {/* Company Name */}
                        <TextField
                            label="Company Name *"
                            name="company_name"
                            value={form.company_name}
                            onChange={handleChange}
                            required
                            fullWidth
                            size="small"
                            placeholder="Enter company name"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <BusinessIcon fontSize="small" color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* Address */}
                        <TextField
                            label="Address"
                            name="address"
                            value={form.address}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                            multiline
                            rows={2}
                            placeholder="Enter company address"
                        />

                        {/* Phone & Email */}
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Phone"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    fullWidth
                                    size="small"
                                    placeholder="Enter phone number"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Email"
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    fullWidth
                                    size="small"
                                    placeholder="Enter email address"
                                />
                            </Grid>
                        </Grid>

                        {/* Status */}
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                name="status"
                                value={form.status}
                                label="Status"
                                onChange={handleChange}
                            >
                                <MenuItem value="active">
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Chip label="Active" color="success" size="small" />
                                    </Box>
                                </MenuItem>
                                <MenuItem value="inactive">
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Chip label="Inactive" color="default" size="small" />
                                    </Box>
                                </MenuItem>
                            </Select>
                        </FormControl>

                        {/* Info Alert */}
                        <Alert severity="info" sx={{ mt: 1 }}>
                            <Typography variant="caption" display="block">
                                <strong>Note:</strong> All fields except company name are optional.
                                You can update company details anytime.
                            </Typography>
                        </Alert>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={() => onClose(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                        {loading ? 'Saving...' : company ? 'Update Company' : 'Create Company'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}