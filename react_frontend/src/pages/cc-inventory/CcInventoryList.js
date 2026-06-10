// src/pages/cc-inventory/CcInventoryList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography, CircularProgress, LinearProgress
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Delete as DeleteIcon, Refresh as RefreshIcon, Search as SearchIcon,
    Visibility as ViewIcon, Receipt as ReceiptIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { useCcInventory } from '@/hooks/useCcInventory';
import CcInventoryModal from './CcInventoryModal';

const headCells = [
    { id: 'cc', label: 'Collection Center' },
    { id: 'products', label: 'Products' },
    { id: 'quantity', label: 'Quantity' },
    { id: 'status', label: 'Status' },
    { id: 'created_at', label: 'Created At' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

export default function CcInventoryList() {
    const { user, hasPermission } = usePermission();
    const canView = hasPermission('cc_inventory.view') || hasPermission('cc_inventory.view_own');
    const canCreate = hasPermission('cc_inventory.create');
    const canEdit = hasPermission('cc_inventory.edit');
    const canDelete = hasPermission('cc_inventory.delete');
    const canConfirmReceipt = hasPermission('collection_center.confirm_receipt');

    // Only use confirmReceiptById from the hook (remove confirmMyReceipt)
    const { data, total, loading, fetchData, remove, confirmReceiptById } = useCcInventory();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingInventory, setEditingInventory] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [selectedInventory, setSelectedInventory] = useState(null);
    const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState([]);

    // Row‑based confirmation
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [inventoryToConfirm, setInventoryToConfirm] = useState(null);

    // Progress dialog
    const [progressOpen, setProgressOpen] = useState(false);
    const [progressValue, setProgressValue] = useState(0);

    const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });

    const fetchInventories = useCallback(() => {
        if (!canView) return;
        const params = {
            page: page + 1,
            per_page: rowsPerPage,
            search: search || undefined,
        };
        fetchData(params);
    }, [page, rowsPerPage, search, canView, fetchData]);

    useEffect(() => {
        fetchInventories();
    }, [fetchInventories]);

    const handleMenuOpen = (event, inv) => {
        setSelectedInventory(inv);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => {
        setActionMenu(null);
        setSelectedInventory(null);
    };

    const handleViewProducts = (products) => {
        setSelectedProducts(products);
        setItemsDialogOpen(true);
        handleMenuClose();
    };

    const handleEdit = () => {
        setEditingInventory(selectedInventory);
        setModalOpen(true);
        handleMenuClose();
    };

    const handleDelete = () => {
        setDeleteConfirmDialog({
            open: true,
            title: 'Delete Inventory',
            message: `Delete inventory for "${selectedInventory?.collection_center?.cc_name}"?`,
            action: async () => {
                await remove(selectedInventory.cc_inventory_id);
                showSnackbar({ type: 'success', message: 'Inventory deleted' });
                fetchInventories();
            }
        });
        handleMenuClose();
    };

    // --- Row‑based confirmation (uses cc_inventory_id) ---
    const handleConfirmReceiptClick = (inventory) => {
        setInventoryToConfirm(inventory);
        setConfirmDialogOpen(true);
        handleMenuClose();
    };

    const handleConfirmReceipt = async () => {
        if (!inventoryToConfirm) return;

        setConfirmDialogOpen(false);
        setProgressOpen(true);
        setProgressValue(0);

        let interval = setInterval(() => {
            setProgressValue(prev => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                return prev + 10;
            });
        }, 100);

        try {
            // Confirm by inventory ID
            await confirmReceiptById(inventoryToConfirm.cc_inventory_id);
            clearInterval(interval);
            setProgressValue(100);
            setTimeout(() => {
                setProgressOpen(false);
                showSnackbar({ type: 'success', message: 'Receipt confirmed successfully.' });
                fetchInventories();
                setInventoryToConfirm(null);
            }, 500);
        } catch (err) {
            clearInterval(interval);
            setProgressOpen(false);
            showSnackbar({ type: 'error', message: err.message || 'Failed to confirm receipt' });
            setInventoryToConfirm(null);
        }
    };

    const handleModalClose = (refresh) => {
        setModalOpen(false);
        setEditingInventory(null);
        if (refresh) fetchInventories();
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirmDialog.action) return;
        setDeleteConfirmDialog(prev => ({ ...prev, open: false }));
        try {
            await deleteConfirmDialog.action();
        } catch (err) {
            showSnackbar({ type: 'error', message: err.message || 'Action failed' });
        }
    };

    if (!canView) {
        return <Typography sx={{ p: 2 }}>You do not have permission to view collection center inventories.</Typography>;
    }

    const inventories = Array.isArray(data) ? data : [];

    const getProductLabel = (product) => {
        const productName = product.product_name || 'N/A';
        const categoryName = product.category_name || product.category?.category_name || 'N/A';
        const model = product.category?.model || 'N/A';
        const sku = product.category?.sku || 'N/A';
        const imei = product.imei || 'N/A';
        return `Product: ${productName} | Category: ${categoryName} | Model: ${model} | SKU: ${sku} | IMEI: ${imei}`;
    };

    const getStatusChip = (status) => {
        if (!status) return <Chip label="Pending" size="small" color="warning" />;
        if (status === 'arrived') return <Chip label="Arrived" size="small" color="success" />;
        if (status === 'rejected') return <Chip label="Rejected" size="small" color="error" />;
        return <Chip label={status} size="small" />;
    };

    const isOwnedByUser = selectedInventory?.collection_center?.owner_id === user?.id;

    return (
        <Box sx={{ width: '100%', p: 0, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: 1, overflow: 'hidden', boxShadow: 1 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5">Collection Center Inventories</Typography>
                        <Box>
                            {canCreate && (
                                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>
                                    Add Inventory
                                </Button>
                            )}
                        </Box>
                    </Box>
                    <Box display="flex" gap={2} flexWrap="wrap">
                        <TextField
                            label="Search by center"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            sx={{ minWidth: 250 }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchInventories}>
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
                            ) : inventories.length === 0 ? (
                                <TableRow><TableCell colSpan={headCells.length} align="center">No inventories found</TableCell></TableRow>
                            ) : (
                                inventories.map((inv) => (
                                    <TableRow key={inv.cc_inventory_id} hover>
                                        <TableCell>{inv.collection_center?.cc_name || '-'}</TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                                {inv.products && inv.products.length > 0 ? (
                                                    <>
                                                        {inv.products.map((p) => (
                                                            <Chip
                                                                key={p.product_id}
                                                                label={getProductLabel(p)}
                                                                size="small"
                                                                sx={{ m: 0.3, maxWidth: '100%', height: 'auto', whiteSpace: 'normal' }}
                                                            />
                                                        ))}
                                                        <IconButton size="small" onClick={() => handleViewProducts(inv.products)}>
                                                            <ViewIcon fontSize="small" />
                                                        </IconButton>
                                                    </>
                                                ) : (
                                                    <Typography variant="caption">No products</Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>{inv.quantity ?? 0}</TableCell>
                                        <TableCell>{getStatusChip(inv.cc_inventory_status)}</TableCell>
                                        <TableCell>{new Date(inv.created_at).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <IconButton size="small" onClick={(e) => handleMenuOpen(e, inv)}>
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
                {/* Only show Confirm Receipt in row menu if user owns this center and status is not arrived */}
                {canConfirmReceipt &&
                    selectedInventory?.cc_inventory_status !== 'arrived' &&
                    isOwnedByUser && (
                        <MenuItem onClick={() => handleConfirmReceiptClick(selectedInventory)}>
                            <ReceiptIcon sx={{ mr: 1 }} /> Confirm Receipt
                        </MenuItem>
                    )}
                {canEdit && (
                    <MenuItem onClick={handleEdit}>
                        <EditIcon sx={{ mr: 1 }} /> Edit
                    </MenuItem>
                )}
                {canDelete && (
                    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                        <DeleteIcon sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                )}
            </Menu>

            <CcInventoryModal open={modalOpen} onClose={handleModalClose} inventory={editingInventory} />

            {/* Confirmation dialog for row‑based receipt */}
            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
                <DialogTitle>Confirm Receipt</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to confirm receipt for <strong>{inventoryToConfirm?.collection_center?.cc_name}</strong>?
                        This will mark the inventory as <strong>Arrived</strong>.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirmReceipt} variant="contained" color="primary">
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Shared progress dialog */}
            <Dialog open={progressOpen} disableEscapeKeyDown>
                <DialogTitle>Confirming Receipt...</DialogTitle>
                <DialogContent>
                    <Box sx={{ width: '100%', mt: 2 }}>
                        <LinearProgress variant="determinate" value={progressValue} />
                        <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                            {progressValue}%
                        </Typography>
                    </Box>
                </DialogContent>
            </Dialog>

            {/* Products detail dialog */}
            <Dialog open={itemsDialogOpen} onClose={() => setItemsDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Products in this Inventory</DialogTitle>
                <DialogContent dividers>
                    {selectedProducts.length === 0 ? (
                        <Typography>No products assigned.</Typography>
                    ) : (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Product / Category</strong></TableCell>
                                    <TableCell><strong>Model / SKU</strong></TableCell>
                                    <TableCell><strong>IMEI</strong></TableCell>
                                    <TableCell><strong>Selling Price (TSh)</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedProducts.map((p) => (
                                    <TableRow key={p.product_id}>
                                        <TableCell>
                                            {p.product_name || 'N/A'}<br />
                                            <Typography variant="caption" color="textSecondary">
                                                Category: {p.category_name || p.category?.category_name || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            Model: {p.category?.model || 'N/A'}<br />
                                            SKU: {p.category?.sku || 'N/A'}
                                        </TableCell>
                                        <TableCell><code>{p.imei}</code></TableCell>
                                        <TableCell>TSh {parseFloat(p.selling_price).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setItemsDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirmation dialog */}
            <Dialog open={deleteConfirmDialog.open} onClose={() => setDeleteConfirmDialog(prev => ({ ...prev, open: false }))}>
                <DialogTitle>{deleteConfirmDialog.title}</DialogTitle>
                <DialogContent>{deleteConfirmDialog.message}</DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">Confirm</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}