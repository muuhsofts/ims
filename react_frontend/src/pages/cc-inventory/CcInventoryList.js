// src/pages/cc-inventory/CcInventoryList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography, CircularProgress, LinearProgress,
    Card, CardContent, Divider, Grid, useMediaQuery, useTheme
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Delete as DeleteIcon, Refresh as RefreshIcon, Search as SearchIcon,
    Visibility as ViewIcon, Receipt as ReceiptIcon, Store as StoreIcon,
    Inventory as InventoryIcon, QrCode as ImeiIcon
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

// Improved Card component for mobile – all details centred and fully visible
const InventoryCard = ({ inventory, canEdit, canDelete, canConfirmReceipt, isOwnedByUser, onEdit, onDelete, onConfirmReceipt, onViewProducts }) => {
    const getStatusChip = (status) => {
        if (!status) return <Chip label="Pending" size="small" color="warning" />;
        if (status === 'arrived') return <Chip label="Arrived" size="small" color="success" />;
        if (status === 'rejected') return <Chip label="Rejected" size="small" color="error" />;
        return <Chip label={status} size="small" />;
    };

    // Format product string for display (used in list)
    const formatProductString = (product) => {
        const name = product.product_name || 'N/A';
        const imei = product.imei || 'N/A';
        return `${name} (IMEI: ${imei})`;
    };

    return (
        <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', textAlign: 'center' }}>
            <CardContent sx={{ p: 2 }}>
                {/* Header: Center Name + Status */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <StoreIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle1" fontWeight="bold">
                            {inventory.collection_center?.cc_name || '—'}
                        </Typography>
                    </Box>
                    {getStatusChip(inventory.cc_inventory_status)}
                </Box>

                <Divider sx={{ my: 1 }} />

                {/* Quantity */}
                <Box display="flex" justifyContent="center" alignItems="center" gap={1} mb={1}>
                    <InventoryIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                        <strong>Quantity:</strong> {inventory.quantity ?? 0}
                    </Typography>
                </Box>

                {/* Products list – full list, scrollable if many */}
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Products ({inventory.products?.length || 0}):
                </Typography>
                <Box sx={{ maxHeight: 150, overflowY: 'auto', bgcolor: 'action.hover', borderRadius: 1, p: 1, mb: 1 }}>
                    {inventory.products && inventory.products.length > 0 ? (
                        inventory.products.map((p, idx) => (
                            <Typography key={p.product_id} variant="caption" display="block" sx={{ py: 0.25, fontFamily: 'monospace' }}>
                                {formatProductString(p)}
                            </Typography>
                        ))
                    ) : (
                        <Typography variant="caption">No products</Typography>
                    )}
                </Box>

                {/* Created date */}
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Created: {new Date(inventory.created_at).toLocaleString()}
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                {/* Action buttons – centred, full width on mobile */}
                <Box display="flex" flexDirection="column" gap={1}>
                    {inventory.products && inventory.products.length > 0 && (
                        <Button fullWidth variant="outlined" startIcon={<ViewIcon />} onClick={() => onViewProducts(inventory.products)}>
                            View All Products
                        </Button>
                    )}
                    {canConfirmReceipt && inventory.cc_inventory_status !== 'arrived' && isOwnedByUser && (
                        <Button fullWidth variant="outlined" color="success" startIcon={<ReceiptIcon />} onClick={() => onConfirmReceipt(inventory)}>
                            Confirm Receipt
                        </Button>
                    )}
                    {canEdit && (
                        <Button fullWidth variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(inventory)}>
                            Edit
                        </Button>
                    )}
                    {canDelete && (
                        <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(inventory)}>
                            Delete
                        </Button>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

export default function CcInventoryList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md')); // Table on medium and up

    const { user, hasPermission } = usePermission();
    const canView = hasPermission('cc_inventory.view') || hasPermission('cc_inventory.view_own');
    const canCreate = hasPermission('cc_inventory.create');
    const canEdit = hasPermission('cc_inventory.edit');
    const canDelete = hasPermission('cc_inventory.delete');
    const canConfirmReceipt = hasPermission('collection_center.confirm_receipt');

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

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [inventoryToConfirm, setInventoryToConfirm] = useState(null);
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
    const isOwnedByUser = (inventory) => inventory?.collection_center?.owner_id === user?.id;

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

    return (
        <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 }, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden', boxShadow: 1 }}>
                {/* Header & Filters */}
                <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={2}>
                        <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                            Collection Center Inventories
                        </Typography>
                        {canCreate && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)} fullWidth={isMobile}>
                                Add Inventory
                            </Button>
                        )}
                    </Box>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                        <TextField
                            label="Search by center"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            sx={{ flex: 1, minWidth: { xs: '100%', sm: 250 } }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchInventories} fullWidth={isMobile}>
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {/* Table or Card View */}
                {showTableView ? (
                    // Desktop Table View (unchanged)
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
                ) : (
                    // Mobile/Tablet Card View (improved)
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                        ) : inventories.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>No inventories found</Paper>
                        ) : (
                            inventories.map((inv) => (
                                <InventoryCard
                                    key={inv.cc_inventory_id}
                                    inventory={inv}
                                    canEdit={canEdit}
                                    canDelete={canDelete}
                                    canConfirmReceipt={canConfirmReceipt}
                                    isOwnedByUser={isOwnedByUser(inv)}
                                    onEdit={() => { setEditingInventory(inv); setModalOpen(true); }}
                                    onDelete={() => { setSelectedInventory(inv); handleDelete(); }}
                                    onConfirmReceipt={handleConfirmReceiptClick}
                                    onViewProducts={handleViewProducts}
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
                        sx={{
                            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }
                        }}
                    />
                </Box>
            </Paper>

            {/* Action Menu (only for table view) */}
            <Menu anchorEl={actionMenu} open={Boolean(actionMenu)} onClose={handleMenuClose}>
                {canConfirmReceipt &&
                    selectedInventory?.cc_inventory_status !== 'arrived' &&
                    isOwnedByUser(selectedInventory) && (
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

            {/* Confirm Receipt Dialog */}
            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ pb: 1 }}>Confirm Receipt</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to confirm receipt for <strong>{inventoryToConfirm?.collection_center?.cc_name}</strong>?
                        This will mark the inventory as <strong>Arrived</strong>.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirmReceipt} variant="contained" color="primary">Confirm</Button>
                </DialogActions>
            </Dialog>

            {/* Progress Dialog */}
            <Dialog open={progressOpen} disableEscapeKeyDown fullWidth maxWidth="xs">
                <DialogTitle>Confirming Receipt...</DialogTitle>
                <DialogContent>
                    <Box sx={{ width: '100%', mt: 2 }}>
                        <LinearProgress variant="determinate" value={progressValue} />
                        <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>{progressValue}%</Typography>
                    </Box>
                </DialogContent>
            </Dialog>

            {/* Products Detail Dialog */}
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

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmDialog.open} onClose={() => setDeleteConfirmDialog(prev => ({ ...prev, open: false }))} fullWidth maxWidth="xs">
                <DialogTitle sx={{ pb: 1 }}>{deleteConfirmDialog.title}</DialogTitle>
                <DialogContent>
                    <Typography>{deleteConfirmDialog.message}</Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setDeleteConfirmDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">Confirm</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}