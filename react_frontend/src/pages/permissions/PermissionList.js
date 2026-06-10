import React, { useState, useEffect } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography
} from '@mui/material';
import {
    Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
    Refresh as RefreshIcon, Search as SearchIcon, MoreVert as MoreVertIcon
} from '@mui/icons-material';

import PermissionFormModal from './PermissionFormModal';
import { showSnackbar } from 'utils/snackbar';
import { permissionService } from 'services/permission.service';
import { usePermission } from '@/hooks/usePermission';

const headCells = [
    { id: 'name', label: 'Permission Key' },
    { id: 'display_name', label: 'Display Name' },
    { id: 'description', label: 'Description' },
    { id: 'guard_name', label: 'Guard' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

export default function PermissionsList() {
    const { hasPermission } = usePermission();
    const canView = hasPermission('permissions.view') || hasPermission('roles.assign_permissions');
    const canCreate = hasPermission('permissions.create');
    const canEdit = hasPermission('permissions.edit');
    const canDelete = hasPermission('permissions.delete');

    const [permissions, setPermissions] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const [openModal, setOpenModal] = useState(false);
    const [editingPermission, setEditingPermission] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [selectedPermission, setSelectedPermission] = useState(null);

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });

    const fetchPermissions = async () => {
        setLoading(true);
        try {
            const response = await permissionService.getPermissions({
                page: page + 1,
                per_page: rowsPerPage,
                search: search || undefined,
            });
            if (response.data?.success) {
                const data = response.data.data;
                setPermissions(data.data);
                setTotal(data.total);
            } else {
                setPermissions([]);
                setTotal(0);
            }
        } catch (error) {
            console.error(error);
            showSnackbar({ type: 'error', message: 'Failed to load permissions' });
            setPermissions([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (canView) fetchPermissions();
    }, [page, rowsPerPage, search, canView]);

    const handleMenuOpen = (event, perm) => {
        setSelectedPermission(perm);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => setActionMenu(null);

    const openConfirmDialog = (title, message, actionFn) => {
        setConfirmDialog({ open: true, title, message, action: actionFn });
    };

    const handleDelete = async () => {
        if (!selectedPermission) return;
        handleMenuClose();
        openConfirmDialog(
            'Delete Permission',
            `Are you sure you want to delete "${selectedPermission.display_name}"?`,
            async () => {
                await permissionService.deletePermission(selectedPermission.id);
                showSnackbar({ type: 'success', message: 'Permission deleted' });
                fetchPermissions();
            }
        );
    };

    const handleEdit = () => {
        setEditingPermission(selectedPermission);
        setOpenModal(true);
        handleMenuClose();
    };

    const handleCreate = () => {
        setEditingPermission(null);
        setOpenModal(true);
    };

    const handleModalClose = () => {
        setOpenModal(false);
        setEditingPermission(null);
        fetchPermissions();
    };

    const handleConfirm = async () => {
        if (!confirmDialog.action) return;
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
            await confirmDialog.action();
        } catch (err) {
            showSnackbar({ type: 'error', message: 'Action failed' });
        }
    };

    if (!canView) {
        return <Typography>You do not have permission to view permissions.</Typography>;
    }

    return (
        <Box sx={{ width: '100%', p: 0, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: 1, overflow: 'hidden', boxShadow: 1 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5">Permissions</Typography>
                        {canCreate && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
                                Add Permission
                            </Button>
                        )}
                    </Box>

                    <Box display="flex" gap={2} flexWrap="wrap">
                        <TextField
                            label="Search"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            sx={{ minWidth: 250 }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchPermissions}>
                            Refresh
                        </Button>
                    </Box>
                </Box>

                <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                    <Table sx={{ width: '100%', minWidth: 800 }}>
                        <TableHead>
                            <TableRow>
                                {headCells.map((cell) => (
                                    <TableCell key={cell.id}>{cell.label}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} align="center">Loading...</TableCell></TableRow>
                            ) : permissions.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center">No permissions found</TableCell></TableRow>
                            ) : (
                                permissions.map((perm) => (
                                    <TableRow key={perm.id} hover>
                                        <TableCell><Chip label={perm.name} size="small" /></TableCell>
                                        <TableCell>{perm.display_name}</TableCell>
                                        <TableCell>{perm.description || '-'}</TableCell>
                                        <TableCell>{perm.guard_name}</TableCell>
                                        <TableCell align="center">
                                            <IconButton size="small" onClick={(e) => handleMenuOpen(e, perm)}>
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
                            setRowsPerPage(parseInt(e.target.value));
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

            <PermissionFormModal
                open={openModal}
                onClose={handleModalClose}
                permission={editingPermission}
            />

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