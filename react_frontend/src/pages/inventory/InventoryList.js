// src/pages/inventory/InventoryList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography, CircularProgress, Card, CardContent,
    Divider, useMediaQuery, useTheme, Grid
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Delete as DeleteIcon, Refresh as RefreshIcon, Search as SearchIcon,
    Warehouse as WarehouseIcon, Inventory as InventoryIcon, Person as PersonIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { useInventory } from '@/hooks/useInventory';
import InventoryModal from './InventoryModal';

const headCells = [
    { id: 'warehouse', label: 'Warehouse' },
    { id: 'products', label: 'Products' },
    { id: 'quantity', label: 'Quantity' },
    { id: 'created_by', label: 'Created By' },
    { id: 'created_at', label: 'Created At' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

// Helper for product label (no color, uses product.sku directly)
const getProductLabel = (product) => {
    const productName = product.product_name || 'N/A';
    const category = product.category_name || product.category?.category_name || 'N/A';
    const model = product.category?.model || 'N/A';
    const sku = product.sku || 'N/A';
    const imei = product.imei || 'N/A';
    return `Product: ${productName} | Category: ${category} | Model: ${model} | SKU: ${sku} | IMEI: ${imei}`;
};

// Card component for mobile/tablet view
const InventoryCard = ({ inventory, canEdit, canDelete, onEdit, onDelete }) => {
    return (
        <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
            <CardContent sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <WarehouseIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle1" fontWeight="bold">
                            {inventory.warehouse?.name || '—'}
                        </Typography>
                    </Box>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(inventory); }}>
                        <MoreVertIcon />
                    </IconButton>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <InventoryIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                        <strong>Quantity:</strong> {inventory.quantity ?? 0}
                    </Typography>
                </Box>

                <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Products ({inventory.products?.length || 0}):
                </Typography>
                <Box sx={{ maxHeight: 120, overflowY: 'auto', bgcolor: 'action.hover', borderRadius: 1, p: 1, mb: 1 }}>
                    {inventory.products && inventory.products.length > 0 ? (
                        inventory.products.map((p, idx) => (
                            <Typography key={p.product_id} variant="caption" display="block" sx={{ py: 0.25, fontFamily: 'monospace' }}>
                                {getProductLabel(p)}
                            </Typography>
                        ))
                    ) : (
                        <Typography variant="caption">No products</Typography>
                    )}
                </Box>

                <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                        <strong>Created By:</strong> {inventory.created_by_user?.name || '-'}
                    </Typography>
                </Box>

                <Typography variant="caption" color="text.secondary" display="block">
                    Created: {new Date(inventory.created_at).toLocaleString()}
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                <Box display="flex" justifyContent="flex-end" gap={1}>
                    {canEdit && (
                        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(inventory)}>
                            Edit
                        </Button>
                    )}
                    {canDelete && (
                        <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(inventory)}>
                            Delete
                        </Button>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

export default function InventoryList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md')); // Table on medium and up

    const { hasPermission } = usePermission();
    const canView = hasPermission('inventory.view');
    const canCreate = hasPermission('inventory.create');
    const canEdit = hasPermission('inventory.edit');
    const canDelete = hasPermission('inventory.delete');

    const { data, total, loading, fetchData, remove } = useInventory();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingInventory, setEditingInventory] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [selectedInventory, setSelectedInventory] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });

    const fetchInventory = useCallback(() => {
        if (!canView) return;
        const params = {
            page: page + 1,
            per_page: rowsPerPage,
            search: search || undefined,
        };
        fetchData(params);
    }, [page, rowsPerPage, search, canView, fetchData]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const handleMenuOpen = (event, inventory) => {
        setSelectedInventory(inventory);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => {
        setActionMenu(null);
        setSelectedInventory(null);
    };

    const handleEdit = () => {
        setEditingInventory(selectedInventory);
        setModalOpen(true);
        handleMenuClose();
    };

    const handleDelete = () => {
        setConfirmDialog({
            open: true,
            title: 'Delete Inventory',
            message: `Are you sure you want to delete this inventory record?`,
            action: async () => {
                try {
                    await remove(selectedInventory.inventory_id);
                    showSnackbar({ type: 'success', message: 'Inventory deleted' });
                    fetchInventory();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Delete failed' });
                }
            }
        });
        handleMenuClose();
    };

    const handleModalClose = (refresh) => {
        setModalOpen(false);
        setEditingInventory(null);
        if (refresh) fetchInventory();
    };

    const handleConfirm = async () => {
        if (!confirmDialog.action) return;
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
            await confirmDialog.action();
        } catch {
            // error already handled
        }
    };

    // Card-specific handlers
    const handleCardEdit = (inventory) => {
        setEditingInventory(inventory);
        setModalOpen(true);
    };

    const handleCardDelete = (inventory) => {
        setSelectedInventory(inventory);
        handleDelete();
    };

    if (!canView) {
        return <Typography sx={{ p: 2 }}>You do not have permission to view inventory.</Typography>;
    }

    const inventories = Array.isArray(data) ? data : [];

    return (
        <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 }, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden', boxShadow: 1 }}>
                {/* Header & Filters */}
                <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={2}>
                        <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                            Inventory Records
                        </Typography>
                        {canCreate && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)} fullWidth={isMobile}>
                                Add Inventory
                            </Button>
                        )}
                    </Box>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                        <TextField
                            label="Search by warehouse"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            sx={{ flex: 1, minWidth: { xs: '100%', sm: 250 } }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchInventory} fullWidth={isMobile}>
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {/* Table or Card View */}
                {showTableView ? (
                    // Desktop Table View
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
                                    <TableRow><TableCell colSpan={headCells.length} align="center">No inventory records found</TableCell></TableRow>
                                ) : (
                                    inventories.map((inv) => (
                                        <TableRow key={inv.inventory_id} hover>
                                            <TableCell>{inv.warehouse?.name || '-'}</TableCell>
                                            <TableCell>
                                                {inv.products && inv.products.length > 0 ? (
                                                    <Box>
                                                        {inv.products.map(p => (
                                                            <Chip
                                                                key={p.product_id}
                                                                label={getProductLabel(p)}
                                                                size="small"
                                                                sx={{ m: 0.3, maxWidth: '100%', height: 'auto', whiteSpace: 'normal' }}
                                                            />
                                                        ))}
                                                    </Box>
                                                ) : (
                                                    <Typography variant="caption">No products</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>{inv.quantity ?? 0}</TableCell>
                                            <TableCell>{inv.created_by_user?.name || '-'}</TableCell>
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
                    // Mobile/Tablet Card View
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                        ) : inventories.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>No inventory records found</Paper>
                        ) : (
                            inventories.map((inv) => (
                                <InventoryCard
                                    key={inv.inventory_id}
                                    inventory={inv}
                                    canEdit={canEdit}
                                    canDelete={canDelete}
                                    onEdit={handleCardEdit}
                                    onDelete={handleCardDelete}
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

            <InventoryModal open={modalOpen} onClose={handleModalClose} inventory={editingInventory} />

            {/* Delete Confirmation Dialog */}
            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))} fullWidth maxWidth="xs">
                <DialogTitle sx={{ pb: 1 }}>{confirmDialog.title}</DialogTitle>
                <DialogContent><Typography>{confirmDialog.message}</Typography></DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button onClick={handleConfirm} color="error" variant="contained">Confirm</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}