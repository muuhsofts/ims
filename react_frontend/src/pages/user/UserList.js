// src/pages/users/UsersList.js
import React, { useState, useEffect } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TableSortLabel, TextField, Typography, Switch, FormControlLabel,
    useTheme, useMediaQuery, Card, CardContent, Divider, CircularProgress
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Delete as DeleteIcon, VerifiedUser as VerifiedIcon, Block as BlockIcon,
    LockOpen as LockOpenIcon, VpnKey, Email as EmailIcon,
    Refresh as RefreshIcon, Search as SearchIcon, Restore as RestoreIcon,
    DeleteSweep as DeleteSweepIcon, Person as PersonIcon,
    Email as EmailOutlinedIcon, Phone as PhoneIcon,
    Work as WorkIcon, CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

import UserFormModal from './UserFormModal';
import UserVerificationModal from './UserVerificationModal';
import { showSnackbar } from "utils/snackbar";
import { usePermission } from "@/hooks/usePermission";
import { useUsers } from "context/UserContext";
import { userService } from "services/user.service";

const headCells = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'Phone' },
    { id: 'role', label: 'Role' },
    { id: 'status', label: 'Status' },
    { id: 'email_verified', label: 'Email Verified' },
    { id: 'created_at', label: 'Created At' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

export default function UsersList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

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
    const [verifyModalOpen, setVerifyModalOpen] = useState(false);
    const [userToVerify, setUserToVerify] = useState(null);

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
            case 'verify':
                setUserToVerify(selectedUser);
                setVerifyModalOpen(true);
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

    const handleVerifySuccess = () => {
        fetchAll();
        showSnackbar({ type: 'success', message: 'User verified successfully!' });
    };

    if (!canView) return (
        <Box sx={{ p: 2 }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="error">You do not have permission to view users.</Typography>
            </Paper>
        </Box>
    );

    const currentData = showDeleted ? deletedUsers : (Array.isArray(users) ? users : []);
    const isLoading = showDeleted ? loadingDeleted : loading;
    const totalCount = showDeleted ? trashedTotal : users.length;

    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : '-';

    const UserCard = ({ user, isDeletedView }) => {
        const getStatusColor = (status) => {
            switch (status) {
                case 'active': return 'success';
                case 'suspended': return 'error';
                case 'inactive': return 'warning';
                default: return 'default';
            }
        };

        return (
            <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon fontSize="small" color="action" />
                            <Typography variant="body1" fontWeight="medium">
                                {user.name}
                            </Typography>
                        </Box>
                        <IconButton size="small" onClick={(e) => handleMenuOpen(e, user)}>
                            <MoreVertIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <EmailOutlinedIcon fontSize="small" color="action" />
                        <Typography variant="body2">{user.email}</Typography>
                    </Box>

                    {user.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <PhoneIcon fontSize="small" color="action" />
                            <Typography variant="body2">{user.phone}</Typography>
                        </Box>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <WorkIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                            {user.role?.display_name || user.role?.name || '-'}
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {isDeletedView ? (
                                <Chip label="Deleted" color="error" size="small" />
                            ) : (
                                <Chip
                                    label={user.status}
                                    color={getStatusColor(user.status)}
                                    size="small"
                                />
                            )}
                            {!isDeletedView && (
                                user.email_verified_at ? (
                                    <Chip label="Verified" color="success" size="small" icon={<VerifiedIcon />} />
                                ) : (
                                    <Chip label="Not Verified" size="small" />
                                )
                            )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                            Created: {formatDate(user.created_at)}
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    };

    return (
        <Box sx={{ width: '100%', p: { xs: 1, sm: 2 }, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden', boxShadow: { xs: 0, sm: 1 } }}>
                {/* Header */}
                <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                        <Typography variant="h5" fontWeight="600" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                            User Management
                        </Typography>
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
                                        size={isMobile ? "small" : "medium"}
                                    />
                                }
                                label="Show Deleted"
                            />
                            {canCreate && !showDeleted && (
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => { setEditingUser(null); setOpenModal(true); }}
                                    size={isMobile ? "small" : "medium"}
                                    sx={{ borderRadius: 2 }}
                                >
                                    Add User
                                </Button>
                            )}
                        </Box>
                    </Box>

                    <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                        <TextField
                            label="Search"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                            sx={{ minWidth: { xs: '100%', sm: 250 }, flexGrow: { xs: 1, sm: 0 } }}
                        />
                        {!showDeleted && (
                            <>
                                <TextField
                                    select
                                    label="Status"
                                    size="small"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    sx={{ minWidth: { xs: '100%', sm: 140 } }}
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
                                    sx={{ minWidth: { xs: '100%', sm: 160 } }}
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
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={() => showDeleted ? fetchDeletedUsers() : fetchAll()}
                            size={isMobile ? "small" : "medium"}
                        >
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {/* Records: Cards on mobile/tablet, Table on desktop */}
                {showTableView ? (
                    <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                        <Table sx={{ width: '100%', minWidth: 750 }}>
                            <TableHead>
                                <TableRow>
                                    {headCells.map((cell) => (
                                        <TableCell key={cell.id} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
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
                                    <TableRow>
                                        <TableCell colSpan={headCells.length} align="center">
                                            <CircularProgress size={32} sx={{ my: 3 }} />
                                        </TableCell>
                                    </TableRow>
                                ) : currentData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={headCells.length} align="center">
                                            <Typography sx={{ py: 3 }} color="text.secondary">No users found</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    currentData.map((user) => (
                                        <TableRow key={user.id} hover>
                                            <TableCell>{user.name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>{user.phone || '-'}</TableCell>
                                            <TableCell>{user.role?.display_name || user.role?.name || '-'}</TableCell>
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
                                                    <Chip label="Not Verified" size="small" />
                                                ))}
                                            </TableCell>
                                            <TableCell>
                                                {showDeleted
                                                    ? formatDate(user.deleted_at)
                                                    : formatDate(user.created_at)}
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
                ) : (
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {isLoading ? (
                            <Box display="flex" justifyContent="center" py={4}>
                                <CircularProgress />
                            </Box>
                        ) : currentData.length === 0 ? (
                            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                                <Typography color="text.secondary">No users found</Typography>
                            </Paper>
                        ) : (
                            currentData.map((user) => (
                                <UserCard key={user.id} user={user} isDeletedView={showDeleted} />
                            ))
                        )}
                    </Box>
                )}

                {/* Pagination */}
                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: { xs: 1, sm: 0 } }}>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={totalCount}
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
                            },
                            '.MuiTablePagination-actions': {
                                ml: { xs: 0, sm: 1 }
                            }
                        }}
                    />
                </Box>
            </Paper>

            {/* Action Menu */}
            <Menu
                anchorEl={actionMenu}
                open={Boolean(actionMenu)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                {(() => {
                    const menuItems = [];
                    if (showDeleted) {
                        if (canRestore) {
                            menuItems.push(
                                <MenuItem key="restore" onClick={() => handleAction('restore')}>
                                    <RestoreIcon sx={{ mr: 1, color: 'success.main', fontSize: 20 }} /> Restore
                                </MenuItem>
                            );
                        }
                        if (canDelete) {
                            menuItems.push(
                                <MenuItem key="force_delete" onClick={() => handleAction('force_delete')} sx={{ color: 'error.main' }}>
                                    <DeleteSweepIcon sx={{ mr: 1, fontSize: 20 }} /> Permanently Delete
                                </MenuItem>
                            );
                        }
                    } else {
                        if (canEdit) {
                            menuItems.push(
                                <MenuItem key="edit" onClick={() => handleAction('edit')}>
                                    <EditIcon sx={{ mr: 1, fontSize: 20 }} /> Edit
                                </MenuItem>
                            );
                        }
                        if (!selectedUser?.email_verified_at) {
                            menuItems.push(
                                <MenuItem key="verify" onClick={() => handleAction('verify')}>
                                    <CheckCircleIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} /> Verify
                                </MenuItem>
                            );
                        }
                        if (canActivate && selectedUser?.status !== 'active') {
                            menuItems.push(
                                <MenuItem key="activate" onClick={() => handleAction('activate')}>
                                    <VerifiedIcon sx={{ mr: 1, color: 'success.main', fontSize: 20 }} /> Activate
                                </MenuItem>
                            );
                        }
                        if (canDeactivate && selectedUser?.status === 'active') {
                            menuItems.push(
                                <MenuItem key="deactivate" onClick={() => handleAction('deactivate')}>
                                    <BlockIcon sx={{ mr: 1, color: 'warning.main', fontSize: 20 }} /> Deactivate
                                </MenuItem>
                            );
                        }
                        if (canSuspend && selectedUser?.status !== 'suspended') {
                            menuItems.push(
                                <MenuItem key="suspend" onClick={() => handleAction('suspend')}>
                                    <LockOpenIcon sx={{ mr: 1, color: 'error.main', fontSize: 20 }} /> Suspend
                                </MenuItem>
                            );
                        }
                        if (canResetPassword) {
                            menuItems.push(
                                <MenuItem key="reset_password" onClick={() => handleAction('reset_password')}>
                                    <VpnKey sx={{ mr: 1, fontSize: 20 }} /> Reset Password
                                </MenuItem>
                            );
                        }
                        if (!selectedUser?.email_verified_at) {
                            menuItems.push(
                                <MenuItem key="resend_otp" onClick={() => handleAction('resend_otp')}>
                                    <EmailIcon sx={{ mr: 1, fontSize: 20 }} /> Resend OTP
                                </MenuItem>
                            );
                        }
                        if (canDelete) {
                            menuItems.push(
                                <MenuItem key="delete" onClick={() => handleAction('delete')} sx={{ color: 'error.main' }}>
                                    <DeleteIcon sx={{ mr: 1, fontSize: 20 }} /> Delete
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

            <UserVerificationModal
                open={verifyModalOpen}
                onClose={() => {
                    setVerifyModalOpen(false);
                    setUserToVerify(null);
                }}
                user={userToVerify}
                onVerified={handleVerifySuccess}
            />

            <Dialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                fullWidth
                maxWidth="xs"
                PaperProps={{
                    sx: { m: { xs: 2, sm: 0 }, borderRadius: { xs: 2, sm: 1 } }
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>{confirmDialog.title}</DialogTitle>
                <DialogContent>
                    <Typography>{confirmDialog.message}</Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button onClick={handleConfirm} color="error" variant="contained">Confirm</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}