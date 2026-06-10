// src/pages/suppliers/SupplierList.js
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
    Restore as RestoreIcon, Block as BlockIcon, CheckCircle as CheckCircleIcon,
    DeleteSweep as ForceDeleteIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { useSuppliers } from '@/hooks/useSuppliers';
import SupplierModal from './SupplierModal';

const headCells = [
    { id: 'supplier_name', label: 'Supplier Name' },
    { id: 'contact_person', label: 'Contact Person' },
    { id: 'phone', label: 'Phone' },
    { id: 'email', label: 'Email' },
    { id: 'status', label: 'Status' },
    { id: 'created_at', label: 'Created At' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

export default function SupplierList() {
    const { hasPermission } = usePermission();
    const canView = hasPermission('suppliers.view');
    const canCreate = hasPermission('suppliers.create');
    const canEdit = hasPermission('suppliers.edit');
    const canDelete = hasPermission('suppliers.delete');
    const canRestore = hasPermission('suppliers.restore');
    const canForceDelete = hasPermission('suppliers.force_delete');
    const canChangeStatus = hasPermission('suppliers.change_status');

    const { data, total, loading, fetchData, remove, restore, forceDelete, changeStatus } = useSuppliers();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [showDeleted, setShowDeleted] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });

    const fetchSuppliers = useCallback(() => {
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
        fetchSuppliers();
    }, [fetchSuppliers]);

    const handleMenuOpen = (event, supplier) => {
        setSelectedSupplier(supplier);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => {
        setActionMenu(null);
        setSelectedSupplier(null);
    };

    const handleEdit = () => {
        setEditingSupplier(selectedSupplier);
        setModalOpen(true);
        handleMenuClose();
    };

    const handleDelete = () => {
        setConfirmDialog({
            open: true,
            title: 'Delete Supplier',
            message: `Are you sure you want to delete "${selectedSupplier?.supplier_name}"? (Soft delete)`,
            action: async () => {
                try {
                    await remove(selectedSupplier.supplier_id);
                    showSnackbar({ type: 'success', message: 'Supplier deleted successfully' });
                    fetchSuppliers();
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
            title: 'Restore Supplier',
            message: `Are you sure you want to restore "${selectedSupplier?.supplier_name}"?`,
            action: async () => {
                try {
                    await restore(selectedSupplier.supplier_id);
                    showSnackbar({ type: 'success', message: 'Supplier restored successfully' });
                    fetchSuppliers();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Restore failed' });
                }
            }
        });
        handleMenuClose();
    };

    const handleForceDelete = () => {
        setConfirmDialog({
            open: true,
            title: 'Permanently Delete Supplier',
            message: `Are you sure you want to permanently delete "${selectedSupplier?.supplier_name}"? This cannot be undone.`,
            action: async () => {
                try {
                    await forceDelete(selectedSupplier.supplier_id);
                    showSnackbar({ type: 'success', message: 'Supplier permanently deleted' });
                    fetchSuppliers();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Force delete failed' });
                }
            }
        });
        handleMenuClose();
    };

    const handleToggleStatus = () => {
        if (!selectedSupplier) return;
        const newStatus = selectedSupplier.status === 'active' ? 'inactive' : 'active';
        setConfirmDialog({
            open: true,
            title: `${newStatus === 'active' ? 'Activate' : 'Deactivate'} Supplier`,
            message: `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} "${selectedSupplier.supplier_name}"?`,
            action: async () => {
                try {
                    await changeStatus(selectedSupplier.supplier_id, newStatus);
                    showSnackbar({ type: 'success', message: `Supplier ${newStatus}d successfully` });
                    fetchSuppliers();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Status change failed' });
                }
            }
        });
        handleMenuClose();
    };

    const handleModalClose = (refresh) => {
        setModalOpen(false);
        setEditingSupplier(null);
        if (refresh) fetchSuppliers();
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
        return <Typography sx={{ p: 2 }}>You do not have permission to view suppliers.</Typography>;
    }

    const suppliers = Array.isArray(data) ? data : [];

    return (
        <Box sx={{ width: '100%', p: 0, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: 1, overflow: 'hidden', boxShadow: 1 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5">Suppliers</Typography>
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
                                    New Supplier
                                </Button>
                            )}
                        </Box>
                    </Box>
                    <Box display="flex" gap={2} flexWrap="wrap">
                        <TextField
                            label="Search by name, contact or email"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            sx={{ minWidth: 250 }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchSuppliers}>
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
                            ) : suppliers.length === 0 ? (
                                <TableRow><TableCell colSpan={headCells.length} align="center">No suppliers found</TableCell></TableRow>
                            ) : (
                                suppliers.map((supplier) => (
                                    <TableRow key={supplier.supplier_id} hover>
                                        <TableCell>{supplier.supplier_name}</TableCell>
                                        <TableCell>{supplier.contact_person || '-'}</TableCell>
                                        <TableCell>{supplier.phone || '-'}</TableCell>
                                        <TableCell>{supplier.email || '-'}</TableCell>
                                        <TableCell>
                                            {supplier.deleted_at ? (
                                                <Chip label="Deleted" color="error" size="small" />
                                            ) : (
                                                <Chip
                                                    label={supplier.status}
                                                    color={supplier.status === 'active' ? 'success' : supplier.status === 'suspended' ? 'error' : 'default'}
                                                    size="small"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>{new Date(supplier.created_at).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <IconButton size="small" onClick={(e) => handleMenuOpen(e, supplier)}>
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
                {selectedSupplier && !selectedSupplier.deleted_at && canEdit && (
                    <MenuItem onClick={handleEdit}>
                        <EditIcon sx={{ mr: 1 }} /> Edit
                    </MenuItem>
                )}
                {selectedSupplier && !selectedSupplier.deleted_at && canChangeStatus && (
                    <MenuItem onClick={handleToggleStatus}>
                        {selectedSupplier.status === 'active' ? (
                            <><BlockIcon sx={{ mr: 1, color: 'warning.main' }} /> Deactivate</>
                        ) : (
                            <><CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} /> Activate</>
                        )}
                    </MenuItem>
                )}
                {selectedSupplier && selectedSupplier.deleted_at && canRestore && (
                    <MenuItem onClick={handleRestore}>
                        <RestoreIcon sx={{ mr: 1, color: 'success.main' }} /> Restore
                    </MenuItem>
                )}
                {selectedSupplier && selectedSupplier.deleted_at && canForceDelete && (
                    <MenuItem onClick={handleForceDelete} sx={{ color: 'error.main' }}>
                        <ForceDeleteIcon sx={{ mr: 1 }} /> Permanently Delete
                    </MenuItem>
                )}
                {selectedSupplier && !selectedSupplier.deleted_at && canDelete && (
                    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                        <DeleteIcon sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                )}
            </Menu>

            <SupplierModal open={modalOpen} onClose={handleModalClose} supplier={editingSupplier} />

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