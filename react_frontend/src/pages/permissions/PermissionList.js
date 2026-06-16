// src/pages/permissions/PermissionsList.js
import React, { useState, useEffect } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, Menu, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography, useTheme, useMediaQuery, Card, CardContent, Divider, Tooltip, CircularProgress } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Refresh as RefreshIcon, Search as SearchIcon, MoreVert as MoreVertIcon, Label as LabelIcon, Shield as ShieldIcon, Description as DescriptionIcon } from '@mui/icons-material';
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

    const { hasPermission } = usePermission();
    const canView = hasPermission('permissions.view') || hasPermission('roles.assign_permissions');
    const canCreate = hasPermission('permissions.create');
    const canEdit = hasPermission('permissions.edit');

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
    const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', action: null });

    const fetchPermissions = async () => {
        setLoading(true);
        try {
            const response = await permissionService.getPermissions({
                page: page + 1,
                per_page: rowsPerPage,
                search: search || undefined
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
        return (
            <Box sx={{ p: 2 }}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="error">You do not have permission to view permissions.</Typography>
                </Paper>
            </Box>
        );
    }

    // Card component for mobile/tablet view
    const PermissionCard = ({ permission }) => (
        <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Chip
                        label={permission.name}
                        size="small"
                        icon={<LabelIcon />}
                        sx={{ maxWidth: 'calc(100% - 40px)', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                    />
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, permission)} sx={{ ml: 1 }}>
                        <MoreVertIcon fontSize="small" />
                    </IconButton>
                </Box>
                <Typography variant="body1" fontWeight="medium" sx={{ mb: 0.5 }}>
                    {permission.display_name}
                </Typography>
                {permission.description && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                        <DescriptionIcon fontSize="small" color="action" sx={{ mt: 0.2 }} />
                        <Typography variant="body2" color="text.secondary">
                            {permission.description}
                        </Typography>
                    </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ShieldIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                        Guard: {permission.guard_name}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ width: '100%', p: { xs: 1, sm: 2 }, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden', boxShadow: { xs: 0, sm: 1 } }}>
                {/* Header */}
                <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                        <Typography variant="h5" fontWeight="600" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                            Permissions
                        </Typography>
                        {canCreate && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleCreate}
                                size={isMobile ? "small" : "medium"}
                                sx={{ borderRadius: 2 }}
                            >
                                Add Permission
                            </Button>
                        )}
                    </Box>
                    <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                        <TextField
                            label="Search"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                            }}
                            sx={{ minWidth: { xs: '100%', sm: 250 }, flexGrow: { xs: 1, sm: 0 } }}
                        />
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={fetchPermissions}
                            size={isMobile ? "small" : "medium"}
                        >
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {/* Records: Cards on mobile/tablet, Table on desktop */}
                {showTableView ? (
                    <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                        <Table sx={{ width: '100%', minWidth: 800 }}>
                            <TableHead>
                                <TableRow>
                                    {headCells.map((cell) => (
                                        <TableCell key={cell.id} sx={{ fontWeight: 'bold' }}>
                                            {cell.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            <CircularProgress size={32} sx={{ my: 3 }} />
                                        </TableCell>
                                    </TableRow>
                                ) : permissions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            <Typography sx={{ py: 3 }} color="text.secondary">No permissions found</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    permissions.map((perm) => (
                                        <TableRow key={perm.id} hover>
                                            <TableCell><Chip label={perm.name} size="small" /></TableCell>
                                            <TableCell>{perm.display_name}</TableCell>
                                            <TableCell sx={{ maxWidth: 300, wordBreak: 'break-word' }}>{perm.description || '-'}</TableCell>
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
                ) : (
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}>
                                <CircularProgress />
                            </Box>
                        ) : permissions.length === 0 ? (
                            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                                <Typography color="text.secondary">No permissions found</Typography>
                            </Paper>
                        ) : (
                            permissions.map((perm) => <PermissionCard key={perm.id} permission={perm} />)
                        )}
                    </Box>
                )}

                {/* Pagination */}
                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: { xs: 1, sm: 0 } }}>
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

            {/* Action Menu */}
            <Menu
                anchorEl={actionMenu}
                open={Boolean(actionMenu)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                {canEdit && (
                    <MenuItem onClick={handleEdit}>
                        <EditIcon sx={{ mr: 1, fontSize: 20 }} /> Edit
                    </MenuItem>
                )}
            </Menu>

            <PermissionFormModal open={openModal} onClose={handleModalClose} permission={editingPermission} />

            {/* Confirmation Dialog (kept for future use) */}
            <Dialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                fullWidth
                maxWidth="xs"
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