// src/pages/purchases/PurchaseList.js
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, Menu, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography, CircularProgress, Card, CardContent, Divider, useMediaQuery, useTheme } from '@mui/material';
import { Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon, Refresh as RefreshIcon, Search as SearchIcon, CheckCircle as CompleteIcon, Cancel as CancelIcon, Pending as PendingIcon, Business as SupplierIcon, Category as CategoryIcon, Sell as SkuIcon, Inventory as QuantityIcon, AttachMoney as MoneyIcon, CalendarToday as CalendarIcon } from '@mui/icons-material';
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

    const { hasPermission } = usePermission();
    const canView = hasPermission('purchases.view');
    const canCreate = hasPermission('purchases.create');
    const canEdit = hasPermission('purchases.edit');
    const canUpdateStatus = hasPermission('purchases.update_status');

    const { data, total, loading, fetchData, updateStatus } = usePurchases();

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

    const handleEdit = (purchase) => {
        setEditingPurchase(purchase);
        setModalOpen(true);
        if (actionMenu) handleMenuClose();
    };

    const handleStatusChangePurchase = (purchase, newStatus) => {
        const purchaseId = purchase.purchase_id;
        if (!purchaseId) {
            showSnackbar({ type: 'error', message: 'Purchase ID missing' });
            return;
        }
        setConfirmDialog({
            open: true,
            title: `Mark as ${newStatus}`,
            message: `Are you sure you want to mark this purchase as ${newStatus}?`,
            action: async () => {
                try {
                    await updateStatus(purchaseId, newStatus);
                    showSnackbar({ type: 'success', message: `Purchase ${newStatus}` });
                    fetchPurchases();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Status update failed' });
                }
            }
        });
        if (actionMenu) handleMenuClose();
    };

    const handleEditFromTable = () => {
        if (selectedPurchase) handleEdit(selectedPurchase);
    };

    const handleStatusChangeFromTable = (newStatus) => {
        if (selectedPurchase) handleStatusChangePurchase(selectedPurchase, newStatus);
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

    // Card component
    const PurchaseCard = ({ purchase, canEdit, canUpdateStatus }) => {
        const statusChip = getStatusChip(purchase.status);
        return (
            <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', textAlign: 'center' }}>
                <CardContent sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <SupplierIcon fontSize="small" color="primary" />
                            <Typography variant="subtitle1" fontWeight="bold">
                                {purchase.supplier?.supplier_name || '—'}
                            </Typography>
                        </Box>
                        {statusChip}
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
                        <CategoryIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                            {purchase.category?.category_name || '-'}
                            {purchase.category?.model ? ` (${purchase.category.model})` : ''}
                        </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
                        <SkuIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                            {purchase.selected_skus && purchase.selected_skus.length > 0 ? purchase.selected_skus.join(', ') : '-'}
                        </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <QuantityIcon fontSize="small" color="action" />
                            <Typography variant="body2"><strong>Qty:</strong> {purchase.quantity_ordered}</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <MoneyIcon fontSize="small" color="action" />
                            <Typography variant="body2"><strong>Unit:</strong> TSh {parseFloat(purchase.unit_price).toLocaleString()}</Typography>
                        </Box>
                    </Box>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
                        <MoneyIcon fontSize="small" color="success" />
                        <Typography variant="body2" fontWeight="bold">
                            Subtotal: TSh {parseFloat(purchase.subtotal).toLocaleString()}
                        </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={2}>
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                            {new Date(purchase.created_at).toLocaleString()}
                        </Typography>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    <Box display="flex" flexDirection="column" gap={1}>
                        {canEdit && (
                            <Button fullWidth variant="outlined" startIcon={<EditIcon />} onClick={() => handleEdit(purchase)}>
                                Edit
                            </Button>
                        )}
                        {canUpdateStatus && purchase.status !== 'completed' && (
                            <Button
                                fullWidth
                                variant="outlined"
                                color="success"
                                startIcon={<CompleteIcon />}
                                onClick={() => handleStatusChangePurchase(purchase, 'completed')}
                            >
                                Mark Completed
                            </Button>
                        )}
                        {canUpdateStatus && purchase.status !== 'cancelled' && (
                            <Button
                                fullWidth
                                variant="outlined"
                                color="error"
                                startIcon={<CancelIcon />}
                                onClick={() => handleStatusChangePurchase(purchase, 'cancelled')}
                            >
                                Mark Cancelled
                            </Button>
                        )}
                    </Box>
                </CardContent>
            </Card>
        );
    };

    return (
        <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 }, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden', boxShadow: 1 }}>
                {/* Header & Filters */}
                <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={2}>
                        <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                            Purchases
                        </Typography>
                        {canCreate && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)} fullWidth={isMobile}>
                                New Purchase
                            </Button>
                        )}
                    </Box>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                        <TextField
                            label="Search by supplier or category"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                            }}
                            sx={{ flex: 1, minWidth: { xs: '100%', sm: 250 } }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchPurchases} fullWidth={isMobile}>
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {/* Table or Card View */}
                {showTableView ? (
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
                                    <TableRow><TableCell colSpan={headCells.length} align="center"><CircularProgress size={32} sx={{ my: 3 }} /></TableCell></TableRow>
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
                ) : (
                    // Mobile/Tablet Card View
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                        ) : purchases.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>No purchases found</Paper>
                        ) : (
                            purchases.map((purchase) => (
                                <PurchaseCard
                                    key={purchase.purchase_id}
                                    purchase={purchase}
                                    canEdit={canEdit}
                                    canUpdateStatus={canUpdateStatus}
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
                        onPageChange={(e, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        sx={{ '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
                    />
                </Box>
            </Paper>

            {/* Action Menu (only for table view) */}
            <Menu anchorEl={actionMenu} open={Boolean(actionMenu)} onClose={handleMenuClose}>
                {canEdit && (
                    <MenuItem onClick={handleEditFromTable}>
                        <EditIcon sx={{ mr: 1 }} /> Edit
                    </MenuItem>
                )}
                {canUpdateStatus && selectedPurchase && selectedPurchase.status !== 'completed' && (
                    <MenuItem onClick={() => handleStatusChangeFromTable('completed')}>
                        <CompleteIcon sx={{ mr: 1, color: 'success.main' }} /> Mark Completed
                    </MenuItem>
                )}
                {canUpdateStatus && selectedPurchase && selectedPurchase.status !== 'cancelled' && (
                    <MenuItem onClick={() => handleStatusChangeFromTable('cancelled')}>
                        <CancelIcon sx={{ mr: 1, color: 'error.main' }} /> Mark Cancelled
                    </MenuItem>
                )}
            </Menu>

            <PurchaseModal open={modalOpen} onClose={handleModalClose} purchase={editingPurchase} />

            {/* Confirm Dialog */}
            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))} fullWidth maxWidth="xs">
                <DialogTitle sx={{ pb: 1 }}>{confirmDialog.title}</DialogTitle>
                <DialogContent><Typography>{confirmDialog.message}</Typography></DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button onClick={handleConfirm} color="error" variant="contained">Confirm</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}