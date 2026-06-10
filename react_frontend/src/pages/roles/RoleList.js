// src/pages/roles/RoleList.js
import React, { useState, useEffect } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography
} from '@mui/material';
import {
    Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
    Refresh as RefreshIcon, Search as SearchIcon, MoreVert as MoreVertIcon,
    VpnKey as PermissionsIcon
} from '@mui/icons-material';

import RoleFormModal from './RoleFormModal';
import RolePermissionsModal from './RolePermissionsModal';
import { showSnackbar } from 'utils/snackbar';
import { roleService } from 'services/role.service';
import { usePermission } from '@/hooks/usePermission';

const headCells = [
    { id: 'name', label: 'Role Name' },
    { id: 'display_name', label: 'Display Name' },
    { id: 'description', label: 'Description' },
    { id: 'guard_name', label: 'Guard' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

export default function RoleList() {
    const { hasPermission } = usePermission();
    const canView = hasPermission('roles.view');
    const canCreate = hasPermission('roles.create');
    const canEdit = hasPermission('roles.edit');
    const canDelete = hasPermission('roles.delete');
    const canAssignPermissions = hasPermission('roles.assign_permissions');

    const [roles, setRoles] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const [openFormModal, setOpenFormModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [openPermissionsModal, setOpenPermissionsModal] = useState(false);
    const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState(null);

    const [actionMenu, setActionMenu] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const response = await roleService.getRoles({
                page: page + 1,
                per_page: rowsPerPage,
                search: search || undefined,
            });
            if (response.data?.success) {
                const data = response.data.data;
                setRoles(data.data);
                setTotal(data.total);
            } else {
                setRoles([]);
                setTotal(0);
            }
        } catch (error) {
            console.error(error);
            showSnackbar({ type: 'error', message: 'Failed to load roles' });
            setRoles([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (canView) fetchRoles();
    }, [page, rowsPerPage, search, canView]);

    const handleMenuOpen = (event, role) => {
        setSelectedRole(role);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => setActionMenu(null);

    const openConfirmDialog = (title, message, actionFn) => {
        setConfirmDialog({ open: true, title, message, action: actionFn });
    };

    const handleDelete = async () => {
        if (!selectedRole) return;
        handleMenuClose();
        openConfirmDialog(
            'Delete Role',
            `Are you sure you want to delete "${selectedRole.display_name}"?`,
            async () => {
                await roleService.deleteRole(selectedRole.id);
                showSnackbar({ type: 'success', message: 'Role deleted' });
                fetchRoles();
            }
        );
    };

    const handleEdit = () => {
        setEditingRole(selectedRole);
        setOpenFormModal(true);
        handleMenuClose();
    };

    const handlePermissions = () => {
        setSelectedRoleForPermissions(selectedRole);
        setOpenPermissionsModal(true);
        handleMenuClose();
    };

    const handleCreate = () => {
        setEditingRole(null);
        setOpenFormModal(true);
    };

    const handleFormModalClose = () => {
        setOpenFormModal(false);
        setEditingRole(null);
        fetchRoles();
    };

    const handlePermissionsModalClose = () => {
        setOpenPermissionsModal(false);
        setSelectedRoleForPermissions(null);
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
        return <Typography>You do not have permission to view roles.</Typography>;
    }

    return (
        <Box sx={{ width: '100%', p: 0, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: 1, overflow: 'hidden', boxShadow: 1 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5">Roles</Typography>
                        {canCreate && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
                                Add Role
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
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchRoles}>
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
                            ) : roles.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center">No roles found</TableCell></TableRow>
                            ) : (
                                roles.map((role) => (
                                    <TableRow key={role.id} hover>
                                        <TableCell><Chip label={role.name} size="small" /></TableCell>
                                        <TableCell>{role.display_name}</TableCell>
                                        <TableCell>{role.description || '-'}</TableCell>
                                        <TableCell>{role.guard_name}</TableCell>
                                        <TableCell align="center">
                                            <IconButton size="small" onClick={(e) => handleMenuOpen(e, role)}>
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

            {/* Action Menu */}
            <Menu anchorEl={actionMenu} open={Boolean(actionMenu)} onClose={handleMenuClose}>
                {canEdit && (
                    <MenuItem onClick={handleEdit}>
                        <EditIcon sx={{ mr: 1 }} /> Edit
                    </MenuItem>
                )}
                {canAssignPermissions && (
                    <MenuItem onClick={handlePermissions}>
                        <PermissionsIcon sx={{ mr: 1 }} /> Assign Permissions
                    </MenuItem>
                )}
                {canDelete && (
                    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                        <DeleteIcon sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                )}
            </Menu>

            {/* Role Form Modal */}
            <RoleFormModal
                open={openFormModal}
                onClose={handleFormModalClose}
                role={editingRole}
            />

            {/* Permissions Assignment Modal */}
            {selectedRoleForPermissions && (
                <RolePermissionsModal
                    open={openPermissionsModal}
                    onClose={handlePermissionsModalClose}
                    role={selectedRoleForPermissions}
                />
            )}

            {/* Confirmation Dialog */}
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