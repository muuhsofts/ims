// src/pages/products/ProductModal.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, MenuItem, Box, CircularProgress,
    FormControl, InputLabel, Select, Grid, InputAdornment,
    IconButton, Typography, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    useMediaQuery, useTheme, Alert, Collapse
} from '@mui/material';
import {
    QrCodeScanner as ScanIcon,
    Stop as StopIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Info as InfoIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { Html5Qrcode } from 'html5-qrcode';
import { showSnackbar } from 'utils/snackbar';
import { useProducts } from '@/hooks/useProducts';
import { productCategoryService } from 'services/product-category.service';
import { productService } from 'services/product.service';

const SCANNER_ID = 'imei-qr-reader';

export default function ProductModal({ open, onClose, product }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const { create, update } = useProducts();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [loadingDropdowns, setLoadingDropdowns] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [availableSkus, setAvailableSkus] = useState([]);
    const [imeis, setImeis] = useState([]);
    const [manualImei, setManualImei] = useState('');
    const [scanning, setScanning] = useState(false);
    const [purchaseInfo, setPurchaseInfo] = useState(null);
    const [loadingPurchaseInfo, setLoadingPurchaseInfo] = useState(false);
    const [autoFilledBuyingPrice, setAutoFilledBuyingPrice] = useState(null);
    const [showPurchaseDetails, setShowPurchaseDetails] = useState(false);
    const [isAutoFilled, setIsAutoFilled] = useState(false);

    const [form, setForm] = useState({
        category_id: '',
        sku: '',
        buying_price: '',
        cash_selling_price: '',
        loan_selling_price: '',
        status: 'active',
    });

    const html5QrRef = useRef(null);
    const imeisRef = useRef([]);
    const processingRef = useRef(false);

    useEffect(() => { imeisRef.current = imeis; }, [imeis]);

    // ── scanner ───────────────────────────────────────────────────────────────
    const destroyScanner = useCallback(async () => {
        if (!html5QrRef.current) return;
        try {
            const state = html5QrRef.current.getState();
            if (state === 2 || state === 3) await html5QrRef.current.stop();
            html5QrRef.current.clear();
        } catch (_) {}
        html5QrRef.current = null;
    }, []);

    const launchScanner = useCallback(async () => {
        const container = document.getElementById(SCANNER_ID);
        if (!container) { setScanning(false); return; }

        const qr = new Html5Qrcode(SCANNER_ID, { verbose: false });
        html5QrRef.current = qr;

        try {
            await qr.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 220, height: 120 }, aspectRatio: 1.7 },
                async (decodedText) => {
                    if (processingRef.current) return;
                    processingRef.current = true;

                    const imei = decodedText.trim();
                    if (imeisRef.current.includes(imei)) {
                        showSnackbar({ type: 'warning', message: `Duplicate IMEI: ${imei}` });
                    } else {
                        setImeis(prev => [...prev, imei]);
                        showSnackbar({ type: 'success', message: `✓ Added: ${imei}` });
                    }

                    try { await qr.stop(); } catch (_) {}
                    await launchScanner();
                    processingRef.current = false;
                },
                () => {}
            );
        } catch {
            showSnackbar({ type: 'error', message: 'Could not access camera' });
            html5QrRef.current = null;
            setScanning(false);
        }
    }, []);

    const startScanner = useCallback(() => {
        setScanning(true);
        setTimeout(() => launchScanner(), 80);
    }, [launchScanner]);

    const stopScanner = useCallback(async () => {
        await destroyScanner();
        setScanning(false);
    }, [destroyScanner]);

    // ── fetch purchase info ───────────────────────────────────────────────────
    const fetchPurchaseInfo = useCallback(async (categoryId, sku) => {
        if (!categoryId || !sku) {
            setPurchaseInfo(null);
            setAutoFilledBuyingPrice(null);
            setIsAutoFilled(false);
            return;
        }

        setLoadingPurchaseInfo(true);
        try {
            const res = await productService.getPurchaseInfo({
                category_id: categoryId,
                sku: sku
            });

            if (res.data?.success) {
                const data = res.data.data;
                setPurchaseInfo(data);

                // Auto-fill buying price if available
                if (data.unit_price && data.purchase_exists) {
                    const unitPrice = parseFloat(data.unit_price);
                    setAutoFilledBuyingPrice(unitPrice);
                    setIsAutoFilled(true);

                    // Only auto-fill if buying price is empty or not manually changed
                    setForm(prev => {
                        // If buying price is empty, auto-fill it
                        if (!prev.buying_price || prev.buying_price === '') {
                            return { ...prev, buying_price: unitPrice };
                        }
                        return prev;
                    });
                } else {
                    setAutoFilledBuyingPrice(null);
                    setIsAutoFilled(false);
                }

                // Show purchase details by default if there's purchase history
                if (data.purchases && data.purchases.length > 0) {
                    setShowPurchaseDetails(true);
                }
            }
        } catch (err) {
            // Don't show error for 404, just set purchase info to null
            if (err.response?.status !== 404) {
                console.error('Failed to fetch purchase info:', err);
            }
            setPurchaseInfo(null);
            setAutoFilledBuyingPrice(null);
            setIsAutoFilled(false);
        } finally {
            setLoadingPurchaseInfo(false);
        }
    }, []);

    // ── lifecycle ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        (async () => {
            setLoadingDropdowns(true);
            try {
                const res = await productCategoryService.getCategories({ per_page: 100 });
                if (res.data?.success) setCategories(res.data.data.data || []);
            } catch {
                showSnackbar({ type: 'error', message: 'Failed to load categories' });
            } finally {
                setLoadingDropdowns(false);
            }
        })();
    }, [open]);

    useEffect(() => {
        if (product) {
            setForm({
                category_id: product.category_id || '',
                sku: product.sku || '',
                buying_price: parseFloat(product.buying_price) || '',
                cash_selling_price: parseFloat(product.cash_selling_price) || '',
                loan_selling_price: parseFloat(product.loan_selling_price) || '',
                status: product.status || 'active',
            });
            setImeis([product.imei].filter(Boolean));
            const cat = categories.find(c => c.category_id === product.category_id);
            if (cat) {
                setSelectedCategory(cat);
                setAvailableSkus(cat.sku || []);
                // Fetch purchase info for editing mode as well
                fetchPurchaseInfo(product.category_id, product.sku);
            }
        } else {
            setForm({
                category_id: '',
                sku: '',
                buying_price: '',
                cash_selling_price: '',
                loan_selling_price: '',
                status: 'active'
            });
            setImeis([]);
            setManualImei('');
            setSelectedCategory(null);
            setAvailableSkus([]);
            setPurchaseInfo(null);
            setAutoFilledBuyingPrice(null);
            setIsAutoFilled(false);
            setShowPurchaseDetails(false);
        }
        stopScanner();
    }, [product, categories, open, stopScanner, fetchPurchaseInfo]);

    useEffect(() => () => { destroyScanner(); }, [destroyScanner]);

    // ── form handlers ─────────────────────────────────────────────────────────
    const handleCategoryChange = (e) => {
        const catId = e.target.value;
        const cat = categories.find(c => c.category_id === catId);
        setSelectedCategory(cat);
        setAvailableSkus(cat?.sku || []);
        setForm(prev => ({ ...prev, category_id: catId, sku: '', buying_price: '' }));
        setImeis([]);
        setPurchaseInfo(null);
        setAutoFilledBuyingPrice(null);
        setIsAutoFilled(false);
        setShowPurchaseDetails(false);
    };

    const handleSkuChange = (sku) => {
        setForm(prev => ({ ...prev, sku }));
        // Fetch purchase info when SKU is selected
        if (form.category_id && sku) {
            fetchPurchaseInfo(form.category_id, sku);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        // If user manually changes buying price, clear auto-fill flag
        if (name === 'buying_price') {
            setIsAutoFilled(false);
        }

        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleManualAdd = () => {
        const imei = manualImei.trim();
        if (!imei) { showSnackbar({ type: 'error', message: 'Enter an IMEI first' }); return; }
        if (imeis.includes(imei)) { showSnackbar({ type: 'warning', message: 'IMEI already in list' }); return; }

        // Check if adding this IMEI would exceed available
        if (purchaseInfo && !product) {
            const availableToAdd = purchaseInfo.available_to_add || 0;
            if (imeis.length >= availableToAdd && availableToAdd > 0) {
                showSnackbar({
                    type: 'error',
                    message: `Cannot add more. Only ${availableToAdd} more items available from purchase.`
                });
                return;
            }
        }

        setImeis(prev => [...prev, imei]);
        setManualImei('');
        showSnackbar({ type: 'success', message: 'IMEI added' });
    };

    const removeImei = (imei) => setImeis(prev => prev.filter(i => i !== imei));
    const clearAll = () => {
        setImeis([]);
        showSnackbar({ type: 'info', message: 'All IMEIs cleared' });
    };

    // ── submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.category_id) { showSnackbar({ type: 'error', message: 'Select a category' }); return; }
        if (!form.sku) { showSnackbar({ type: 'error', message: 'Select an SKU' }); return; }
        if (imeis.length === 0) { showSnackbar({ type: 'error', message: 'Add at least one IMEI' }); return; }
        if (Number(form.buying_price) <= 0) { showSnackbar({ type: 'error', message: 'Buying price must be > 0' }); return; }

        // Check if we have enough purchased items
        if (purchaseInfo && !product) {
            const availableToAdd = purchaseInfo.available_to_add || 0;
            if (imeis.length > availableToAdd && availableToAdd > 0) {
                showSnackbar({
                    type: 'error',
                    message: `Cannot add ${imeis.length} products. Only ${availableToAdd} more items available from purchase (${purchaseInfo.current_count} already added of ${purchaseInfo.total_purchased} purchased).`
                });
                return;
            }
        }

        setLoading(true);
        try {
            if (product) {
                await update(product.product_id, {
                    category_id: form.category_id,
                    sku: form.sku,
                    imei: imeis[0],
                    buying_price: Number(form.buying_price),
                    cash_selling_price: Number(form.cash_selling_price) || null,
                    loan_selling_price: Number(form.loan_selling_price) || null,
                    status: form.status,
                });
                showSnackbar({ type: 'success', message: 'Product updated' });
            } else {
                await create({
                    category_id: form.category_id,
                    sku: form.sku,
                    imeis: imeis.join('\n'),
                    buying_price: Number(form.buying_price) || null,
                    cash_selling_price: Number(form.cash_selling_price) || null,
                    loan_selling_price: Number(form.loan_selling_price) || null,
                    status: form.status,
                });
                showSnackbar({ type: 'success', message: `${imeis.length} product(s) created` });
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
            maxWidth="md"
            fullWidth
            fullScreen={fullScreen}
            PaperProps={{ sx: { borderRadius: { xs: 0, sm: 2 } } }}
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle sx={{ pb: 1, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                    {product ? 'Edit Product' : 'Bulk Add Products'}
                </DialogTitle>

                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        {/* Category */}
                        <FormControl fullWidth required disabled={loadingDropdowns} size="small">
                            <InputLabel>Category</InputLabel>
                            <Select
                                name="category_id"
                                value={form.category_id}
                                label="Category"
                                onChange={handleCategoryChange}
                            >
                                <MenuItem value="">Select a category</MenuItem>
                                {categories.map(cat => (
                                    <MenuItem key={cat.category_id} value={cat.category_id}>
                                        {cat.category_name}{cat.model ? ` (${cat.model})` : ''}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* SKU selection */}
                        {selectedCategory && availableSkus.length > 0 && (
                            <Box sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                <Typography variant="subtitle2" gutterBottom>Select SKU:</Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {availableSkus.map((sku, idx) => (
                                        <Button
                                            key={idx}
                                            size="small"
                                            variant={form.sku === sku ? 'contained' : 'outlined'}
                                            onClick={() => handleSkuChange(sku)}
                                        >
                                            {sku}
                                        </Button>
                                    ))}
                                </Stack>
                            </Box>
                        )}

                        {/* Purchase Info Alert */}
                        {purchaseInfo && purchaseInfo.purchase_exists && (
                            <Alert
                                severity="info"
                                icon={<InfoIcon />}
                                action={
                                    <IconButton
                                        aria-label="expand"
                                        size="small"
                                        onClick={() => setShowPurchaseDetails(!showPurchaseDetails)}
                                    >
                                        {showPurchaseDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    </IconButton>
                                }
                            >
                                <Typography variant="body2">
                                    <strong>Purchase Info:</strong> Unit Price: TSh {purchaseInfo.unit_price?.toLocaleString()} |
                                    Purchased: {purchaseInfo.total_purchased} |
                                    Added: {purchaseInfo.current_count} |
                                    Available: <strong>{purchaseInfo.available_to_add}</strong>
                                </Typography>

                                <Collapse in={showPurchaseDetails}>
                                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                                        <Typography variant="caption" display="block" fontWeight="bold">
                                            Purchase History:
                                        </Typography>
                                        {purchaseInfo.purchases?.map((p, idx) => (
                                            <Typography key={idx} variant="caption" display="block">
                                                • {p.quantity_ordered} units @ TSh {p.unit_price?.toLocaleString()}
                                                ({new Date(p.created_at).toLocaleDateString()})
                                            </Typography>
                                        ))}
                                    </Box>
                                </Collapse>
                            </Alert>
                        )}

                        {purchaseInfo && !purchaseInfo.purchase_exists && (
                            <Alert severity="warning">
                                No purchase record found for this category and SKU.
                                Please enter buying price manually.
                            </Alert>
                        )}

                        {/* Buying Price with auto-fill indicator */}
                        <TextField
                            label="Buying Price (TSh)*"
                            name="buying_price"
                            type="number"
                            value={form.buying_price}
                            onChange={handleChange}
                            required
                            fullWidth
                            size="small"
                            InputProps={{
                                startAdornment: <InputAdornment position="start">TSh</InputAdornment>,
                                endAdornment: isAutoFilled && !product && purchaseInfo?.purchase_exists ? (
                                    <InputAdornment position="end">
                                        <Typography variant="caption" sx={{
                                            color: 'success.main',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5
                                        }}>
                                            ✓ Auto-filled
                                        </Typography>
                                    </InputAdornment>
                                ) : null
                            }}
                            inputProps={{ min: 0, step: 0.01 }}
                            helperText={
                                isAutoFilled && !product && purchaseInfo?.purchase_exists
                                    ? `Auto-filled from purchase: TSh ${autoFilledBuyingPrice?.toLocaleString()}`
                                    : 'Enter the buying price per unit'
                            }
                            sx={{
                                '& .MuiInputBase-root': {
                                    backgroundColor: isAutoFilled ? 'rgba(76, 175, 80, 0.05)' : 'transparent',
                                }
                            }}
                        />

                        {/* Prices - responsive grid */}
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Cash Selling Price (TSh)"
                                    name="cash_selling_price"
                                    type="number"
                                    value={form.cash_selling_price}
                                    onChange={handleChange}
                                    fullWidth
                                    size="small"
                                    InputProps={{ startAdornment: <InputAdornment position="start">TSh</InputAdornment> }}
                                    inputProps={{ min: 0, step: 0.01 }}
                                    helperText="Leave blank if not applicable"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Loan Selling Price (TSh)"
                                    name="loan_selling_price"
                                    type="number"
                                    value={form.loan_selling_price}
                                    onChange={handleChange}
                                    fullWidth
                                    size="small"
                                    InputProps={{ startAdornment: <InputAdornment position="start">TSh</InputAdornment> }}
                                    inputProps={{ min: 0, step: 0.01 }}
                                    helperText="Leave blank if not applicable"
                                />
                            </Grid>
                        </Grid>

                        {/* IMEI entry */}
                        <Typography variant="subtitle2">
                            IMEIs — {imeis.length} added
                            {scanning && (
                                <Typography component="span" variant="caption" color="success.main" sx={{ ml: 1 }}>
                                    ● Scanner ready
                                </Typography>
                            )}
                            {purchaseInfo && purchaseInfo.purchase_exists && !product && (
                                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                    (Max: {purchaseInfo.available_to_add})
                                </Typography>
                            )}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <TextField
                                size="small"
                                label="Manual IMEI"
                                value={manualImei}
                                onChange={e => setManualImei(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleManualAdd())}
                                sx={{ flex: 1 }}
                            />
                            <IconButton onClick={handleManualAdd} color="primary" title="Add IMEI">
                                <AddIcon />
                            </IconButton>
                            <IconButton
                                onClick={scanning ? stopScanner : startScanner}
                                color={scanning ? 'error' : 'primary'}
                                title={scanning ? 'Stop scanner' : 'Scan barcode'}
                            >
                                {scanning ? <StopIcon /> : <ScanIcon />}
                            </IconButton>
                        </Box>

                        {/* Camera viewfinder */}
                        {scanning && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div id={SCANNER_ID} style={{ width: '100%', maxWidth: 340 }} />
                                <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 0.5 }}>
                                    Camera resets instantly after each scan. Press ■ Stop when done.
                                </Typography>
                            </Box>
                        )}

                        {/* IMEI table - responsive overflow */}
                        {imeis.length > 0 && (
                            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                            <TableCell sx={{ fontWeight: 600, width: 40 }}>#</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>IMEI</TableCell>
                                            <TableCell align="right">
                                                <Button size="small" color="error" onClick={clearAll} startIcon={<DeleteIcon />}>
                                                    Clear All
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {imeis.map((imei, idx) => (
                                            <TableRow key={imei} hover>
                                                <TableCell>{idx + 1}</TableCell>
                                                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.82rem', wordBreak: 'break-all' }}>
                                                    {imei}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton size="small" color="error" onClick={() => removeImei(imei)} title="Remove">
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        {/* Status */}
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select name="status" value={form.status} label="Status" onChange={handleChange}>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                                <MenuItem value="sold">Sold</MenuItem>
                                <MenuItem value="damaged">Damaged</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
                    <Button onClick={() => onClose(false)} disabled={loading}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading || loadingDropdowns || loadingPurchaseInfo}>
                        {loading ? <CircularProgress size={24} /> : product ? 'Update' : `Create ${imeis.length} Product(s)`}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}