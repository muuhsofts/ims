// src/pages/transfer-requests/TransferRequestModal.js
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Box, CircularProgress,
    Typography, IconButton, Chip, Stack,
    FormControl, InputLabel, Select, MenuItem, Checkbox,
    useMediaQuery, useTheme
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { showSnackbar } from 'utils/snackbar';
import { useTransferRequests } from '@/hooks/useTransferRequests';
import { usePermission } from '@/hooks/usePermission';
import { productCategoryService } from 'services/product-category.service';

export default function TransferRequestModal({ open, onClose }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const { user } = usePermission();
    const { create } = useTransferRequests();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);

    const [items, setItems] = useState([
        { category_id: '', category_name: '', model: '', skus: [], description: '', quantity: 1 }
    ]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (!open) return;
        const fetchCategories = async () => {
            setLoadingCategories(true);
            try {
                const res = await productCategoryService.getCategories({ per_page: 100 });
                if (res.data?.success) {
                    setCategories(res.data.data.data || []);
                }
            } catch (err) {
                showSnackbar({ type: 'error', message: 'Failed to load categories' });
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();
    }, [open]);

    useEffect(() => {
        if (open) {
            setItems([{ category_id: '', category_name: '', model: '', skus: [], description: '', quantity: 1 }]);
            setNotes('');
        }
    }, [open]);

    const addItem = () => {
        setItems(prev => [...prev, { category_id: '', category_name: '', model: '', skus: [], description: '', quantity: 1 }]);
    };

    const removeItem = (index) => {
        if (items.length === 1) {
            showSnackbar({ type: 'error', message: 'At least one item is required' });
            return;
        }
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        const updated = [...items];
        updated[index][field] = value;

        if (field === 'category_id') {
            const selectedCat = categories.find(c => c.category_id === value);
            if (selectedCat) {
                updated[index].category_name = selectedCat.category_name;
                updated[index].model = selectedCat.model || '';
                updated[index].skus = [];
            } else {
                updated[index].category_name = '';
                updated[index].model = '';
                updated[index].skus = [];
            }
        }
        setItems(updated);
    };

    const toggleSku = (itemIndex, skuValue) => {
        const updated = [...items];
        const currentSkus = updated[itemIndex].skus;
        if (currentSkus.includes(skuValue)) {
            updated[itemIndex].skus = currentSkus.filter(s => s !== skuValue);
        } else {
            updated[itemIndex].skus = [...currentSkus, skuValue];
        }
        setItems(updated);
    };

    const getAvailableSkus = (categoryId) => {
        const cat = categories.find(c => c.category_id === categoryId);
        return cat?.sku || [];
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validItems = items.filter(item => item.category_id && item.skus.length > 0);
        if (validItems.length === 0) {
            showSnackbar({ type: 'error', message: 'Add at least one item with a category and at least one SKU' });
            return;
        }

        const payload = {
            requested_items: validItems.map(item => ({
                category_id: item.category_id,
                category_name: item.category_name,
                model: item.model || undefined,
                skus: item.skus,
                description: item.description || undefined,
                quantity: item.quantity || 1,
            })),
            notes: notes || undefined,
        };

        setLoading(true);
        try {
            await create(payload);
            showSnackbar({ type: 'success', message: 'Transfer request created' });
            onClose(true);
        } catch (err) {
            showSnackbar({ type: 'error', message: err.response?.data?.message || err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={() => onClose(false)}
            maxWidth="md"
            fullWidth
            fullScreen={fullScreen}
            PaperProps={{ sx: { borderRadius: { xs: 0, sm: 2 } } }}
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle sx={{ pb: 1, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                    New Transfer Request
                    {user && (
                        <Typography variant="caption" display="block" color="textSecondary">
                            Requester: {user.name || user.email}
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        {items.map((item, idx) => {
                            const availableSkus = getAvailableSkus(item.category_id);
                            return (
                                <Box key={idx} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, position: 'relative' }}>
                                    <IconButton
                                        size="small"
                                        onClick={() => removeItem(idx)}
                                        sx={{ position: 'absolute', top: 4, right: 4 }}
                                        color="error"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>

                                    <Stack spacing={2}>
                                        <FormControl fullWidth required size="small">
                                            <InputLabel>Category</InputLabel>
                                            <Select
                                                value={item.category_id}
                                                label="Category"
                                                onChange={(e) => handleItemChange(idx, 'category_id', e.target.value)}
                                            >
                                                <MenuItem value="">Select a category</MenuItem>
                                                {categories.map(cat => (
                                                    <MenuItem key={cat.category_id} value={cat.category_id}>
                                                        {cat.category_name} {cat.model ? `(${cat.model})` : ''}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                        <TextField
                                            label="Model"
                                            value={item.model}
                                            InputProps={{ readOnly: true }}
                                            fullWidth
                                            size="small"
                                            variant="outlined"
                                        />

                                        <TextField
                                            label="Quantity"
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                                            fullWidth
                                            size="small"
                                            inputProps={{ min: 1 }}
                                        />

                                        <Box>
                                            <Typography variant="subtitle2" gutterBottom>SKUs *</Typography>
                                            {availableSkus.length > 0 ? (
                                                <Box display="flex" flexWrap="wrap" gap={1}>
                                                    {availableSkus.map(sku => (
                                                        <Chip
                                                            key={sku}
                                                            label={sku}
                                                            clickable
                                                            color={item.skus.includes(sku) ? "primary" : "default"}
                                                            onClick={() => toggleSku(idx, sku)}
                                                            icon={<Checkbox checked={item.skus.includes(sku)} size="small" />}
                                                            sx={{ '& .MuiChip-icon': { ml: 0.5, mr: -0.5 } }}
                                                        />
                                                    ))}
                                                </Box>
                                            ) : (
                                                item.category_id && (
                                                    <Typography variant="caption" color="error">
                                                        No SKUs available for this category.
                                                    </Typography>
                                                )
                                            )}
                                        </Box>

                                        <TextField
                                            label="Description (optional)"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                            multiline
                                            rows={2}
                                            fullWidth
                                            size="small"
                                        />
                                    </Stack>
                                </Box>
                            );
                        })}
                        <Button startIcon={<AddIcon />} onClick={addItem} variant="outlined" size="small" fullWidth={fullScreen}>
                            Add Another Item
                        </Button>
                        <TextField
                            label="Notes (optional)"
                            multiline
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            fullWidth
                            size="small"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
                    <Button onClick={() => onClose(false)} disabled={loading}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading || loadingCategories}>
                        {loading ? <CircularProgress size={24} /> : 'Create Request'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}