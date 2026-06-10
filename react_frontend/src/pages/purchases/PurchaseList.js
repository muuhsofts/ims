// src/pages/purchases/PurchaseList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography, CircularProgress
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Delete as DeleteIcon, Refresh as RefreshIcon, Search as SearchIcon,
    CheckCircle as CompleteIcon, Cancel as CancelIcon, Pending as PendingIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { usePurchases } from '@/hooks/usePurchases';
import PurchaseModal from './PurchaseModal';

const headCells = [
    { id: 'supplier', label: 'Supplier' },
    { id: 'category', label: 'Category / Model' },
    { id: 'skus', label: 'SKU(s)' },
    { id: 'quantity', label: 'Qty' },
    { id: 'unit_price', label: 'Unit Price (TSh)' },
    { id: 'subtotal', label: 'Subtotal (TSh)' },
    { id: 'status', label: 'Status' },
    { id: 'created_at', label: 'Created At' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

export default function PurchaseList() {
    const { hasPermission } = usePermission();
    const canView = hasPermission('purchases.view');
    const canCreate = hasPermission('purchases.create');
    const canEdit = hasPermission('purchases.edit');
    const canDelete = hasPermission('purchases.delete');
    const canUpdateStatus = hasPermission('purchases.update_status');

    const { data, total, loading, fetchData, updateStatus, remove } = usePurchases();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });

    const fetchPurchases = useCallback(() => {
        if (!canView) return;
        const params = {
            page: page + 1,
            per_page: rowsPerPage,
            search: search || undefined,
        };
        fetchData(params);
    }, [page, rowsPerPage, search, canView, fetchData]);

    useEffect(() => {
        fetchPurchases();
    }, [fetchPurchases]);

    const handleMenuOpen = (event, purchase) => {
        setSelectedPurchase(purchase);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => {
        setActionMenu(null);
        setSelectedPurchase(null);
    };

    const handleEdit = () => {
        setEditingPurchase(selectedPurchase);
        setModalOpen(true);
        handleMenuClose();
    };

    const handleDelete = () => {
        setConfirmDialog({
            open: true,
            title: 'Delete Purchase',
            message: `Are you sure you want to delete this purchase?`,
            action: async () => {
                try {
                    await remove(selectedPurchase.purchase_id);
                    showSnackbar({ type: 'success', message: 'Purchase deleted successfully' });
                    fetchPurchases();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Delete failed' });
                }
            }
        });
        handleMenuClose();
    };

    const handleStatusChange = (newStatus) => {
        setConfirmDialog({
            open: true,
            title: `Mark as ${newStatus}`,
            message: `Are you sure you want to mark this purchase as ${newStatus}?`,
            action: async () => {
                try {
                    await updateStatus(selectedPurchase.purchase_id, newStatus);
                    showSnackbar({ type: 'success', message: `Purchase ${newStatus}` });
                    fetchPurchases();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Status update failed' });
                }
            }
        });
        handleMenuClose();
    };

    const handleModalClose = (refresh) => {
        setModalOpen(false);
        setEditingPurchase(null);
        if (refresh) fetchPurchases();
    };

    const handleConfirm = async () => {
        if (!confirmDialog.action) return;
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        try {
            await confirmDialog.action();
        } catch {
            // error already handled
        }
    };

    if (!canView) {
        return <Typography sx={{ p: 2 }}>You do not have permission to view purchases.</Typography>;
    }

    const purchases = Array.isArray(data) ? data : [];

    const getStatusChip = (status) => {
        switch (status) {
            case 'completed':
                return <Chip label="Completed" color="success" size="small" icon={<CompleteIcon />} />;
            case 'cancelled':
                return <Chip label="Cancelled" color="error" size="small" icon={<CancelIcon />} />;
            default:
                return <Chip label="Pending" color="warning" size="small" icon={<PendingIcon />} />;
        }
    };

    return (
        <Box sx={{ width: '100%', p: 0, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: 1, overflow: 'hidden', boxShadow: 1 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5">Purchases</Typography>
                        {canCreate && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>
                                New Purchase
                            </Button>
                        )}
                    </Box>
                    <Box display="flex" gap={2} flexWrap="wrap">
                        <TextField
                            label="Search by supplier or category"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            sx={{ minWidth: 250 }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchPurchases}>
                            Refresh
                        </Button>
                    </Box>
                </Box>

                <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table sx={{ minWidth: 800 }}>
                        <TableHead>
                            <TableRow>
                                {headCells.map((cell) => (
                                    <TableCell key={cell.id}>{cell.label}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={headCells.length} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                            ) : purchases.length === 0 ? (
                                <TableRow><TableCell colSpan={headCells.length} align="center">No purchases found</TableCell></TableRow>
                            ) : (
                                purchases.map((purchase) => (
                                    <TableRow key={purchase.purchase_id} hover>
                                        <TableCell>{purchase.supplier?.supplier_name || '-'}</TableCell>
                                        <TableCell>
                                            {purchase.category?.category_name || '-'}
                                            {purchase.category?.model ? ` (${purchase.category.model})` : ''}
                                        </TableCell>
                                        <TableCell>
                                            {purchase.selected_skus && purchase.selected_skus.length > 0 ? (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {purchase.selected_skus.map((sku, idx) => (
                                                        <Chip key={idx} label={sku} size="small" variant="outlined" />
                                                    ))}
                                                </Box>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>{purchase.quantity_ordered}</TableCell>
                                        <TableCell>TSh {parseFloat(purchase.unit_price).toLocaleString()}</TableCell>
                                        <TableCell>TSh {parseFloat(purchase.subtotal).toLocaleString()}</TableCell>
                                        <TableCell>{getStatusChip(purchase.status)}</TableCell>
                                        <TableCell>{new Date(purchase.created_at).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <IconButton size="small" onClick={(e) => handleMenuOpen(e, purchase)}>
                                                <MoreVertIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={total}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={(e, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                    />
                </Box>
            </Paper>

            <Menu anchorEl={actionMenu} open={Boolean(actionMenu)} onClose={handleMenuClose}>
                {canEdit && (
                    <MenuItem onClick={handleEdit}>
                        <EditIcon sx={{ mr: 1 }} /> Edit
                    </MenuItem>
                )}
                {canUpdateStatus && selectedPurchase && selectedPurchase.status !== 'completed' && (
                    <MenuItem onClick={() => handleStatusChange('completed')}>
                        <CompleteIcon sx={{ mr: 1, color: 'success.main' }} /> Mark Completed
                    </MenuItem>
                )}
                {canUpdateStatus && selectedPurchase && selectedPurchase.status !== 'cancelled' && (
                    <MenuItem onClick={() => handleStatusChange('cancelled')}>
                        <CancelIcon sx={{ mr: 1, color: 'error.main' }} /> Mark Cancelled
                    </MenuItem>
                )}
                {canDelete && (
                    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                        <DeleteIcon sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                )}
            </Menu>

            <PurchaseModal open={modalOpen} onClose={handleModalClose} purchase={editingPurchase} />

            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>
                <DialogTitle>{confirmDialog.title}</DialogTitle>
                <DialogContent>{confirmDialog.message}</DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button onClick={handleConfirm} color="error" variant="contained">Confirm</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}