// src/pages/warehouses/WarehouseList.js
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, Menu, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography, CircularProgress, Switch, FormControlLabel, Card, CardContent, Divider, useMediaQuery, useTheme } from '@mui/material';
import { Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon, Refresh as RefreshIcon, Search as SearchIcon, Restore as RestoreIcon, Block as BlockIcon, CheckCircle as CheckCircleIcon, Warehouse as WarehouseIcon, LocationOn as LocationIcon, Person as PersonIcon, CalendarToday as CalendarIcon } from '@mui/icons-material';
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

    const { hasPermission } = usePermission();
    const canView = hasPermission('warehouses.view');
    const canCreate = hasPermission('warehouses.create');
    const canEdit = hasPermission('warehouses.edit');
    const canRestore = hasPermission('warehouses.restore');
    const canChangeStatus = hasPermission('warehouses.change_status');

    const { data, total, loading, fetchData, restore, changeStatus } = useWarehouses();

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

    // Direct handlers for card view (pass warehouse object directly)
    const handleEditWarehouse = (warehouse) => {
        setEditingWarehouse(warehouse);
        setModalOpen(true);
        if (actionMenu) handleMenuClose();
    };

    const handleRestoreWarehouse = (warehouse) => {
        const warehouseId = warehouse.warehouse_id;
        if (!warehouseId) return;
        setConfirmDialog({
            open: true,
            title: 'Restore Warehouse',
            message: `Are you sure you want to restore "${warehouse.name}"?`,
            action: async () => {
                try {
                    await restore(warehouseId);
                    showSnackbar({ type: 'success', message: 'Warehouse restored successfully' });
                    fetchWarehouses();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Restore failed' });
                }
            }
        });
        if (actionMenu) handleMenuClose();
    };

    const handleToggleStatusWarehouse = (warehouse) => {
        const newStatus = warehouse.status === 'active' ? 'inactive' : 'active';
        setConfirmDialog({
            open: true,
            title: `${newStatus === 'active' ? 'Activate' : 'Deactivate'} Warehouse`,
            message: `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} "${warehouse.name}"?`,
            action: async () => {
                try {
                    await changeStatus(warehouse.warehouse_id, newStatus);
                    showSnackbar({ type: 'success', message: `Warehouse ${newStatus}d successfully` });
                    fetchWarehouses();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Status change failed' });
                }
            }
        });
        if (actionMenu) handleMenuClose();
    };

    // Wrappers for table view (using selectedWarehouse state)
    const handleEditFromTable = () => {
        if (selectedWarehouse) handleEditWarehouse(selectedWarehouse);
    };

    const handleRestoreFromTable = () => {
        if (selectedWarehouse) handleRestoreWarehouse(selectedWarehouse);
    };

    const handleToggleStatusFromTable = () => {
        if (selectedWarehouse) handleToggleStatusWarehouse(selectedWarehouse);
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

    // Card component for mobile/tablet view
    const WarehouseCard = ({ warehouse, canEdit, canChangeStatus, canRestore, onEdit, onRestore, onToggleStatus }) => {
        const isDeleted = !!warehouse.deleted_at;
        return (
            <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <CardContent sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <WarehouseIcon fontSize="small" color="primary" />
                            <Typography variant="subtitle1" fontWeight="bold">
                                {warehouse.name}
                            </Typography>
                        </Box>
                        {isDeleted ? (
                            <Chip label="Deleted" color="error" size="small" />
                        ) : (
                            <Chip
                                label={warehouse.status}
                                color={warehouse.status === 'active' ? 'success' : warehouse.status === 'maintenance' ? 'warning' : 'default'}
                                size="small"
                            />
                        )}
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    {warehouse.location && (
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <LocationIcon fontSize="small" color="action" />
                            <Typography variant="body2"><strong>Location:</strong> {warehouse.location}</Typography>
                        </Box>
                    )}
                    {warehouse.manager && (
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <PersonIcon fontSize="small" color="action" />
                            <Typography variant="body2"><strong>Manager:</strong> {warehouse.manager?.name || '-'}</Typography>
                        </Box>
                    )}
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                            Created: {new Date(warehouse.created_at).toLocaleString()}
                        </Typography>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    <Box display="flex" flexDirection="column" gap={1}>
                        {!isDeleted && canEdit && (
                            <Button fullWidth variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(warehouse)}>
                                Edit
                            </Button>
                        )}
                        {!isDeleted && canChangeStatus && (
                            <Button
                                fullWidth
                                variant="outlined"
                                color={warehouse.status === 'active' ? 'warning' : 'success'}
                                startIcon={warehouse.status === 'active' ? <BlockIcon /> : <CheckCircleIcon />}
                                onClick={() => onToggleStatus(warehouse)}
                            >
                                {warehouse.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Button>
                        )}
                        {isDeleted && canRestore && (
                            <Button fullWidth variant="outlined" color="success" startIcon={<RestoreIcon />} onClick={() => onRestore(warehouse)}>
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
                            Warehouses
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
                                    New Warehouse
                                </Button>
                            )}
                        </Box>
                    </Box>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                        <TextField
                            label="Search by name or location"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                            }}
                            sx={{ flex: 1, minWidth: { xs: '100%', sm: 250 } }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchWarehouses} fullWidth={isMobile}>
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
                ) : (
                    // Mobile/Tablet Card View
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                        ) : warehouses.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>No warehouses found</Paper>
                        ) : (
                            warehouses.map((warehouse) => (
                                <WarehouseCard
                                    key={warehouse.warehouse_id}
                                    warehouse={warehouse}
                                    canEdit={canEdit}
                                    canChangeStatus={canChangeStatus}
                                    canRestore={canRestore}
                                    onEdit={handleEditWarehouse}
                                    onRestore={handleRestoreWarehouse}
                                    onToggleStatus={handleToggleStatusWarehouse}
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
                {selectedWarehouse && !selectedWarehouse.deleted_at && canEdit && (
                    <MenuItem onClick={handleEditFromTable}><EditIcon sx={{ mr: 1 }} /> Edit</MenuItem>
                )}
                {selectedWarehouse && !selectedWarehouse.deleted_at && canChangeStatus && (
                    <MenuItem onClick={handleToggleStatusFromTable}>
                        {selectedWarehouse.status === 'active' ? (
                            <><BlockIcon sx={{ mr: 1, color: 'warning.main' }} /> Deactivate</>
                        ) : (
                            <><CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} /> Activate</>
                        )}
                    </MenuItem>
                )}
                {selectedWarehouse && selectedWarehouse.deleted_at && canRestore && (
                    <MenuItem onClick={handleRestoreFromTable}><RestoreIcon sx={{ mr: 1, color: 'success.main' }} /> Restore</MenuItem>
                )}
            </Menu>

            <WarehouseModal open={modalOpen} onClose={handleModalClose} warehouse={editingWarehouse} />

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