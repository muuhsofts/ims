// src/pages/purchases/PurchaseModal.js
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, MenuItem, Box, CircularProgress,
    FormControl, InputLabel, Select, Grid, Typography,
    InputAdornment, Checkbox, FormControlLabel, FormGroup,
    useMediaQuery, useTheme
} from '@mui/material';
import { showSnackbar } from 'utils/snackbar';
import { usePurchases } from '@/hooks/usePurchases';
import { supplierService } from 'services/supplier.service';
import { productCategoryService } from 'services/product-category.service';

export default function PurchaseModal({ open, onClose, purchase }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const { create, update } = usePurchases();
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loadingDropdowns, setLoadingDropdowns] = useState(false);
    const [form, setForm] = useState({
        supplier_id: '',
        category_id: '',
        quantity_ordered: 1,
        unit_price: 0,
        subtotal: 0,
        status: 'pending',
        selected_skus: [],
    });

    // Fetch dropdown data when modal opens
    useEffect(() => {
        if (!open) return;
        const fetchDropdowns = async () => {
            setLoadingDropdowns(true);
            try {
                const [suppliersRes, categoriesRes] = await Promise.all([
                    supplierService.getSuppliersDropdown(),
                    productCategoryService.getCategories({ per_page: 100 })
                ]);
                if (suppliersRes.data?.success) {
                    setSuppliers(suppliersRes.data.data);
                }
                if (categoriesRes.data?.success) {
                    const categoriesData = categoriesRes.data.data?.data || categoriesRes.data.data || [];
                    setCategories(categoriesData);
                }
            } catch (err) {
                console.error(err);
                showSnackbar({ type: 'error', message: 'Failed to load data' });
            } finally {
                setLoadingDropdowns(false);
            }
        };
        fetchDropdowns();
    }, [open]);

    // Reset form when editing or modal opens
    useEffect(() => {
        if (purchase) {
            setForm({
                supplier_id: purchase.supplier_id || '',
                category_id: purchase.category_id || '',
                quantity_ordered: purchase.quantity_ordered || 1,
                unit_price: parseFloat(purchase.unit_price) || 0,
                subtotal: parseFloat(purchase.subtotal) || 0,
                status: purchase.status || 'pending',
                selected_skus: purchase.selected_skus || [],
            });
        } else {
            setForm({
                supplier_id: '',
                category_id: '',
                quantity_ordered: 1,
                unit_price: 0,
                subtotal: 0,
                status: 'pending',
                selected_skus: [],
            });
        }
    }, [purchase, open]);

    const calculateSubtotal = (quantity, price) => {
        const qty = parseFloat(quantity) || 0;
        const pr = parseFloat(price) || 0;
        return qty * pr;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newForm = { ...form, [name]: value };
        if (name === 'quantity_ordered' || name === 'unit_price') {
            const qty = name === 'quantity_ordered' ? value : form.quantity_ordered;
            const price = name === 'unit_price' ? value : form.unit_price;
            newForm.subtotal = calculateSubtotal(qty, price);
        }
        if (name === 'category_id') {
            newForm.selected_skus = [];
        }
        setForm(newForm);
    };

    const handleSkuToggle = (sku) => {
        const current = form.selected_skus;
        const updated = current.includes(sku)
            ? current.filter(s => s !== sku)
            : [...current, sku];
        setForm(prev => ({ ...prev, selected_skus: updated }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.supplier_id) {
            showSnackbar({ type: 'error', message: 'Please select a supplier' });
            return;
        }
        if (!form.category_id) {
            showSnackbar({ type: 'error', message: 'Please select a product category' });
            return;
        }
        if (form.selected_skus.length === 0) {
            showSnackbar({ type: 'error', message: 'Please select at least one SKU' });
            return;
        }
        if (form.quantity_ordered <= 0) {
            showSnackbar({ type: 'error', message: 'Quantity must be greater than 0' });
            return;
        }
        if (form.unit_price <= 0) {
            showSnackbar({ type: 'error', message: 'Unit price must be greater than 0' });
            return;
        }

        const submitData = {
            supplier_id: form.supplier_id,
            category_id: form.category_id,
            selected_skus: form.selected_skus,
            quantity_ordered: form.quantity_ordered,
            unit_price: form.unit_price,
            subtotal: form.subtotal,
            status: form.status,
        };

        setLoading(true);
        try {
            if (purchase) {
                await update(purchase.purchase_id, {
                    quantity_ordered: form.quantity_ordered,
                    unit_price: form.unit_price,
                    subtotal: form.subtotal,
                    status: form.status,
                    selected_skus: form.selected_skus,
                });
                showSnackbar({ type: 'success', message: 'Purchase updated successfully' });
            } else {
                await create(submitData);
                showSnackbar({ type: 'success', message: 'Purchase created successfully' });
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

    const selectedCategory = categories.find(c => c.category_id === form.category_id);
    const availableSkus = selectedCategory?.sku || [];

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
                    {purchase ? 'Edit Purchase' : 'Add New Purchase'}
                </DialogTitle>

                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <FormControl fullWidth required disabled={loadingDropdowns} size="small">
                            <InputLabel>Supplier</InputLabel>
                            <Select
                                name="supplier_id"
                                value={form.supplier_id}
                                label="Supplier"
                                onChange={handleChange}
                            >
                                <MenuItem value="">Select a supplier</MenuItem>
                                {suppliers.map((sup) => (
                                    <MenuItem key={sup.supplier_id} value={sup.supplier_id}>
                                        {sup.supplier_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth required disabled={loadingDropdowns} size="small">
                            <InputLabel>Product Category</InputLabel>
                            <Select
                                name="category_id"
                                value={form.category_id}
                                label="Product Category"
                                onChange={handleChange}
                            >
                                <MenuItem value="">Select a category</MenuItem>
                                {categories.map((cat) => (
                                    <MenuItem key={cat.category_id} value={cat.category_id}>
                                        {cat.category_name} {cat.model ? `(${cat.model})` : ''}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* SKU checkboxes */}
                        {form.category_id && (
                            <Box sx={{ mt: 1, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Select SKU(s) for this category:
                                </Typography>
                                {availableSkus.length === 0 ? (
                                    <Typography variant="body2" color="textSecondary">
                                        No SKUs defined for this category.
                                    </Typography>
                                ) : (
                                    <FormGroup>
                                        <Box display="flex" flexWrap="wrap" gap={1}>
                                            {availableSkus.map((sku, idx) => (
                                                <FormControlLabel
                                                    key={idx}
                                                    control={
                                                        <Checkbox
                                                            checked={form.selected_skus.includes(sku)}
                                                            onChange={() => handleSkuToggle(sku)}
                                                            size="small"
                                                        />
                                                    }
                                                    label={sku}
                                                    sx={{ mr: 2 }}
                                                />
                                            ))}
                                        </Box>
                                    </FormGroup>
                                )}
                            </Box>
                        )}

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Quantity"
                                    name="quantity_ordered"
                                    type="number"
                                    value={form.quantity_ordered}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    size="small"
                                    inputProps={{ min: 1, step: 1 }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Unit Price (TSh)"
                                    name="unit_price"
                                    type="number"
                                    value={form.unit_price}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    size="small"
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start">TSh</InputAdornment>,
                                    }}
                                    inputProps={{ min: 0, step: 0.01 }}
                                />
                            </Grid>
                        </Grid>

                        <TextField
                            label="Subtotal (TSh) - Auto"
                            name="subtotal"
                            type="number"
                            value={form.subtotal.toFixed(2)}
                            InputProps={{
                                readOnly: true,
                                startAdornment: <InputAdornment position="start">TSh</InputAdornment>,
                            }}
                            fullWidth
                            size="small"
                            disabled
                        />

                        {purchase && (
                            <FormControl fullWidth size="small">
                                <InputLabel>Status</InputLabel>
                                <Select
                                    name="status"
                                    value={form.status}
                                    label="Status"
                                    onChange={handleChange}
                                >
                                    <MenuItem value="pending">Pending</MenuItem>
                                    <MenuItem value="completed">Completed</MenuItem>
                                    <MenuItem value="cancelled">Cancelled</MenuItem>
                                </Select>
                            </FormControl>
                        )}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
                    <Button onClick={() => onClose(false)} disabled={loading}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading || loadingDropdowns}>
                        {loading ? <CircularProgress size={24} /> : purchase ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}