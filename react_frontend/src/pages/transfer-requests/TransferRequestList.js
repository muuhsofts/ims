import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography, CircularProgress, Tooltip,
    LinearProgress, Stack
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Delete as DeleteIcon,
    Refresh as RefreshIcon, Search as SearchIcon,
    CheckCircle as ApproveIcon, Cancel as RejectIcon,
    Receipt as ConfirmIcon, Visibility as ViewIcon,
    Inventory as ProcessIcon, QrCodeScanner as ScanIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { useTransferRequests } from '@/hooks/useTransferRequests';
import TransferRequestModal from './TransferRequestModal';
import BarcodeScannerDialog from './components/BarcodeScannerDialog';

// ─── head cells (Progress column removed) ───────────────────────────────────
const headCells = [
    { id: 'requester', label: 'Requester' },
    { id: 'cc', label: 'Collection Center' },
    { id: 'items', label: 'Items' },
    { id: 'status', label: 'Status' },
    { id: 'created_at', label: 'Created At' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

const getStatusChip = (status) => {
    switch (status) {
        case 'pending':   return <Chip label="Pending"   color="warning" size="small" />;
        case 'approved':  return <Chip label="Approved"  color="success" size="small" />; // changed to green
        case 'rejected':  return <Chip label="Rejected"  color="error"   size="small" />;
        case 'completed': return <Chip label="Completed" color="success" size="small" />;
        default:          return <Chip label={status}                    size="small" />;
    }
};

// ─── animated progress bar that smoothly runs to a target value ─────────────
function AnimatedProgress({ value, color = 'primary', height = 10 }) {
    const [displayed, setDisplayed] = useState(value);
    const prev = useRef(value);

    useEffect(() => {
        if (value === prev.current) return;
        const start = prev.current;
        const end   = value;
        const duration = 800; // ms
        const startTime = performance.now();

        const step = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayed(start + (end - start) * eased);
            if (progress < 1) requestAnimationFrame(step);
            else prev.current = end;
        };
        requestAnimationFrame(step);
    }, [value]);

    return (
        <LinearProgress
            variant="determinate"
            value={displayed}
            color={color}
            sx={{
                height,
                borderRadius: height / 2,
                '& .MuiLinearProgress-bar': { transition: 'none' },
            }}
        />
    );
}

// ─── Approve Progress Dialog with live progress bar ─────────────────────────
function ApproveProgressDialog({ open, onClose, request, onSuccess }) {
    const [progressValue, setProgressValue] = useState(0);
    const [statusText, setStatusText] = useState('Starting approval...');
    const animationRef = useRef(null);
    const startTimeRef = useRef(null);
    const apiCompletedRef = useRef(false);
    const currentTargetRef = useRef(70);

    const { approve } = useTransferRequests(); // get approve function from hook

    // Cleanup animation on unmount or close
    useEffect(() => {
        if (!open) {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            setProgressValue(0);
            setStatusText('Starting approval...');
            apiCompletedRef.current = false;
            currentTargetRef.current = 70;
            return;
        }

        // Start animation to 70% over 700ms
        const startValue = 0;
        const targetValue = 70;
        const duration = 700; // fast tick to 70%
        startTimeRef.current = performance.now();
        apiCompletedRef.current = false;
        setProgressValue(startValue);
        setStatusText('Approving request...');

        const animate = (now) => {
            const elapsed = now - startTimeRef.current;
            let newValue;
            if (elapsed >= duration) {
                newValue = targetValue;
                setProgressValue(newValue);
                // Stop further animation frames, but we might resume later on API success
                if (animationRef.current) cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
                return;
            }
            // Ease out cubic
            const t = elapsed / duration;
            const eased = 1 - Math.pow(1 - t, 3);
            newValue = startValue + (targetValue - startValue) * eased;
            setProgressValue(newValue);
            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        // Make the API call
        const performApprove = async () => {
            try {
                await approve(request.request_id);
                apiCompletedRef.current = true;
                setStatusText('Success! Finalizing...');
                // Race to 100% from current progress value
                const currentProgress = progressValue; // capture current value
                const raceDuration = 300;
                const raceStart = performance.now();
                const raceTarget = 100;
                const raceStartValue = currentProgress;

                const raceAnimate = (now) => {
                    const elapsed = now - raceStart;
                    let newVal;
                    if (elapsed >= raceDuration) {
                        newVal = raceTarget;
                        setProgressValue(newVal);
                        if (animationRef.current) cancelAnimationFrame(animationRef.current);
                        animationRef.current = null;
                        // After reaching 100%, call onSuccess and close
                        setTimeout(() => {
                            onSuccess?.();
                            onClose();
                        }, 200);
                        return;
                    }
                    const t = elapsed / raceDuration;
                    const eased = 1 - Math.pow(1 - t, 3);
                    newVal = raceStartValue + (raceTarget - raceStartValue) * eased;
                    setProgressValue(newVal);
                    animationRef.current = requestAnimationFrame(raceAnimate);
                };
                if (animationRef.current) cancelAnimationFrame(animationRef.current);
                animationRef.current = requestAnimationFrame(raceAnimate);
            } catch (err) {
                // Error handling
                setStatusText(`Error: ${err.message}`);
                showSnackbar({ type: 'error', message: err.message });
                setTimeout(() => onClose(), 1500);
            }
        };

        performApprove();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [open, request, approve, onSuccess, onClose]);

    return (
        <Dialog open={open} onClose={(_, reason) => { if (reason !== 'backdropClick') onClose(); }} disableEscapeKeyDown>
            <DialogTitle>Approving Request</DialogTitle>
            <DialogContent>
                <Box sx={{ minWidth: 300, py: 2 }}>
                    <Typography variant="body2" gutterBottom>
                        {statusText}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                        <Box sx={{ flexGrow: 1 }}>
                            <LinearProgress variant="determinate" value={progressValue} sx={{ height: 10, borderRadius: 5 }} />
                        </Box>
                        <Typography variant="body2" fontWeight="bold">
                            {Math.round(progressValue)}%
                        </Typography>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}

// ─── main component ──────────────────────────────────────────────────────────
export default function TransferRequestList() {
    const { user, hasPermission } = usePermission();
    const canView           = hasPermission('transfer_requests.view');
    const canCreate         = hasPermission('transfer_requests.create');
    const canApprove        = hasPermission('transfer_requests.approve');
    const canReject         = hasPermission('transfer_requests.reject');
    const canProcess        = hasPermission('transfer_requests.process');
    const canScanReceipt    = hasPermission('transfer_requests.scan_receipt');
    const canConfirmReceipt = hasPermission('transfer_requests.confirm_receipt');
    const canDelete         = hasPermission('transfer_requests.delete');

    const {
        data, total, loading, fetchData,
        approve, reject, processTransfer, scanReceipt, confirmReceived, remove, getAvailableProducts,
    } = useTransferRequests();

    const [search,       setSearch]       = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page,         setPage]         = useState(0);
    const [rowsPerPage,  setRowsPerPage]  = useState(10);
    const [modalOpen,    setModalOpen]    = useState(false);
    const [actionMenu,   setActionMenu]   = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);

    const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
    const [selectedItems,   setSelectedItems]   = useState([]);

    const [processDialog, setProcessDialog] = useState({
        open: false, request: null, availableProducts: [], selectedProductIds: [],
    });

    // progress animation: request being approved right now (for mini bars) - not used anymore but kept for potential future
    const [animatingApproveId, setAnimatingApproveId] = useState(null);

    // Approve progress dialog
    const [approveProgressOpen, setApproveProgressOpen] = useState(false);
    const [approvingRequest, setApprovingRequest] = useState(null);

    // scanner
    const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
    const [scanRequest,        setScanRequest]        = useState(null);

    // generic confirm dialog
    const [confirmDialog, setConfirmDialog] = useState({
        open: false, title: '', message: '', onConfirm: null,
    });

    // ── data fetching ──────────────────────────────────────────────────────
    const fetchRequests = useCallback(() => {
        if (!canView) return;
        fetchData({
            page:     page + 1,
            per_page: rowsPerPage,
            search:   search       || undefined,
            status:   statusFilter || undefined,
        });
    }, [page, rowsPerPage, search, statusFilter, canView, fetchData]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    // ── menu helpers ───────────────────────────────────────────────────────
    const handleMenuOpen  = (e, req) => { setSelectedRequest(req); setActionMenu(e.currentTarget); };
    const handleMenuClose = ()        => { setActionMenu(null); setSelectedRequest(null); };

    const handleViewItems = (items) => {
        setSelectedItems(items);
        setItemsDialogOpen(true);
        handleMenuClose();
    };

    const openConfirmDialog = (title, message, onConfirm) =>
        setConfirmDialog({ open: true, title, message, onConfirm });

    // ── approve with live progress dialog ─────────────────────────────────
    const handleApprove = () => {
        if (!selectedRequest) return;
        const reqSnapshot = selectedRequest;
        handleMenuClose();
        openConfirmDialog(
            'Approve Request',
            `Are you sure you want to approve the request from ${reqSnapshot.requester?.name || reqSnapshot.requester?.email}?`,
            () => {
                // Close confirm dialog and open progress dialog
                setConfirmDialog(prev => ({ ...prev, open: false }));
                setApprovingRequest(reqSnapshot);
                setApproveProgressOpen(true);
            }
        );
    };

    const onApproveSuccess = async () => {
        // Trigger the mini bar animation for this request (optional, but kept as is)
        setAnimatingApproveId(approvingRequest?.request_id);
        showSnackbar({ type: 'success', message: 'Request approved' });
        await fetchRequests();
        setAnimatingApproveId(null);
        setApprovingRequest(null);
    };

    const handleReject = () => {
        if (!selectedRequest) return;
        handleMenuClose();
        openConfirmDialog(
            'Reject Request',
            `Are you sure you want to reject the request from ${selectedRequest.requester?.name || selectedRequest.requester?.email}?`,
            async () => {
                try {
                    await reject(selectedRequest.request_id);
                    showSnackbar({ type: 'success', message: 'Request rejected' });
                    fetchRequests();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message });
                } finally {
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                }
            }
        );
    };

    const handleDelete = () => {
        if (!selectedRequest) return;
        handleMenuClose();
        openConfirmDialog(
            'Delete Request',
            `Are you sure you want to delete the pending request from ${selectedRequest.requester?.name || selectedRequest.requester?.email}? This action cannot be undone.`,
            async () => {
                try {
                    await remove(selectedRequest.request_id);
                    showSnackbar({ type: 'success', message: 'Request deleted' });
                    fetchRequests();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message });
                } finally {
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                }
            }
        );
    };

    const handleConfirmReceipt = async () => {
        if (!selectedRequest) return;
        handleMenuClose();
        try {
            await confirmReceived(selectedRequest.request_id);
            showSnackbar({ type: 'success', message: 'Receipt confirmed' });
            fetchRequests();
        } catch (err) {
            showSnackbar({ type: 'error', message: err.message });
        }
    };

    const openProcessDialog = async () => {
        if (!selectedRequest) return;
        handleMenuClose();
        try {
            const res = await getAvailableProducts(selectedRequest.request_id);
            setProcessDialog({ open: true, request: selectedRequest, availableProducts: res.data, selectedProductIds: [] });
        } catch {
            showSnackbar({ type: 'error', message: 'Failed to load available products' });
        }
    };

    const handleProcessSubmit = async () => {
        if (processDialog.selectedProductIds.length === 0) {
            showSnackbar({ type: 'error', message: 'Select at least one product' });
            return;
        }
        try {
            await processTransfer(processDialog.request.request_id, processDialog.selectedProductIds);
            showSnackbar({ type: 'success', message: 'Transfer processed' });
            setProcessDialog({ open: false, request: null, availableProducts: [], selectedProductIds: [] });
            fetchRequests();
        } catch (err) {
            showSnackbar({ type: 'error', message: err.message });
        }
    };

    // ── scanner ────────────────────────────────────────────────────────────
    const openScannerForRequest = (request) => {
        setScanRequest(request);
        setBarcodeScannerOpen(true);
        handleMenuClose();
    };

    const handleScannedImei = async (imei) => {
        if (!scanRequest) return;
        try {
            const response = await scanReceipt(scanRequest.request_id, imei);
            const { received, total, completed } = response.data;
            showSnackbar({
                type: 'success',
                message: completed
                    ? '🎉 All products received! Request completed.'
                    : `Product received (${received}/${total})`,
            });
            await fetchRequests();
            if (completed) { setBarcodeScannerOpen(false); setScanRequest(null); }
            return Promise.resolve();
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            showSnackbar({ type: 'error', message: msg });
            throw err;
        }
    };

    const closeScanner = () => { setBarcodeScannerOpen(false); setScanRequest(null); };

    const handleModalClose = (refresh) => { setModalOpen(false); if (refresh) fetchRequests(); };

    // ── guards ─────────────────────────────────────────────────────────────
    if (!canView) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography color="error">No permission to view transfer requests.</Typography>
            </Box>
        );
    }

    const requests = Array.isArray(data) ? data : [];

    // ── render ─────────────────────────────────────────────────────────────
    return (
        <Box sx={{ p: 2 }}>

            {/* ── TOP PROGRESS CARD REMOVED ── */}

            <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                {/* toolbar */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                        <Typography variant="h5">Transfer Requests</Typography>
                        <Box display="flex" gap={2} alignItems="center">
                            {/* "Logged in: ..." text removed */}
                            {canCreate && (
                                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>
                                    New Request
                                </Button>
                            )}
                        </Box>
                    </Box>

                    <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                        <TextField
                            label="Search by center or requester"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            sx={{ minWidth: 250 }}
                        />
                        <TextField
                            select label="Status" size="small"
                            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                            sx={{ minWidth: 150 }}
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="approved">Approved</MenuItem>
                            <MenuItem value="rejected">Rejected</MenuItem>
                            <MenuItem value="completed">Completed</MenuItem>
                        </TextField>
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchRequests}>
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {/* table — Progress column removed */}
                <TableContainer>
                    <Table sx={{ minWidth: 800 }}>
                        <TableHead>
                            <TableRow>
                                {headCells.map(cell => <TableCell key={cell.id}>{cell.label}</TableCell>)}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={headCells.length} align="center">
                                        <CircularProgress size={28} />
                                    </TableCell>
                                </TableRow>
                            ) : requests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={headCells.length} align="center">
                                        No requests found.
                                    </TableCell>
                                </TableRow>
                            ) : requests.map(req => {
                                const isApproved   = req.status === 'approved';
                                const isIncomplete = isApproved && req.received_quantity < req.total_quantity;
                                return (
                                    <TableRow key={req.request_id} hover>
                                        <TableCell>{req.requester?.name || '-'}</TableCell>
                                        <TableCell>{req.collection_center?.cc_name || '-'}</TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Typography variant="body2">
                                                    {req.requested_items?.length || 0} item(s)
                                                </Typography>
                                                <IconButton size="small" onClick={() => handleViewItems(req.requested_items)}>
                                                    <ViewIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        {/* Progress column intentionally removed */}
                                        <TableCell>{getStatusChip(req.status)}</TableCell>
                                        <TableCell>{new Date(req.created_at).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1}>
                                                {isIncomplete && canScanReceipt && (
                                                    <Tooltip title="Scan Card (IMEI)">
                                                        <IconButton size="small" color="secondary" onClick={() => openScannerForRequest(req)}>
                                                            <ScanIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                <IconButton size="small" onClick={(e) => handleMenuOpen(e, req)}>
                                                    <MoreVertIcon />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={total}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                />
            </Paper>

            {/* ── ACTION MENU ── */}
            <Menu anchorEl={actionMenu} open={Boolean(actionMenu)} onClose={handleMenuClose}>
                {selectedRequest?.status === 'pending' && canApprove   && <MenuItem onClick={handleApprove}><ApproveIcon sx={{ mr:1, color:'success.main' }} /> Approve</MenuItem>}
                {selectedRequest?.status === 'pending' && canReject    && <MenuItem onClick={handleReject}><RejectIcon   sx={{ mr:1, color:'error.main'   }} /> Reject</MenuItem>}
                {selectedRequest?.status === 'approved' && canProcess   && <MenuItem onClick={openProcessDialog}><ProcessIcon sx={{ mr:1, color:'primary.main'   }} /> Process Transfer</MenuItem>}
                {selectedRequest?.status === 'approved' && canScanReceipt    && <MenuItem onClick={() => openScannerForRequest(selectedRequest)}><ScanIcon    sx={{ mr:1, color:'secondary.main' }} /> Scan Receipt</MenuItem>}
                {selectedRequest?.status === 'approved' && canConfirmReceipt && <MenuItem onClick={handleConfirmReceipt}><ConfirmIcon sx={{ mr:1, color:'info.main'      }} /> Confirm Receipt</MenuItem>}
                {selectedRequest?.status === 'pending' && canDelete     && <MenuItem onClick={handleDelete} sx={{ color:'error.main' }}><DeleteIcon sx={{ mr:1 }} /> Delete</MenuItem>}
            </Menu>

            {/* ── CONFIRM DIALOG ── */}
            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
                <DialogTitle>{confirmDialog.title}</DialogTitle>
                <DialogContent><Typography>{confirmDialog.message}</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button onClick={confirmDialog.onConfirm} variant="contained" color="primary">Confirm</Button>
                </DialogActions>
            </Dialog>

            {/* ── APPROVE PROGRESS DIALOG (with live progress bar) ── */}
            <ApproveProgressDialog
                open={approveProgressOpen}
                onClose={() => setApproveProgressOpen(false)}
                request={approvingRequest}
                onSuccess={onApproveSuccess}
            />

            {/* ── ITEMS DETAIL DIALOG ── */}
            <Dialog open={itemsDialogOpen} onClose={() => setItemsDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Requested Items</DialogTitle>
                <DialogContent dividers>
                    {selectedItems.length === 0 ? <Typography>No items.</Typography> : (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Category</TableCell>
                                    <TableCell>Model</TableCell>
                                    <TableCell>SKUs</TableCell>
                                    <TableCell>Qty</TableCell>
                                    <TableCell>Description</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedItems.map((item, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>{item.category_name}</TableCell>
                                        <TableCell>{item.model || '-'}</TableCell>
                                        <TableCell>{item.skus?.join(', ') || '-'}</TableCell>
                                        <TableCell>{item.quantity || 1}</TableCell>
                                        <TableCell>{item.description || '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={() => setItemsDialogOpen(false)}>Close</Button></DialogActions>
            </Dialog>

            {/* ── PROCESS TRANSFER DIALOG ── */}
            <Dialog
                open={processDialog.open}
                onClose={() => setProcessDialog({ open:false, request:null, availableProducts:[], selectedProductIds:[] })}
                maxWidth="md" fullWidth
            >
                <DialogTitle>Process Transfer – Select Products</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">Request for {processDialog.request?.collection_center?.cc_name}</Typography>
                    {processDialog.availableProducts.length === 0
                        ? <Typography>No products available in warehouse.</Typography>
                        : processDialog.availableProducts.map(prod => (
                            <Paper key={prod.product_id} variant="outlined" sx={{ p:1, mb:1, display:'flex', alignItems:'center', gap:2 }}>
                                <input
                                    type="checkbox"
                                    checked={processDialog.selectedProductIds.includes(prod.product_id)}
                                    onChange={(e) => {
                                        if (e.target.checked)
                                            setProcessDialog(prev => ({ ...prev, selectedProductIds: [...prev.selectedProductIds, prod.product_id] }));
                                        else
                                            setProcessDialog(prev => ({ ...prev, selectedProductIds: prev.selectedProductIds.filter(id => id !== prod.product_id) }));
                                    }}
                                />
                                <Box>
                                    <Typography variant="body2"><strong>IMEI:</strong> {prod.imei}</Typography>
                                    <Typography variant="body2"><strong>SKU:</strong> {prod.sku}</Typography>
                                    <Typography variant="body2">Prices: Buy {prod.buying_price}, Sell {prod.selling_price}</Typography>
                                </Box>
                            </Paper>
                        ))
                    }
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setProcessDialog({ open:false, request:null, availableProducts:[], selectedProductIds:[] })}>Cancel</Button>
                    <Button onClick={handleProcessSubmit} variant="contained" disabled={processDialog.selectedProductIds.length === 0}>
                        Transfer Selected ({processDialog.selectedProductIds.length})
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── BARCODE SCANNER ── */}
            <BarcodeScannerDialog
                open={barcodeScannerOpen}
                onClose={closeScanner}
                onScan={handleScannedImei}
                title="Scan Product IMEI"
            />

            {/* ── CREATION MODAL ── */}
            <TransferRequestModal open={modalOpen} onClose={handleModalClose} />
        </Box>
    );
}