// src/pages/suppliers/SupplierList.js
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, Menu, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography, CircularProgress, Switch, FormControlLabel, Card, CardContent, Divider, useMediaQuery, useTheme } from '@mui/material';
import { Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon, Refresh as RefreshIcon, Search as SearchIcon, Restore as RestoreIcon, Block as BlockIcon, CheckCircle as CheckCircleIcon, Business as SupplierIcon, Person as PersonIcon, Phone as PhoneIcon, Email as EmailIcon, CalendarToday as CalendarIcon } from '@mui/icons-material';
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

    const { hasPermission } = usePermission();
    const canView = hasPermission('suppliers.view');
    const canCreate = hasPermission('suppliers.create');
    const canEdit = hasPermission('suppliers.edit');
    const canRestore = hasPermission('suppliers.restore');
    const canChangeStatus = hasPermission('suppliers.change_status');

    const { data, total, loading, fetchData, restore, changeStatus } = useSuppliers();

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

    // Direct handlers for card view
    const handleEditSupplier = (supplier) => {
        setEditingSupplier(supplier);
        setModalOpen(true);
        if (actionMenu) handleMenuClose();
    };

    const handleRestoreSupplier = (supplier) => {
        const supplierId = supplier.supplier_id;
        if (!supplierId) return;
        setConfirmDialog({
            open: true,
            title: 'Restore Supplier',
            message: `Are you sure you want to restore "${supplier.supplier_name}"?`,
            action: async () => {
                try {
                    await restore(supplierId);
                    showSnackbar({ type: 'success', message: 'Supplier restored successfully' });
                    fetchSuppliers();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Restore failed' });
                }
            }
        });
        if (actionMenu) handleMenuClose();
    };

    const handleToggleStatusSupplier = (supplier) => {
        const newStatus = supplier.status === 'active' ? 'inactive' : 'active';
        setConfirmDialog({
            open: true,
            title: `${newStatus === 'active' ? 'Activate' : 'Deactivate'} Supplier`,
            message: `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} "${supplier.supplier_name}"?`,
            action: async () => {
                try {
                    await changeStatus(supplier.supplier_id, newStatus);
                    showSnackbar({ type: 'success', message: `Supplier ${newStatus}d successfully` });
                    fetchSuppliers();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Status change failed' });
                }
            }
        });
        if (actionMenu) handleMenuClose();
    };

    // Wrappers for table view
    const handleEditFromTable = () => {
        if (selectedSupplier) handleEditSupplier(selectedSupplier);
    };

    const handleRestoreFromTable = () => {
        if (selectedSupplier) handleRestoreSupplier(selectedSupplier);
    };

    const handleToggleStatusFromTable = () => {
        if (selectedSupplier) handleToggleStatusSupplier(selectedSupplier);
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

    // Card component for mobile/tablet view
    const SupplierCard = ({ supplier, canEdit, canChangeStatus, canRestore, onEdit, onRestore, onToggleStatus }) => {
        const isDeleted = !!supplier.deleted_at;
        return (
            <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <CardContent sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <SupplierIcon fontSize="small" color="primary" />
                            <Typography variant="subtitle1" fontWeight="bold">
                                {supplier.supplier_name}
                            </Typography>
                        </Box>
                        {isDeleted ? (
                            <Chip label="Deleted" color="error" size="small" />
                        ) : (
                            <Chip
                                label={supplier.status}
                                color={supplier.status === 'active' ? 'success' : supplier.status === 'suspended' ? 'error' : 'default'}
                                size="small"
                            />
                        )}
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    {supplier.contact_person && (
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <PersonIcon fontSize="small" color="action" />
                            <Typography variant="body2"><strong>Contact:</strong> {supplier.contact_person}</Typography>
                        </Box>
                    )}
                    {supplier.phone && (
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <PhoneIcon fontSize="small" color="action" />
                            <Typography variant="body2"><strong>Phone:</strong> {supplier.phone}</Typography>
                        </Box>
                    )}
                    {supplier.email && (
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <EmailIcon fontSize="small" color="action" />
                            <Typography variant="body2"><strong>Email:</strong> {supplier.email}</Typography>
                        </Box>
                    )}
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                            Created: {new Date(supplier.created_at).toLocaleString()}
                        </Typography>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    <Box display="flex" flexDirection="column" gap={1}>
                        {!isDeleted && canEdit && (
                            <Button fullWidth variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(supplier)}>
                                Edit
                            </Button>
                        )}
                        {!isDeleted && canChangeStatus && (
                            <Button
                                fullWidth
                                variant="outlined"
                                color={supplier.status === 'active' ? 'warning' : 'success'}
                                startIcon={supplier.status === 'active' ? <BlockIcon /> : <CheckCircleIcon />}
                                onClick={() => onToggleStatus(supplier)}
                            >
                                {supplier.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Button>
                        )}
                        {isDeleted && canRestore && (
                            <Button fullWidth variant="outlined" color="success" startIcon={<RestoreIcon />} onClick={() => onRestore(supplier)}>
                                Restore
                            </Button>
                        )}
                    </Box>
                </CardContent>
            </Card>
        );
    };

    return (
        <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 }, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden', boxShadow: 1 }}>
                {/* Header & Filters */}
                <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={2}>
                        <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                            Suppliers
                        </Typography>
                        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
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
                                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)} fullWidth={isMobile}>
                                    New Supplier
                                </Button>
                            )}
                        </Box>
                    </Box>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                        <TextField
                            label="Search by name, contact or email"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                            }}
                            sx={{ flex: 1, minWidth: { xs: '100%', sm: 250 } }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchSuppliers} fullWidth={isMobile}>
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {/* Table or Card View */}
                {showTableView ? (
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
                ) : (
                    // Mobile/Tablet Card View
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                        ) : suppliers.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>No suppliers found</Paper>
                        ) : (
                            suppliers.map((supplier) => (
                                <SupplierCard
                                    key={supplier.supplier_id}
                                    supplier={supplier}
                                    canEdit={canEdit}
                                    canChangeStatus={canChangeStatus}
                                    canRestore={canRestore}
                                    onEdit={handleEditSupplier}
                                    onRestore={handleRestoreSupplier}
                                    onToggleStatus={handleToggleStatusSupplier}
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
                        sx={{ '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
                    />
                </Box>
            </Paper>

            {/* Action Menu (only for table view) */}
            <Menu anchorEl={actionMenu} open={Boolean(actionMenu)} onClose={handleMenuClose}>
                {selectedSupplier && !selectedSupplier.deleted_at && canEdit && (
                    <MenuItem onClick={handleEditFromTable}><EditIcon sx={{ mr: 1 }} /> Edit</MenuItem>
                )}
                {selectedSupplier && !selectedSupplier.deleted_at && canChangeStatus && (
                    <MenuItem onClick={handleToggleStatusFromTable}>
                        {selectedSupplier.status === 'active' ? (
                            <><BlockIcon sx={{ mr: 1, color: 'warning.main' }} /> Deactivate</>
                        ) : (
                            <><CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} /> Activate</>
                        )}
                    </MenuItem>
                )}
                {selectedSupplier && selectedSupplier.deleted_at && canRestore && (
                    <MenuItem onClick={handleRestoreFromTable}><RestoreIcon sx={{ mr: 1, color: 'success.main' }} /> Restore</MenuItem>
                )}
            </Menu>

            <SupplierModal open={modalOpen} onClose={handleModalClose} supplier={editingSupplier} />

            {/* Confirm Dialog */}
            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))} fullWidth maxWidth="xs">
                <DialogTitle sx={{ pb: 1 }}>{confirmDialog.title}</DialogTitle>
                <DialogContent><Typography>{confirmDialog.message}</Typography></DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button onClick={handleConfirm} color="error" variant="contained">Confirm</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}