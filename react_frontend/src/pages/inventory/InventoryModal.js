// src/pages/inventory/InventoryModal.js
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Box, CircularProgress,
    FormControl, InputLabel, Select, MenuItem,
    Autocomplete, Chip, useMediaQuery, useTheme,
    Alert
} from '@mui/material';
import { showSnackbar } from 'utils/snackbar';
import { useInventory } from '@/hooks/useInventory';
import { productService } from 'services/product.service';
import { warehouseService } from 'services/warehouse.service';

export default function InventoryModal({ open, onClose, inventory }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const { create, update } = useInventory();
    const [loading, setLoading] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [errors, setErrors] = useState({});
    const [form, setForm] = useState({
        product_ids: [],
        warehouse_id: '',
    });

    // Fetch dropdowns when modal opens
    useEffect(() => {
        if (!open) return;
        const fetchOptions = async () => {
            setLoadingOptions(true);
            setErrors({});
            try {
                const [warehousesRes, productsRes] = await Promise.all([
                    warehouseService.getWarehousesDropdown(),
                    productService.getProductsDropdown()
                ]);
                if (warehousesRes.data?.success) {
                    setWarehouses(warehousesRes.data.data);
                }
                if (productsRes.data?.success) {
                    setProducts(productsRes.data.data);
                }
            } catch (err) {
                console.error('Error fetching options:', err);
                showSnackbar({ type: 'error', message: 'Failed to load options' });
            } finally {
                setLoadingOptions(false);
            }
        };
        fetchOptions();
    }, [open]);

    // Reset form when editing or closing
    useEffect(() => {
        if (!open) {
            setForm({ product_ids: [], warehouse_id: '' });
            setErrors({});
            return;
        }
        if (inventory) {
            setForm({
                product_ids: inventory.product_ids || [],
                warehouse_id: inventory.warehouse_id || '',
            });
        } else {
            setForm({
                product_ids: [],
                warehouse_id: '',
            });
        }
    }, [inventory, open]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleProductChange = (event, newValue) => {
        const selectedIds = newValue.map(item => item.id);
        setForm(prev => ({ ...prev, product_ids: selectedIds }));
        if (errors.product_ids) {
            setErrors(prev => ({ ...prev, product_ids: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (form.product_ids.length === 0) {
            newErrors.product_ids = 'Select at least one product';
        }
        if (!form.warehouse_id) {
            newErrors.warehouse_id = 'Select a warehouse';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            if (inventory) {
                await update(inventory.inventory_id, form);
                showSnackbar({ type: 'success', message: 'Inventory updated successfully' });
            } else {
                await create(form);
                showSnackbar({ type: 'success', message: 'Inventory created successfully' });
            }
            onClose(true);
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Operation failed';
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
                showSnackbar({ type: 'error', message: 'Please check the form for errors' });
            } else {
                showSnackbar({ type: 'error', message: errorMessage });
            }
        } finally {
            setLoading(false);
        }
    };

    const productOptions = products.map(p => ({ id: p.id, label: p.label }));
    const selectedProducts = productOptions.filter(opt => form.product_ids.includes(opt.id));

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
                    {inventory ? 'Edit Inventory' : 'Add New Inventory'}
                </DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        {Object.keys(errors).length > 0 && (
                            <Alert severity="error" sx={{ mb: 1 }}>
                                Please fix the errors below
                            </Alert>
                        )}

                        <Autocomplete
                            multiple
                            options={productOptions}
                            getOptionLabel={(option) => option.label}
                            value={selectedProducts}
                            onChange={handleProductChange}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Select Products"
                                    placeholder="Choose products"
                                    disabled={loadingOptions}
                                    size="small"
                                    error={!!errors.product_ids}
                                    helperText={errors.product_ids}
                                />
                            )}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip
                                        label={option.label}
                                        {...getTagProps({ index })}
                                        size="small"
                                        sx={{ maxWidth: '100%' }}
                                    />
                                ))
                            }
                            fullWidth
                            disabled={loadingOptions}
                        />

                        <FormControl fullWidth required error={!!errors.warehouse_id} disabled={loadingOptions}>
                            <InputLabel>Warehouse</InputLabel>
                            <Select
                                name="warehouse_id"
                                value={form.warehouse_id}
                                label="Warehouse"
                                onChange={handleChange}
                                size="small"
                            >
                                <MenuItem value="">Select warehouse</MenuItem>
                                {warehouses.map(wh => (
                                    <MenuItem key={wh.id} value={wh.id}>
                                        {wh.label}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.warehouse_id && (
                                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                                    {errors.warehouse_id}
                                </Typography>
                            )}
                        </FormControl>

                        {inventory && (
                            <Alert severity="info" sx={{ mt: 1 }}>
                                Current products: {inventory.product_ids?.length || 0}
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
                    <Button onClick={() => onClose(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading || loadingOptions}
                        startIcon={loading && <CircularProgress size={20} />}
                    >
                        {loading ? 'Saving...' : inventory ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}