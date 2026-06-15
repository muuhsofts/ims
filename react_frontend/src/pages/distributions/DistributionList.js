// src/pages/distributions/DistributionList.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography, CircularProgress,
    LinearProgress, Stack, Card, CardContent, Divider, useMediaQuery, useTheme, Grid
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Refresh as RefreshIcon,
    Search as SearchIcon, Receipt as ConfirmIcon, QrCodeScanner as ScanIcon,
    Stop as StopIcon, Person as PersonIcon, Store as CenterIcon,
    Inventory as ProductIcon, CheckCircle as CompletedIcon,
    RemoveCircle as PendingIcon, IndeterminateCheckBox as PartialIcon
} from '@mui/icons-material';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { useDistributions } from '@/hooks/useDistributions';
import DistributionModal from './DistributionModal';
import { debounce } from 'lodash';

const headCells = [
    { id: 'agent',      label: 'Sales Agent' },
    { id: 'center',     label: 'Collection Center' },
    { id: 'product',    label: 'Product' },
    { id: 'status',     label: 'Status' },
    { id: 'created_at', label: 'Created At' },
    { id: 'actions',    label: 'Actions', disableSort: true },
];

const getStatusChip = (dist) => {
    if (dist.received_by && dist.quantity_received >= dist.quantity)
        return { label: 'Completed', color: 'success', icon: <CompletedIcon fontSize="small" /> };
    if (dist.quantity_received > 0)
        return { label: 'Partial',   color: 'info',    icon: <PartialIcon fontSize="small" /> };
    return         { label: 'Pending',   color: 'warning', icon: <PendingIcon fontSize="small" /> };
};

const ProductCell = ({ product }) => {
    if (!product) return <Typography variant="body2" color="text.secondary">—</Typography>;

    const productName  = product.product_name    || null;
    const categoryName = product.category_name   || null;
    const model        = product.category?.model || null;
    const sku          = product.category?.sku   || null;
    const imei         = product.imei            || null;
    const color        = product.color           || null;

    return (
        <Stack spacing={0.5}>
            {productName && (
                <Typography variant="body2" fontWeight={600} lineHeight={1.3}>
                    <strong>Name:</strong> {productName}
                </Typography>
            )}
            {model && (
                <Typography variant="caption" color="text.primary" lineHeight={1.3}>
                    <strong>Model:</strong> {model}
                </Typography>
            )}
            {imei && (
                <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ letterSpacing: 0.4 }}>
                    <strong>IMEI:</strong> {imei}
                </Typography>
            )}
            <Box display="flex" gap={1} flexWrap="wrap" alignItems="center" mt={0.2}>
                {sku && (
                    <Typography variant="caption" sx={{ bgcolor: 'action.selected', px: 0.7, py: 0.15, borderRadius: 0.5, fontFamily: 'monospace', fontSize: 10, color: 'text.secondary', letterSpacing: 0.3 }}>
                        <strong>SKU:</strong> {sku}
                    </Typography>
                )}
                {color && (
                    <Typography variant="caption" color="text.secondary">
                        <strong>Color:</strong> {color}
                    </Typography>
                )}
                {categoryName && (
                    <Typography variant="caption" sx={{ color: 'primary.main', fontSize: 10, fontWeight: 500 }}>
                        <strong>Category:</strong> {categoryName}
                    </Typography>
                )}
            </Box>
        </Stack>
    );
};

