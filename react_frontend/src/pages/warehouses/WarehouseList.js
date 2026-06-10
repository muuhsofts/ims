// src/pages/warehouses/WarehouseList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography, CircularProgress, Switch, FormControlLabel
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Delete as DeleteIcon, Refresh as RefreshIcon, Search as SearchIcon,
    Restore as RestoreIcon, Block as BlockIcon, CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { useWarehouses } from '@/hooks/useWarehouses';
import WarehouseModal from './WarehouseModal';

const headCells = [
    { id: 'name', label: 'Warehouse Name' },
    { id: 'location', label: 'Location' },
    { id: 'manager', label: 'Manager' },
    { id: 'status', label: 'Status' },
    { id: 'created_at', label: 'Created At' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

export default function WarehouseList() {
    const { hasPermission } = usePermission();
    const canView = hasPermission('warehouses.view');
    const canCreate = hasPermission('warehouses.create');
    const canEdit = hasPermission('warehouses.edit');
    const canDelete = hasPermission('warehouses.delete');
    const canRestore = hasPermission('warehouses.restore');
    const canChangeStatus = hasPermission('warehouses.change_status');

    const { data, total, loading, fetchData, remove, restore, changeStatus } = useWarehouses();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [showDeleted, setShowDeleted] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });

    const fetchWarehouses = useCallback(() => {
        if (!canView) return;
        const params = {
            page: page + 1,
            per_page: rowsPerPage,
            search: search || undefined,
            trashed: showDeleted ? true : undefined,
        };
        fetchData(params);
    }, [page, rowsPerPage, search, showDeleted, canView, fetchData]);

    useEffect(() => {
        fetchWarehouses();
    }, [fetchWarehouses]);

    const handleMenuOpen = (event, warehouse) => {
        setSelectedWarehouse(warehouse);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => {
        setActionMenu(null);
        setSelectedWarehouse(null);
    };

    const handleEdit = () => {
        setEditingWarehouse(selectedWarehouse);
        setModalOpen(true);
        handleMenuClose();
    };

    const handleDelete = () => {
        setConfirmDialog({
            open: true,
            title: 'Delete Warehouse',
            message: `Are you sure you want to delete "${selectedWarehouse?.name}"? (Soft delete)`,
            action: async () => {
                try {
                    await remove(selectedWarehouse.warehouse_id);
                    showSnackbar({ type: 'success', message: 'Warehouse deleted successfully' });
                    fetchWarehouses();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Delete failed' });
                }
            }
        });
        handleMenuClose();
    };

    const handleRestore = () => {
        setConfirmDialog({
            open: true,
            title: 'Restore Warehouse',
            message: `Are you sure you want to restore "${selectedWarehouse?.name}"?`,
            action: async () => {
                try {
                    await restore(selectedWarehouse.warehouse_id);
                    showSnackbar({ type: 'success', message: 'Warehouse restored successfully' });
                    fetchWarehouses();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Restore failed' });
                }
            }
        });
        handleMenuClose();
    };

    const handleToggleStatus = () => {
        if (!selectedWarehouse) return;
        const newStatus = selectedWarehouse.status === 'active' ? 'inactive' : 'active';
        setConfirmDialog({
            open: true,
            title: `${newStatus === 'active' ? 'Activate' : 'Deactivate'} Warehouse`,
            message: `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} "${selectedWarehouse.name}"?`,
            action: async () => {
                try {
                    await changeStatus(selectedWarehouse.warehouse_id, newStatus);
                    showSnackbar({ type: 'success', message: `Warehouse ${newStatus}d successfully` });
                    fetchWarehouses();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Status change failed' });
                }
            }
        });
        handleMenuClose();
    };

    const handleModalClose = (refresh) => {
        setModalOpen(false);
        setEditingWarehouse(null);
        if (refresh) fetchWarehouses();
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
        return <Typography sx={{ p: 2 }}>You do not have permission to view warehouses.</Typography>;
    }

    const warehouses = Array.isArray(data) ? data : [];

    return (
        <Box sx={{ width: '100%', p: 0, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: 1, overflow: 'hidden', boxShadow: 1 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5">Warehouses</Typography>
                        <Box display="flex" alignItems="center" gap={2}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={showDeleted}
                                        onChange={(e) => setShowDeleted(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Show Deleted"
                            />
                            {canCreate && !showDeleted && (
                                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>
                                    New Warehouse
                                </Button>
                            )}
                        </Box>
                    </Box>
                    <Box display="flex" gap={2} flexWrap="wrap">
                        <TextField
                            label="Search by name or location"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            sx={{ minWidth: 250 }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchWarehouses}>
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
                            ) : warehouses.length === 0 ? (
                                <TableRow><TableCell colSpan={headCells.length} align="center">No warehouses found</TableCell></TableRow>
                            ) : (
                                warehouses.map((warehouse) => (
                                    <TableRow key={warehouse.warehouse_id} hover>
                                        <TableCell>{warehouse.name}</TableCell>
                                        <TableCell>{warehouse.location || '-'}</TableCell>
                                        <TableCell>{warehouse.manager?.name || '-'}</TableCell>
                                        <TableCell>
                                            {warehouse.deleted_at ? (
                                                <Chip label="Deleted" color="error" size="small" />
                                            ) : (
                                                <Chip
                                                    label={warehouse.status}
                                                    color={warehouse.status === 'active' ? 'success' : warehouse.status === 'maintenance' ? 'warning' : 'default'}
                                                    size="small"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>{new Date(warehouse.created_at).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <IconButton size="small" onClick={(e) => handleMenuOpen(e, warehouse)}>
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
                {selectedWarehouse && !selectedWarehouse.deleted_at && canEdit && (
                    <MenuItem onClick={handleEdit}>
                        <EditIcon sx={{ mr: 1 }} /> Edit
                    </MenuItem>
                )}
                {selectedWarehouse && !selectedWarehouse.deleted_at && canChangeStatus && (
                    <MenuItem onClick={handleToggleStatus}>
                        {selectedWarehouse.status === 'active' ? (
                            <><BlockIcon sx={{ mr: 1, color: 'warning.main' }} /> Deactivate</>
                        ) : (
                            <><CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} /> Activate</>
                        )}
                    </MenuItem>
                )}
                {selectedWarehouse && selectedWarehouse.deleted_at && canRestore && (
                    <MenuItem onClick={handleRestore}>
                        <RestoreIcon sx={{ mr: 1, color: 'success.main' }} /> Restore
                    </MenuItem>
                )}
                {selectedWarehouse && !selectedWarehouse.deleted_at && canDelete && (
                    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                        <DeleteIcon sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                )}
            </Menu>

            <WarehouseModal open={modalOpen} onClose={handleModalClose} warehouse={editingWarehouse} />

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