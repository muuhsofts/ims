// src/pages/categories/ProductCategoryModal.js
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, MenuItem, Box, CircularProgress,
    FormControl, InputLabel, Select, IconButton, Typography
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { showSnackbar } from 'utils/snackbar';
import { useProductCategories } from '@/hooks/useProductCategories';

export default function ProductCategoryModal({ open, onClose, category }) {
    const { create, update } = useProductCategories();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        category_name: '',
        model: '',
        status: 'active',
        skus: [''],
    });

    // Reset form when modal opens for a new category or editing
    useEffect(() => {
        if (category) {
            // Editing mode: populate form
            setForm({
                category_name: category.category_name || '',
                model: category.model || '',
                status: category.status || 'active',
                skus: category.sku && category.sku.length ? category.sku : [''],
            });
        } else {
            // Create mode: reset to fresh state
            setForm({
                category_name: '',
                model: '',
                status: 'active',
                skus: [''],
            });
        }
    }, [category, open]); // Also reset when modal opens

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSkuChange = (index, value) => {
        const newSkus = [...form.skus];
        newSkus[index] = value;
        setForm(prev => ({ ...prev, skus: newSkus }));
    };

    const addSkuField = () => {
        setForm(prev => ({ ...prev, skus: [...prev.skus, ''] }));
    };

    const removeSkuField = (index) => {
        const newSkus = form.skus.filter((_, i) => i !== index);
        if (newSkus.length === 0) newSkus.push('');
        setForm(prev => ({ ...prev, skus: newSkus }));
    };

    // Reset form to default empty state (used after successful create)
    const resetForm = () => {
        setForm({
            category_name: '',
            model: '',
            status: 'active',
            skus: [''],
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.category_name?.trim()) {
            showSnackbar({ type: 'error', message: 'Category name is required' });
            return;
        }

        const skusToSend = form.skus.filter(s => s.trim() !== '');
        const payload = {
            category_name: form.category_name,
            model: form.model,
            status: form.status,
            sku: skusToSend,
        };

        setLoading(true);
        try {
            if (category) {
                // Update mode: close modal and refresh list
                await update(category.category_id, payload);
                showSnackbar({ type: 'success', message: 'Category updated' });
                onClose(true); // true = refresh parent list
            } else {
                // Create mode: stay open, reset form, but still refresh the list behind
                await create(payload);
                showSnackbar({ type: 'success', message: 'Category created' });
                // Refresh the parent list (so new category appears)
                // but keep modal open for another entry
                resetForm();
                // Optional: call parent's refresh callback without closing
                if (typeof onClose === 'function') {
                    // We pass a special signal to parent to refresh but keep modal open
                    // For simplicity, we call onClose with 'refresh' and modal remains open
                    // But the parent's onClose usually closes. We'll use a separate callback.
                    // Better: expose a refresh function from parent via prop.
                    // For now, we can call onClose(false) to not close? That won't refresh.
                    // Let's add a second prop: onRefresh. But to keep API simple,
                    // I'll pass a custom flag: onClose('refresh')
                    onClose('refresh');
                }
            }
        } catch (err) {
            showSnackbar({ type: 'error', message: err.response?.data?.message || err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>{category ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="Category Name *"
                            name="category_name"
                            value={form.category_name}
                            onChange={handleChange}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Model"
                            name="model"
                            value={form.model}
                            onChange={handleChange}
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select name="status" value={form.status} label="Status" onChange={handleChange}>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                            </Select>
                        </FormControl>

                        <Typography variant="subtitle2" mt={1}>SKUs (multiple allowed)</Typography>
                        {form.skus.map((sku, idx) => (
                            <Box key={idx} display="flex" gap={1} alignItems="center">
                                <TextField
                                    fullWidth
                                    size="small"
                                    label={`SKU ${idx+1}`}
                                    value={sku}
                                    onChange={(e) => handleSkuChange(idx, e.target.value)}
                                />
                                <IconButton onClick={() => removeSkuField(idx)} color="error">
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        ))}
                        <Button startIcon={<AddIcon />} onClick={addSkuField} variant="outlined" size="small">
                            Add SKU
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => onClose(false)} disabled={loading}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : (category ? 'Update' : 'Create')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}