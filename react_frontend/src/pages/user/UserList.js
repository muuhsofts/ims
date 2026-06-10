import React, { useState, useEffect } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TableSortLabel, TextField, Typography, Switch, FormControlLabel
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Delete as DeleteIcon, VerifiedUser as VerifiedIcon, Block as BlockIcon,
    LockOpen as LockOpenIcon, VpnKey, Email as EmailIcon,
    Refresh as RefreshIcon, Search as SearchIcon, Restore as RestoreIcon,
    DeleteSweep as DeleteSweepIcon
} from '@mui/icons-material';

import UserFormModal from './UserFormModal';
import { showSnackbar } from "utils/snackbar";
import { usePermission } from "@/hooks/usePermission";
import { useUsers } from "context/UserContext";
import { userService } from "services/user.service";

const headCells = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'Phone' },
    { id: 'role', label: 'Role' },
    { id: 'cc', label: 'Collection Center' },    // new column
    { id: 'status', label: 'Status' },
    { id: 'email_verified', label: 'Email Verified' },
    { id: 'created_at', label: 'Created At' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

export default function UsersList() {
    const { items: users, loading, fetchAll, delete: deleteUser, update } = useUsers();
    const { hasPermission } = usePermission();

    const [showDeleted, setShowDeleted] = useState(false);
    const [deletedUsers, setDeletedUsers] = useState([]);
    const [trashedTotal, setTrashedTotal] = useState(0);
    const [loadingDeleted, setLoadingDeleted] = useState(false);

    const [openModal, setOpenModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);

    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('created_at');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const canView = hasPermission('users.view');
    const canCreate = hasPermission('users.create');
    const canEdit = hasPermission('users.edit');
    const canDelete = hasPermission('users.delete');
    const canActivate = hasPermission('users.activate');
    const canDeactivate = hasPermission('users.deactivate');
    const canSuspend = hasPermission('users.suspend');
    const canResetPassword = hasPermission('users.reset_password');
    const canRestore = hasPermission('users.restore');

    useEffect(() => {
        if (!showDeleted) {
            fetchAll({
                page: page + 1,
                per_page: rowsPerPage,
                search,
                status: statusFilter,
                role_id: roleFilter
            });
        }
    }, [page, rowsPerPage, search, statusFilter, roleFilter, showDeleted]);

    useEffect(() => {
        if (showDeleted) {
            fetchDeletedUsers();
        }
    }, [showDeleted, page, rowsPerPage, search]);

    const fetchDeletedUsers = async () => {
        setLoadingDeleted(true);
        try {
            const response = await userService.getTrashedUsers({
                page: page + 1,
                per_page: rowsPerPage,
                search,
            });
            const usersArray = response.data?.data?.data || [];
            const total = response.data?.data?.total || 0;
            setDeletedUsers(usersArray);
            setTrashedTotal(total);
        } catch (error) {
            console.error('Failed to load deleted users', error);
            showSnackbar({ type: 'error', message: 'Failed to load deleted users' });
            setDeletedUsers([]);
            setTrashedTotal(0);
        } finally {
            setLoadingDeleted(false);
        }
    };

    const handleRestoreUser = async (userId) => {
        try {
            await userService.restoreUser(userId);
            showSnackbar({ type: 'success', message: 'User restored successfully' });
            fetchDeletedUsers();
            if (!showDeleted) fetchAll();
        } catch (error) {
            showSnackbar({ type: 'error', message: 'Failed to restore user' });
        }
    };

    const handleForceDelete = async (userId) => {
        try {
            await userService.forceDeleteUser(userId);
            showSnackbar({ type: 'success', message: 'User permanently deleted' });
            fetchDeletedUsers();
        } catch (error) {
            showSnackbar({ type: 'error', message: 'Failed to permanently delete user' });
        }
    };

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleMenuOpen = (event, user) => {
        setSelectedUser(user);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => {
        setActionMenu(null);
    };

    const openConfirmDialog = (title, message, actionFn) => {
        setConfirmDialog({
            open: true,
            title,
            message,
            action: actionFn
        });
    };

    const handleAction = async (actionType) => {
        if (!selectedUser) return;
        handleMenuClose();

        if (showDeleted) {
            switch (actionType) {
                case 'restore':
                    openConfirmDialog(
                        'Restore User',
                        `Are you sure you want to restore ${selectedUser.name}?`,
                        () => handleRestoreUser(selectedUser.id)
                    );
                    break;
                case 'force_delete':
                    openConfirmDialog(
                        'Permanently Delete User',
                        `Are you sure you want to permanently delete ${selectedUser.name}? This cannot be undone.`,
                        () => handleForceDelete(selectedUser.id)
                    );
                    break;
                default:
                    break;
            }
            return;
        }

        switch (actionType) {
            case 'edit':
                setEditingUser(selectedUser);
                setOpenModal(true);
                break;
            case 'activate':
                try {
                    await update(selectedUser.id, { status: 'active' });
                    showSnackbar({ type: 'success', message: 'User activated successfully' });
                    fetchAll();
                } catch (err) {
                    showSnackbar({ type: 'error', message: 'Failed to activate' });
                }
                break;
            case 'deactivate':
                openConfirmDialog(
                    'Deactivate User',
                    `Are you sure you want to deactivate ${selectedUser.name}?`,
                    () => update(selectedUser.id, { status: 'inactive' })
                );
                break;
            case 'suspend':
                openConfirmDialog(
                    'Suspend User',
                    `Are you sure you want to suspend ${selectedUser.name}?`,
                    () => update(selectedUser.id, { status: 'suspended' })
                );
                break;
            case 'delete':
                openConfirmDialog(
                    'Delete User',
                    `Are you sure you want to delete ${selectedUser.name}? (Soft delete)`,
                    () => deleteUser(selectedUser.id)
                );
                break;
            case 'reset_password':
                const newPass = prompt('Enter new password (min 8 characters):');
                if (newPass && newPass.length >= 8) {
                    try {
                        await userService.resetUserPassword(selectedUser.id, newPass, newPass);
                        showSnackbar({ type: 'success', message: 'Password reset successfully' });
                        fetchAll();
                    } catch (err) {
                        showSnackbar({ type: 'error', message: 'Failed to reset password' });
                    }
                } else if (newPass) {
                    showSnackbar({ type: 'error', message: 'Password must be at least 8 characters' });
                }
                break;
            case 'resend_otp':
                try {
                    await userService.resendOtp(selectedUser.id);
                    showSnackbar({ type: 'success', message: 'OTP sent successfully' });
                } catch (err) {
                    showSnackbar({ type: 'error', message: 'Failed to send OTP' });
                }
                break;
            default:
                break;
        }
    };

    const handleConfirm = async () => {
        if (!confirmDialog.action) return;
        setConfirmDialog(prev => ({ ...prev, open: false }));

        try {
            await confirmDialog.action();
            showSnackbar({ type: 'success', message: 'Action completed' });
            if (showDeleted) {
                fetchDeletedUsers();
            } else {
                fetchAll();
            }
        } catch (err) {
            showSnackbar({ type: 'error', message: 'Action failed' });
        }
    };

    if (!canView) return <Typography>You do not have permission to view users.</Typography>;

    const currentData = showDeleted ? deletedUsers : (Array.isArray(users) ? users : []);
    const isLoading = showDeleted ? loadingDeleted : loading;
    const totalCount = showDeleted ? trashedTotal : users.length;

    return (
        <Box sx={{ width: '100%', p: 0, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: 1, overflow: 'hidden', boxShadow: 1 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5">User Management</Typography>
                        <Box display="flex" alignItems="center" gap={2}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={showDeleted}
                                        onChange={(e) => {
                                            setShowDeleted(e.target.checked);
                                            setPage(0);
                                        }}
                                        color="primary"
                                    />
                                }
                                label="Show Deleted Users"
                            />
                            {canCreate && !showDeleted && (
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => { setEditingUser(null); setOpenModal(true); }}
                                >
                                    Add User
                                </Button>
                            )}
                        </Box>
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
                        {!showDeleted && (
                            <>
                                <TextField
                                    select
                                    label="Status"
                                    size="small"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    sx={{ minWidth: 160 }}
                                >
                                    <MenuItem value="">All</MenuItem>
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="inactive">Inactive</MenuItem>
                                    <MenuItem value="pending">Pending</MenuItem>
                                    <MenuItem value="suspended">Suspended</MenuItem>
                                </TextField>
                                <TextField
                                    select
                                    label="Role"
                                    size="small"
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    sx={{ minWidth: 160 }}
                                >
                                    <MenuItem value="">All</MenuItem>
                                    <MenuItem value="32e83b1b-8e99-4870-979f-0196d4371711">ADMINISTRATOR</MenuItem>
                                    <MenuItem value="58b4b59d-b1df-4252-8e27-3ff1ae079195">STOCK_CONTROLLER</MenuItem>
                                    <MenuItem value="85f47df0-1889-461d-8d26-1c0aaae06921">SALES_AGENT</MenuItem>
                                    <MenuItem value="f0ec0b1b-950c-4594-b0cc-65740ee6977f">MANAGER</MenuItem>
                                    <MenuItem value="ad90cac7-3884-4c99-b321-fa256a261c19">BRANCH_OWNER</MenuItem>
                                    <MenuItem value="563a984f-4f6d-40bf-b7f4-b3164461acc2">TBL</MenuItem>
                                </TextField>
                            </>
                        )}
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => showDeleted ? fetchDeletedUsers() : fetchAll()}>
                            Refresh
                        </Button>
                    </Box>
                </Box>

                <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                    <Table sx={{ width: '100%', minWidth: 800 }}>
                        <TableHead>
                            <TableRow>
                                {headCells.map((cell) => (
                                    <TableCell key={cell.id} sx={{ whiteSpace: 'nowrap' }}>
                                        {!cell.disableSort && !showDeleted ? (
                                            <TableSortLabel
                                                active={orderBy === cell.id}
                                                direction={orderBy === cell.id ? order : 'asc'}
                                                onClick={() => handleRequestSort(cell.id)}
                                            >
                                                {cell.label}
                                            </TableSortLabel>
                                        ) : cell.label}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={headCells.length} align="center">Loading...</TableCell></TableRow>
                            ) : currentData.length === 0 ? (
                                <TableRow><TableCell colSpan={headCells.length} align="center">No users found</TableCell></TableRow>
                            ) : (
                                currentData.map((user) => (
                                    <TableRow key={user.id} hover>
                                        <TableCell>{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{user.phone || '-'}</TableCell>
                                        <TableCell>{user.role?.display_name || user.role?.name || '-'}</TableCell>
                                        <TableCell>{user.collection_center?.cc_name || '-'}</TableCell>
                                        <TableCell>
                                            {showDeleted ? (
                                                <Chip label="Deleted" color="error" size="small" />
                                            ) : (
                                                <Chip
                                                    label={user.status}
                                                    color={user.status === 'active' ? 'success' : user.status === 'suspended' ? 'error' : 'default'}
                                                    size="small"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {!showDeleted && (user.email_verified_at ? (
                                                <Chip label="Verified" color="success" size="small" icon={<VerifiedIcon />} />
                                            ) : (
                                                <Chip label="Not Verified" color="default" size="small" />
                                            ))}
                                        </TableCell>
                                        <TableCell>
                                            {showDeleted
                                                ? new Date(user.deleted_at).toLocaleDateString()
                                                : new Date(user.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton size="small" onClick={(e) => handleMenuOpen(e, user)}>
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
                        count={totalCount}
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
                {(() => {
                    const menuItems = [];
                    if (showDeleted) {
                        if (canRestore) {
                            menuItems.push(
                                <MenuItem key="restore" onClick={() => handleAction('restore')}>
                                    <RestoreIcon sx={{ mr: 1, color: 'success.main' }} /> Restore
                                </MenuItem>
                            );
                        }
                        if (canDelete) {
                            menuItems.push(
                                <MenuItem key="force_delete" onClick={() => handleAction('force_delete')} sx={{ color: 'error.main' }}>
                                    <DeleteSweepIcon sx={{ mr: 1 }} /> Permanently Delete
                                </MenuItem>
                            );
                        }
                    } else {
                        if (canEdit) {
                            menuItems.push(
                                <MenuItem key="edit" onClick={() => handleAction('edit')}>
                                    <EditIcon sx={{ mr: 1 }} /> Edit
                                </MenuItem>
                            );
                        }
                        if (canActivate && selectedUser?.status !== 'active') {
                            menuItems.push(
                                <MenuItem key="activate" onClick={() => handleAction('activate')}>
                                    <VerifiedIcon sx={{ mr: 1, color: 'success.main' }} /> Activate
                                </MenuItem>
                            );
                        }
                        if (canDeactivate && selectedUser?.status === 'active') {
                            menuItems.push(
                                <MenuItem key="deactivate" onClick={() => handleAction('deactivate')}>
                                    <BlockIcon sx={{ mr: 1, color: 'warning.main' }} /> Deactivate
                                </MenuItem>
                            );
                        }
                        if (canSuspend && selectedUser?.status !== 'suspended') {
                            menuItems.push(
                                <MenuItem key="suspend" onClick={() => handleAction('suspend')}>
                                    <LockOpenIcon sx={{ mr: 1, color: 'error.main' }} /> Suspend
                                </MenuItem>
                            );
                        }
                        if (canResetPassword) {
                            menuItems.push(
                                <MenuItem key="reset_password" onClick={() => handleAction('reset_password')}>
                                    <VpnKey sx={{ mr: 1 }} /> Reset Password
                                </MenuItem>
                            );
                        }
                        if (!selectedUser?.email_verified_at) {
                            menuItems.push(
                                <MenuItem key="resend_otp" onClick={() => handleAction('resend_otp')}>
                                    <EmailIcon sx={{ mr: 1 }} /> Resend OTP
                                </MenuItem>
                            );
                        }
                        if (canDelete) {
                            menuItems.push(
                                <MenuItem key="delete" onClick={() => handleAction('delete')} sx={{ color: 'error.main' }}>
                                    <DeleteIcon sx={{ mr: 1 }} /> Delete
                                </MenuItem>
                            );
                        }
                    }
                    return menuItems;
                })()}
            </Menu>

            <UserFormModal
                open={openModal}
                onClose={() => { setOpenModal(false); setEditingUser(null); fetchAll(); }}
                user={editingUser}
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