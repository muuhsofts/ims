// src/pages/collection-centers/CollectionCenterList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography, CircularProgress, Switch, FormControlLabel
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Delete as DeleteIcon, Refresh as RefreshIcon, Search as SearchIcon, Restore as RestoreIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { useCollectionCenters } from '@/hooks/useCollectionCenters';
import CollectionCenterModal from './CollectionCenterModal';

const headCells = [
    { id: 'cc_name', label: 'Center Name' },
    { id: 'location', label: 'Location' },
    { id: 'owner', label: 'Owner' },
    { id: 'status', label: 'Status' },
    { id: 'created_at', label: 'Created At' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

export default function CollectionCenterList() {
    const { hasPermission } = usePermission();
    const canView = hasPermission('collection_centers.view');
    const canCreate = hasPermission('collection_centers.create');
    const canEdit = hasPermission('collection_centers.edit');
    const canDelete = hasPermission('collection_centers.delete');
    const canRestore = hasPermission('collection_centers.restore');

    const { data, total, loading, fetchData, remove, restore } = useCollectionCenters();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [showDeleted, setShowDeleted] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCenter, setEditingCenter] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [selectedCenter, setSelectedCenter] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });

    const fetchCenters = useCallback(() => {
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
        fetchCenters();
    }, [fetchCenters]);

    const handleMenuOpen = (event, center) => {
        setSelectedCenter(center);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => {
        setActionMenu(null);
        setSelectedCenter(null);
    };

    const handleEdit = () => {
        setEditingCenter(selectedCenter);
        setModalOpen(true);
        handleMenuClose();
    };

    const handleDelete = () => {
        setConfirmDialog({
            open: true,
            title: 'Delete Center',
            message: `Are you sure you want to delete "${selectedCenter?.cc_name}"? (Soft delete)`,
            action: async () => {
                try {
                    await remove(selectedCenter.cc_id);
                    showSnackbar({ type: 'success', message: 'Center deleted successfully' });
                    fetchCenters();
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
            title: 'Restore Center',
            message: `Are you sure you want to restore "${selectedCenter?.cc_name}"?`,
            action: async () => {
                try {
                    await restore(selectedCenter.cc_id);
                    showSnackbar({ type: 'success', message: 'Center restored successfully' });
                    fetchCenters();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Restore failed' });
                }
            }
        });
        handleMenuClose();
    };

    const handleModalClose = (refresh) => {
        setModalOpen(false);
        setEditingCenter(null);
        if (refresh) fetchCenters();
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
        return <Typography sx={{ p: 2 }}>You do not have permission to view collection centers.</Typography>;
    }

    const centers = Array.isArray(data) ? data : [];

    return (
        <Box sx={{ width: '100%', p: 0, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: 1, overflow: 'hidden', boxShadow: 1 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5">Collection Centers</Typography>
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
                                    New Center
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
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchCenters}>
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
                            ) : centers.length === 0 ? (
                                <TableRow><TableCell colSpan={headCells.length} align="center">No centers found</TableCell></TableRow>
                            ) : (
                                centers.map((center) => (
                                    <TableRow key={center.cc_id} hover>
                                        <TableCell>{center.cc_name}</TableCell>
                                        <TableCell>{center.location || '-'}</TableCell>
                                        <TableCell>{center.owner?.name || '-'}</TableCell>
                                        <TableCell>
                                            {center.deleted_at ? (
                                                <Chip label="Deleted" color="error" size="small" />
                                            ) : (
                                                <Chip
                                                    label={center.status}
                                                    color={center.status === 'active' ? 'success' : center.status === 'on_maintenance' ? 'warning' : 'default'}
                                                    size="small"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>{new Date(center.created_at).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <IconButton size="small" onClick={(e) => handleMenuOpen(e, center)}>
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
                {selectedCenter && !selectedCenter.deleted_at && canEdit && (
                    <MenuItem onClick={handleEdit}>
                        <EditIcon sx={{ mr: 1 }} /> Edit
                    </MenuItem>
                )}
                {selectedCenter && selectedCenter.deleted_at && canRestore && (
                    <MenuItem onClick={handleRestore}>
                        <RestoreIcon sx={{ mr: 1, color: 'success.main' }} /> Restore
                    </MenuItem>
                )}
                {selectedCenter && !selectedCenter.deleted_at && canDelete && (
                    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                        <DeleteIcon sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                )}
            </Menu>

            <CollectionCenterModal open={modalOpen} onClose={handleModalClose} center={editingCenter} />

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