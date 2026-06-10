// src/pages/cc-inventory/CcInventoryModal.js
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Box, CircularProgress,
    FormControl, InputLabel, Select, MenuItem,
    Autocomplete, Chip
} from '@mui/material';
import { showSnackbar } from 'utils/snackbar';
import { useCcInventory } from '@/hooks/useCcInventory';
import { collectionCenterService } from 'services/collection-center.service';
import { inventoryService } from 'services/inventory.service';

export default function CcInventoryModal({ open, onClose, inventory }) {
    const { create, update } = useCcInventory();
    const [loading, setLoading] = useState(false);
    const [centers, setCenters] = useState([]);
    const [products, setProducts] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [form, setForm] = useState({
        cc_id: '',
        product_ids: [],
    });

    // Fetch dropdowns when modal opens
    useEffect(() => {
        if (!open) return;
        const fetchOptions = async () => {
            setLoadingOptions(true);
            try {
                const [centersRes, productsRes] = await Promise.all([
                    collectionCenterService.getCentersDropdown(),
                    inventoryService.getProductsInInventoryDropdown()
                ]);
                if (centersRes.data?.success) {
                    setCenters(centersRes.data.data);
                }
                if (productsRes.data?.success) {
                    setProducts(productsRes.data.data);
                }
            } catch (err) {
                console.error(err);
                showSnackbar({ type: 'error', message: 'Failed to load options' });
            } finally {
                setLoadingOptions(false);
            }
        };
        fetchOptions();
    }, [open]);

    // Reset form when editing
    useEffect(() => {
        if (inventory) {
            setForm({
                cc_id: inventory.cc_id || '',
                product_ids: inventory.product_ids || [],
            });
        } else {
            setForm({
                cc_id: '',
                product_ids: [],
            });
        }
    }, [inventory]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleProductChange = (event, newValue) => {
        const selectedIds = newValue.map(item => item.id);
        setForm(prev => ({ ...prev, product_ids: selectedIds }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.cc_id) {
            showSnackbar({ type: 'error', message: 'Select a collection center' });
            return;
        }

        setLoading(true);
        try {
            if (inventory) {
                await update(inventory.cc_inventory_id, {
                    product_ids: form.product_ids,
                });
                showSnackbar({ type: 'success', message: 'Inventory updated successfully' });
            } else {
                await create({
                    cc_id: form.cc_id,
                    product_ids: form.product_ids,
                });
                showSnackbar({ type: 'success', message: 'Inventory created successfully' });
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

    const productOptions = products.map(p => ({ id: p.id, label: p.label }));
    const selectedProducts = productOptions.filter(opt => form.product_ids.includes(opt.id));

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>{inventory ? 'Edit CC Inventory' : 'Add New CC Inventory'}</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <FormControl fullWidth required disabled={!!inventory || loadingOptions}>
                            <InputLabel>Collection Center</InputLabel>
                            <Select
                                name="cc_id"
                                value={form.cc_id}
                                label="Collection Center"
                                onChange={handleChange}
                                disabled={!!inventory}
                            >
                                <MenuItem value="">Select center</MenuItem>
                                {centers.map(c => (
                                    <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Autocomplete
                            multiple
                            options={productOptions}
                            getOptionLabel={(option) => option.label}
                            value={selectedProducts}
                            onChange={handleProductChange}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Products (only available in warehouse)"
                                    placeholder="Select products"
                                    disabled={loadingOptions}
                                />
                            )}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip label={option.label} {...getTagProps({ index })} />
                                ))
                            }
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => onClose(false)} disabled={loading}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading || loadingOptions}>
                        {loading ? <CircularProgress size={24} /> : inventory ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}