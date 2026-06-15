// src/pages/distributions/DistributionModal.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Box, CircularProgress,
    FormControl, InputLabel, Select, MenuItem,
    Typography, IconButton, Divider, Chip, Tooltip,
    LinearProgress, useMediaQuery, useTheme
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Inventory2 as InventoryIcon,
} from '@mui/icons-material';
import { showSnackbar } from 'utils/snackbar';
import { useDistributions } from '@/hooks/useDistributions';
import { userService } from 'services/user.service';

const emptyItem = () => ({ product_id: '', productInfo: null });

export default function DistributionModal({ open, onClose }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const { create, getMyProducts } = useDistributions();
    const [loading, setLoading]               = useState(false);
    const [progress, setProgress]             = useState(0);
    const [agents, setAgents]                 = useState([]);
    const [products, setProducts]             = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    const [agentId, setAgentId] = useState('');
    const [notes, setNotes]     = useState('');
    const [items, setItems]     = useState([emptyItem()]);

    useEffect(() => {
        if (!open) {
            setAgentId('');
            setNotes('');
            setItems([emptyItem()]);
            setProgress(0);
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const fetch = async () => {
            setLoadingOptions(true);
            try {
                const [agentsRes, productsRes] = await Promise.all([
                    userService.getSalesAgentsDropdown(),
                    getMyProducts(),
                ]);

                if (agentsRes?.data?.success && Array.isArray(agentsRes.data.data)) {
                    setAgents(agentsRes.data.data);
                } else {
                    console.warn('Unexpected agents response format', agentsRes);
                    setAgents([]);
                }

                if (productsRes?.success) setProducts(productsRes.data);
            } catch (error) {
                console.error('Failed to load options', error);
                showSnackbar({ type: 'error', message: 'Failed to load agents or products' });
            } finally {
                setLoadingOptions(false);
            }
        };
        fetch();
    }, [open, getMyProducts]);

    const pickedIds = items.map(i => i.product_id).filter(Boolean);

    const handleItemChange = useCallback((index, productId) => {
        const product = products.find(p => p.product_id === productId) || null;
        setItems(prev => prev.map((item, i) =>
            i === index ? { product_id: productId, productInfo: product } : item
        ));
    }, [products]);

    const addItem    = () => setItems(prev => [...prev, emptyItem()]);
    const removeItem = (index) =>
        setItems(prev => prev.length === 1 ? [emptyItem()] : prev.filter((_, i) => i !== index));

    const runWithProgress = async (fn) => {
        setProgress(0);
        setLoading(true);

        let current = 0;
        const interval = setInterval(() => {
            current += Math.random() * 12;
            if (current >= 85) { current = 85; clearInterval(interval); }
            setProgress(Math.round(current));
        }, 200);

        try {
            const result = await fn();
            clearInterval(interval);
            setProgress(100);
            await new Promise(r => setTimeout(r, 350));
            return result;
        } catch (err) {
            clearInterval(interval);
            setProgress(0);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!agentId) {
            showSnackbar({ type: 'error', message: 'Select a sales agent' });
            return;
        }

        const validItems = items.filter(i => i.product_id);
        if (validItems.length === 0) {
            showSnackbar({ type: 'error', message: 'Add at least one product' });
            return;
        }

        const firstProduct = validItems[0].productInfo;
        const payload = {
            user_id: agentId,
            notes:   notes || undefined,
            items:   validItems.map(i => ({ product_id: i.product_id, quantity: 1 })),
            ...(firstProduct?.collection_center?.cc_id && { cc_id: firstProduct.collection_center.cc_id }),
        };

        try {
            await runWithProgress(() => create(payload));
            showSnackbar({ type: 'success', message: `${validItems.length} product(s) distributed successfully` });
            onClose(true);
        } catch (err) {
            showSnackbar({
                type: 'error',
                message: err.response?.data?.message || err.message || 'Operation failed',
            });
        }
    };

    const validCount = items.filter(i => i.product_id).length;

    return (
        <Dialog
            open={open}
            onClose={() => !loading && onClose(false)}
            maxWidth={false}
            fullScreen={fullScreen}
            PaperProps={{
                sx: {
                    width: { xs: '100%', sm: 580 },
                    maxWidth: '95vw',
                    maxHeight: '88vh',
                    borderRadius: { xs: 0, sm: 2 },
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }
            }}
        >
            <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                    height: 3,
                    opacity: loading || progress > 0 ? 1 : 0,
                    transition: 'opacity 0.2s',
                    borderRadius: 0,
                }}
            />

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
                    <InventoryIcon color="primary" fontSize="small" />
                    Distribute Stock to Sales Agent
                </DialogTitle>

                <DialogContent sx={{ overflowY: 'auto', flex: 1 }}>
                    <Box display="flex" flexDirection="column" gap={2.5} mt={0.5}>
                        <FormControl fullWidth required disabled={loadingOptions || loading}>
                            <InputLabel>Sales Agent</InputLabel>
                            <Select
                                value={agentId}
                                label="Sales Agent"
                                onChange={e => setAgentId(e.target.value)}
                            >
                                <MenuItem value="">Select agent</MenuItem>
                                {agents.map(agent => (
                                    <MenuItem key={agent.id} value={agent.id}>
                                        {agent.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            {loadingOptions && <CircularProgress size={20} sx={{ position: 'absolute', right: 32, top: '50%', transform: 'translateY(-50%)' }} />}
                        </FormControl>

                        <Divider>
                            <Chip label={`Products${validCount > 0 ? ` · ${validCount} selected` : ''}`} size="small" />
                        </Divider>

                        {items.map((item, index) => (
                            <Box key={index} display="flex" flexDirection="column" gap={0.75}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <FormControl fullWidth size="small" disabled={loadingOptions || loading || products.length === 0}>
                                        <InputLabel>Product</InputLabel>
                                        <Select
                                            value={item.product_id}
                                            label="Product"
                                            onChange={e => handleItemChange(index, e.target.value)}
                                        >
                                            <MenuItem value="">Select product</MenuItem>
                                            {products.map(p => {
                                                const taken = pickedIds.includes(p.product_id) && p.product_id !== item.product_id;
                                                const labelParts = [
                                                    p.product_name,
                                                    p.imei ? `IMEI:${p.imei}` : null,
                                                    p.sku ? `SKU:${p.sku}` : null,
                                                    p.model ? `Model:${p.model}` : null,
                                                    p.category_name ? `Cat:${p.category_name}` : null,
                                                ].filter(Boolean);
                                                const label = labelParts.join(' | ');
                                                return (
                                                    <MenuItem key={p.product_id} value={p.product_id} disabled={taken}>
                                                        {label}
                                                    </MenuItem>
                                                );
                                            })}
                                        </Select>
                                    </FormControl>
                                    <Tooltip title="Remove">
                                        <span>
                                            <IconButton size="small" color="error" onClick={() => removeItem(index)} disabled={loading}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </Box>

                                {item.productInfo && (
                                    <Box sx={{ px: 1.5, py: 0.75, bgcolor: 'action.hover', borderRadius: 1, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                                        <Typography variant="caption" color="text.secondary" component="div">
                                            {[
                                                item.productInfo.product_name ? `📱 ${item.productInfo.product_name}` : null,
                                                item.productInfo.category_name ? `Category: ${item.productInfo.category_name}` : null,
                                                item.productInfo.model ? `Model: ${item.productInfo.model}` : null,
                                                item.productInfo.sku ? `SKU: ${item.productInfo.sku}` : null,
                                                item.productInfo.imei ? `IMEI: ${item.productInfo.imei}` : null,
                                                item.productInfo.selling_price != null ? `Price: TSh ${parseFloat(item.productInfo.selling_price).toLocaleString()}` : null,
                                            ].filter(Boolean).join(' · ')}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        ))}

                        <Button
                            startIcon={<AddIcon />}
                            variant="outlined"
                            size="small"
                            onClick={addItem}
                            disabled={loadingOptions || loading || products.length === 0 || items.length >= products.length}
                            fullWidth={fullScreen}
                        >
                            Add Another Product
                        </Button>

                        <TextField
                            label="Notes (optional)"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            multiline
                            rows={2}
                            fullWidth
                            size="small"
                            disabled={loading}
                        />
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button onClick={() => onClose(false)} disabled={loading}>Cancel</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading || loadingOptions || validCount === 0}
                        sx={{ minWidth: 130 }}
                    >
                        {loading
                            ? <Box display="flex" alignItems="center" gap={1}>
                                <CircularProgress size={16} color="inherit" />
                                <span>{progress < 100 ? `${progress}%` : 'Done'}</span>
                            </Box>
                            : `Distribute${validCount > 1 ? ` (${validCount})` : ''}`
                        }
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}