// Card component for mobile/tablet view
const DistributionCard = ({ dist, canConfirm, canScan, onMenuOpen, onConfirmAll, onScan }) => {
    const status = getStatusChip(dist);
    const progress = dist.quantity > 0 ? (dist.quantity_received / dist.quantity) * 100 : 0;

    return (
        <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
            <CardContent sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="subtitle2" fontWeight="bold">
                            {dist.user?.name || '—'}
                        </Typography>
                    </Box>
                    <Chip
                        icon={status.icon}
                        label={status.label}
                        color={status.color}
                        size="small"
                    />
                </Box>

                {dist.user?.role?.display_name && (
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                        {dist.user.role.display_name}
                    </Typography>
                )}

                <Divider sx={{ my: 1 }} />

                <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CenterIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                        {dist.collection_center?.cc_name || '—'}
                        {dist.collection_center?.location && ` (${dist.collection_center.location})`}
                    </Typography>
                </Box>

                <Box display="flex" alignItems="flex-start" gap={1} mb={1}>
                    <ProductIcon fontSize="small" color="action" sx={{ mt: 0.2 }} />
                    <Box flex={1}>
                        <ProductCell product={dist.product} />
                    </Box>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress variant="determinate" value={progress} sx={{ width: 80, height: 6, borderRadius: 3 }} />
                        <Typography variant="caption">{progress.toFixed(0)}%</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                        {new Date(dist.created_at).toLocaleString()}
                    </Typography>
                </Box>

                <Box display="flex" justifyContent="flex-end" gap={1} mt={1}>
                    {canConfirm && dist.quantity_received < dist.quantity && (
                        <Button size="small" variant="outlined" startIcon={<ConfirmIcon />} onClick={() => onConfirmAll(dist)}>
                            Confirm All
                        </Button>
                    )}
                    {canScan && (
                        <Button size="small" variant="outlined" startIcon={<ScanIcon />} onClick={() => onScan(dist)}>
                            Scan IMEI
                        </Button>
                    )}
                    {!canConfirm && !canScan && (
                        <Typography variant="caption" color="text.secondary">No actions available</Typography>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

export default function DistributionList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md')); // Table on medium and up

    const { hasPermission } = usePermission();
    const canView    = hasPermission('distributions.view');
    const canCreate  = hasPermission('distributions.create');
    const canConfirm = hasPermission('distributions.confirm_receipt');
    const canScan    = hasPermission('distributions.scan_imei');

    const { data, total, loading, fetchData, confirmReceipt, confirmByImei } = useDistributions();

    const [search, setSearch]               = useState('');
    const [page, setPage]                   = useState(0);
    const [rowsPerPage, setRowsPerPage]     = useState(10);
    const [modalOpen, setModalOpen]         = useState(false);
    const [actionMenu, setActionMenu]       = useState(null);
    const [selectedDist, setSelectedDist]   = useState(null);
    const [scanOpen, setScanOpen]           = useState(false);
    const [scanning, setScanning]           = useState(false);
    const scannerRef                        = useRef(null);
    const abortControllerRef = useRef(null);

    const [confirmDialog, setConfirmDialog] = useState({
        open: false, title: '', message: '', action: null,
    });
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [confirmProgress, setConfirmProgress] = useState(0);
    const progressIntervalRef = useRef(null);

    useEffect(() => {
        if (!confirmDialog.open) setConfirmProgress(0);
    }, [confirmDialog.open]);

    const debouncedSetSearch = useCallback(debounce((value) => setSearch(value), 400), []);

    const fetchDistributions = useCallback(async () => {
        if (!canView) return;
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        try {
            await fetchData(
                { page: page + 1, per_page: rowsPerPage, search: search || undefined },
                { signal: controller.signal }
            );
        } catch (err) {
            if (err.name !== 'AbortError') {
                showSnackbar({ type: 'error', message: 'Failed to load distributions' });
            }
        } finally {
            if (abortControllerRef.current === controller) abortControllerRef.current = null;
        }
    }, [page, rowsPerPage, search, canView, fetchData]);

    useEffect(() => {
        fetchDistributions();
        return () => abortControllerRef.current?.abort();
    }, [fetchDistributions]);

    useEffect(() => {
        return () => {
            if (scannerRef.current) scannerRef.current.clear();
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, []);

    useEffect(() => {
        if (!scanOpen && scannerRef.current) {
            scannerRef.current.clear();
            scannerRef.current = null;
            setScanning(false);
        }
    }, [scanOpen]);

    const handleMenuOpen = (e, dist) => { setSelectedDist(dist); setActionMenu(e.currentTarget); };
    const handleMenuClose = () => { setActionMenu(null); setSelectedDist(null); };

    const handleConfirmReceipt = () => {
        setConfirmDialog({
            open: true,
            title: 'Confirm Receipt',
            message: 'Mark all items as received for this distribution?',
            action: async () => {
                await confirmReceipt(selectedDist.distribution_id);
                showSnackbar({ type: 'success', message: 'Receipt confirmed' });
                await fetchDistributions();
            },
        });
        handleMenuClose();
    };

    const handleConfirm = async () => {
        if (!confirmDialog.action) return;
        setConfirmProgress(0);
        setConfirmLoading(true);
        let current = 0;
        progressIntervalRef.current = setInterval(() => {
            current += Math.random() * 14;
            if (current >= 85) { current = 85; clearInterval(progressIntervalRef.current); }
            setConfirmProgress(Math.round(current));
        }, 180);
        try {
            await confirmDialog.action();
            clearInterval(progressIntervalRef.current);
            setConfirmProgress(100);
            await new Promise(r => setTimeout(r, 400));
            setConfirmDialog(p => ({ ...p, open: false }));
        } catch (err) {
            clearInterval(progressIntervalRef.current);
            setConfirmProgress(0);
            showSnackbar({ type: 'error', message: err.message || 'Action failed' });
        } finally {
            setConfirmLoading(false);
        }
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.clear();
            scannerRef.current = null;
        }
        setScanning(false);
    };

    const startScanner = () => {
        setScanning(true);
        setTimeout(() => {
            const el = document.getElementById('qr-reader');
            if (!el) {
                showSnackbar({ type: 'error', message: 'Scanner container not ready' });
                setScanning(false);
                return;
            }
            try {
                const scanner = new Html5QrcodeScanner(
                    'qr-reader',
                    { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0, showTorchButton: false, showZoomSlider: false, defaultZoomValue: 2 },
                    false
                );
                scannerRef.current = scanner;
                scanner.render(
                    async (imei) => {
                        stopScanner();
                        try {
                            const result = await confirmByImei(imei);
                            showSnackbar({ type: 'success', message: result.data?.message || 'Product received' });
                            await fetchDistributions();
                            setScanOpen(false);
                        } catch (err) {
                            showSnackbar({ type: 'error', message: err.message || 'IMEI confirmation failed' });
                            setScanOpen(false);
                        }
                    },
                    (err) => { if (err && !err.includes('NotFoundException')) console.warn(err); }
                );
            } catch (err) {
                showSnackbar({ type: 'error', message: 'Could not start camera' });
                setScanning(false);
            }
        }, 100);
    };

    if (!canView) return <Typography sx={{ p: 2 }}>You do not have permission to view distributions.</Typography>;

    const distributions = Array.isArray(data) ? data : [];

    // Card-specific action handlers
    const handleConfirmAllCard = (dist) => {
        setSelectedDist(dist);
        handleConfirmReceipt();
    };

    const handleScanCard = (dist) => {
        setSelectedDist(dist);
        setScanOpen(true);
    };

    return (
        <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 }, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden', boxShadow: 1 }}>
                {/* Header */}
                <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={2}>
                        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                            <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                                Stock Distributions
                            </Typography>
                            {!loading && <Chip label={`${total} product${total !== 1 ? 's' : ''}`} size="small" color="primary" variant="outlined" />}
                        </Box>
                        {canCreate && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)} fullWidth={isMobile}>
                                Distribute Stock
                            </Button>
                        )}
                    </Box>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                        <TextField
                            label="Search by agent or center"
                            size="small"
                            defaultValue={search}
                            onChange={e => debouncedSetSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            sx={{ minWidth: { xs: '100%', sm: 250 } }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchDistributions} fullWidth={isMobile}>
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {/* Table or Card List */}
                {showTableView ? (
                    // Desktop Table View
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table sx={{ minWidth: 850 }}>
                            <TableHead>
                                <TableRow>{headCells.map(c => <TableCell key={c.id}>{c.label}</TableCell>)}</TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={headCells.length} align="center"><CircularProgress size={32} sx={{ my: 3 }} /></TableCell></TableRow>
                                ) : distributions.length === 0 ? (
                                    <TableRow><TableCell colSpan={headCells.length} align="center"><Typography>No distributions found</Typography></TableCell></TableRow>
                                ) : distributions.map(dist => {
                                    const progress = dist.quantity > 0 ? (dist.quantity_received / dist.quantity) * 100 : 0;
                                    const status = getStatusChip(dist);
                                    return (
                                        <TableRow key={dist.distribution_id} hover>
                                            <TableCell>
                                                <Stack spacing={0}>
                                                    <Typography variant="body2" fontWeight={500}>{dist.user?.name || '—'}</Typography>
                                                    {dist.user?.role?.display_name && <Typography variant="caption" color="text.secondary">{dist.user.role.display_name}</Typography>}
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Stack spacing={0}>
                                                    <Typography variant="body2">{dist.collection_center?.cc_name || '—'}</Typography>
                                                    {dist.collection_center?.location && <Typography variant="caption" color="text.secondary">{dist.collection_center.location}</Typography>}
                                                </Stack>
                                            </TableCell>
                                            <TableCell sx={{ minWidth: 220 }}><ProductCell product={dist.product} /></TableCell>
                                            <TableCell>
                                                <Box display="flex" flexDirection="column" gap={0.5}>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <LinearProgress variant="determinate" value={progress} sx={{ width: 80, height: 6, borderRadius: 3 }} />
                                                        <Typography variant="caption">{progress.toFixed(0)}%</Typography>
                                                    </Box>
                                                    <Chip label={status.label} color={status.color} size="small" icon={status.icon} />
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Stack spacing={0}>
                                                    <Typography variant="body2">{new Date(dist.created_at).toLocaleDateString()}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{new Date(dist.created_at).toLocaleTimeString()}</Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <IconButton size="small" onClick={e => handleMenuOpen(e, dist)}>
                                                    <MoreVertIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    // Mobile/Tablet Card View
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                        ) : distributions.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}><Typography>No distributions found</Typography></Paper>
                        ) : (
                            distributions.map(dist => (
                                <DistributionCard
                                    key={dist.distribution_id}
                                    dist={dist}
                                    canConfirm={canConfirm}
                                    canScan={canScan}
                                    onConfirmAll={handleConfirmAllCard}
                                    onScan={handleScanCard}
                                />
                            ))
                        )}
                    </Box>
                )}

                {/* Pagination */}
                <Box sx={{ borderTop: 1, borderColor: 'divider', py: { xs: 1, sm: 0 } }}>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={total}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={(_, p) => setPage(p)}
                        onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        sx={{
                            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }
                        }}
                    />
                </Box>
            </Paper>

            {/* Action Menu (for table view only) */}
            <Menu anchorEl={actionMenu} open={Boolean(actionMenu)} onClose={handleMenuClose}>
                {canConfirm && selectedDist?.quantity_received < selectedDist?.quantity && (
                    <MenuItem onClick={handleConfirmReceipt}><ConfirmIcon sx={{ mr: 1, color: 'success.main' }} /> Confirm All Received</MenuItem>
                )}
                {canScan && (
                    <MenuItem onClick={() => { setScanOpen(true); handleMenuClose(); }}><ScanIcon sx={{ mr: 1, color: 'primary.main' }} /> Scan IMEI</MenuItem>
                )}
            </Menu>

            <DistributionModal open={modalOpen} onClose={(refresh) => { setModalOpen(false); if (refresh) fetchDistributions(); }} />

            {/* Scan IMEI Dialog - responsive */}
            <Dialog open={scanOpen} onClose={() => setScanOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
                <DialogTitle sx={{ pb: 1 }}>Scan IMEI to Confirm Receipt</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1 }}>
                        {!scanning ? (
                            <Button variant="contained" startIcon={<ScanIcon />} onClick={startScanner} fullWidth>Start Camera</Button>
                        ) : (
                            <Button variant="outlined" startIcon={<StopIcon />} onClick={stopScanner} color="error" fullWidth>Stop Camera</Button>
                        )}
                        <div style={{ display: scanning ? 'block' : 'none', marginTop: 16 }}>
                            <div id="qr-reader" style={{ width: '100%' }} />
                            <Typography variant="caption" display="block" align="center" sx={{ mt: 0.5 }}>Position the IMEI barcode in front of the camera</Typography>
                        </div>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setScanOpen(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>

            {/* Confirm Receipt Dialog - responsive */}
            <Dialog open={confirmDialog.open} onClose={() => { if (!confirmLoading) setConfirmDialog(p => ({ ...p, open: false })); }} maxWidth="xs" fullWidth PaperProps={{ sx: { overflow: 'hidden' } }}>
                <LinearProgress variant="determinate" value={confirmProgress} sx={{ height: 3, borderRadius: 0, opacity: confirmLoading || confirmProgress > 0 ? 1 : 0 }} />
                <DialogTitle sx={{ pb: 1 }}>{confirmDialog.title}</DialogTitle>
                <DialogContent>
                    <Typography>{confirmDialog.message}</Typography>
                    {confirmLoading && (
                        <Box sx={{ mt: 2 }}>
                            <Box display="flex" justifyContent="space-between" mb={0.5}>
                                <Typography variant="caption" color="text.secondary">{confirmProgress < 100 ? 'Processing…' : 'Done'}</Typography>
                                <Typography variant="caption" color="text.secondary">{confirmProgress}%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={confirmProgress} sx={{ height: 6, borderRadius: 3 }} />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setConfirmDialog(p => ({ ...p, open: false }))} disabled={confirmLoading}>Cancel</Button>
                    <Button onClick={handleConfirm} color="error" variant="contained" disabled={confirmLoading} sx={{ minWidth: 100 }}>
                        {confirmLoading ? <Box display="flex" alignItems="center" gap={1}><CircularProgress size={14} color="inherit" /><span>{confirmProgress}%</span></Box> : 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}