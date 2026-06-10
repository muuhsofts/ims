// src/pages/inventory/InventoryList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography, CircularProgress
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Delete as DeleteIcon, Refresh as RefreshIcon, Search as SearchIcon
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

export default function InventoryList() {
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

    if (!canView) {
        return <Typography sx={{ p: 2 }}>You do not have permission to view inventory.</Typography>;
    }

    const inventories = Array.isArray(data) ? data : [];

    // Updated helper: no color, using product.sku directly
    const getProductLabel = (product) => {
        const productName = product.product_name || 'N/A';
        const category = product.category_name || product.category?.category_name || 'N/A';
        const model = product.category?.model || 'N/A';
        const sku = product.sku || 'N/A';          // from product's own column
        const imei = product.imei || 'N/A';
        return `Product: ${productName} | Category: ${category} | Model: ${model} | SKU: ${sku} | IMEI: ${imei}`;
    };

    return (
        <Box sx={{ width: '100%', p: 0, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: 1, overflow: 'hidden', boxShadow: 1 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5">Inventory Records</Typography>
                        {canCreate && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>
                                Add Inventory
                            </Button>
                        )}
                    </Box>
                    <Box display="flex" gap={2} flexWrap="wrap">
                        <TextField
                            label="Search by warehouse"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            sx={{ minWidth: 250 }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchInventory}>
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
                {canDelete && (
                    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                        <DeleteIcon sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                )}
            </Menu>

            <InventoryModal open={modalOpen} onClose={handleModalClose} inventory={editingInventory} />

            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
                <DialogTitle>{confirmDialog.title}</DialogTitle>
                <DialogContent>{confirmDialog.message}</DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button onClick={handleConfirm} color="error" variant="contained">Confirm</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}