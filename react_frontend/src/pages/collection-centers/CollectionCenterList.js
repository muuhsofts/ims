// src/pages/collection-centers/CollectionCenterList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography, CircularProgress, Switch, FormControlLabel,
    Card, CardContent, Divider, useMediaQuery, useTheme
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Refresh as RefreshIcon, Search as SearchIcon, Restore as RestoreIcon,
    Store as CenterIcon, LocationOn as LocationIcon, Person as PersonIcon,
    CalendarToday as CalendarIcon
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

    const { hasPermission } = usePermission();
    const canView = hasPermission('collection_centers.view');
    const canCreate = hasPermission('collection_centers.create');
    const canEdit = hasPermission('collection_centers.edit');
    const canRestore = hasPermission('collection_centers.restore');

    // Delete permission removed; we no longer import or use 'remove'
    const { data, total, loading, fetchData, restore } = useCollectionCenters();

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

    // Direct handlers for card view (pass center object directly)
    const handleEditCenter = (center) => {
        setEditingCenter(center);
        setModalOpen(true);
        if (actionMenu) handleMenuClose();
    };

    const handleRestoreCenter = (center) => {
        const centerId = center.cc_id;
        if (!centerId) return;
        setConfirmDialog({
            open: true,
            title: 'Restore Center',
            message: `Are you sure you want to restore "${center.cc_name}"?`,
            action: async () => {
                try {
                    await restore(centerId);
                    showSnackbar({ type: 'success', message: 'Center restored successfully' });
                    fetchCenters();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Restore failed' });
                }
            }
        });
        if (actionMenu) handleMenuClose();
    };

    // Wrappers for table view (using selectedCenter state)
    const handleEditFromTable = () => {
        if (selectedCenter) handleEditCenter(selectedCenter);
    };
    const handleRestoreFromTable = () => {
        if (selectedCenter) handleRestoreCenter(selectedCenter);
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

    // Card component for mobile/tablet view (no delete button)
    const CenterCard = ({ center, canEdit, canRestore, onEdit, onRestore }) => {
        const isDeleted = !!center.deleted_at;

        return (
            <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <CardContent sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <CenterIcon fontSize="small" color="primary" />
                            <Typography variant="subtitle1" fontWeight="bold">
                                {center.cc_name}
                            </Typography>
                        </Box>
                        {isDeleted ? (
                            <Chip label="Deleted" color="error" size="small" />
                        ) : (
                            <Chip
                                label={center.status}
                                color={center.status === 'active' ? 'success' : center.status === 'on_maintenance' ? 'warning' : 'default'}
                                size="small"
                            />
                        )}
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    {center.location && (
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <LocationIcon fontSize="small" color="action" />
                            <Typography variant="body2"><strong>Location:</strong> {center.location}</Typography>
                        </Box>
                    )}
                    {center.owner && (
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <PersonIcon fontSize="small" color="action" />
                            <Typography variant="body2"><strong>Owner:</strong> {center.owner?.name || '-'}</Typography>
                        </Box>
                    )}

                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                            Created: {new Date(center.created_at).toLocaleString()}
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    <Box display="flex" flexDirection="column" gap={1}>
                        {!isDeleted && canEdit && (
                            <Button fullWidth variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(center)}>
                                Edit
                            </Button>
                        )}
                        {isDeleted && canRestore && (
                            <Button fullWidth variant="outlined" color="success" startIcon={<RestoreIcon />} onClick={() => onRestore(center)}>
                                Restore
                            </Button>
                        )}
                        {/* Delete button omitted */}
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
                            Collection Centers
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
                                    New Center
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
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            sx={{ flex: 1, minWidth: { xs: '100%', sm: 250 } }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchCenters} fullWidth={isMobile}>
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
                ) : (
                    // Mobile/Tablet Card View
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                        ) : centers.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>No centers found</Paper>
                        ) : (
                            centers.map((center) => (
                                <CenterCard
                                    key={center.cc_id}
                                    center={center}
                                    canEdit={canEdit}
                                    canRestore={canRestore}
                                    onEdit={handleEditCenter}
                                    onRestore={handleRestoreCenter}
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
                        sx={{
                            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }
                        }}
                    />
                </Box>
            </Paper>

            {/* Action Menu (only for table view) */}
            <Menu anchorEl={actionMenu} open={Boolean(actionMenu)} onClose={handleMenuClose}>
                {selectedCenter && !selectedCenter.deleted_at && canEdit && (
                    <MenuItem onClick={handleEditFromTable}><EditIcon sx={{ mr: 1 }} /> Edit</MenuItem>
                )}
                {selectedCenter && selectedCenter.deleted_at && canRestore && (
                    <MenuItem onClick={handleRestoreFromTable}><RestoreIcon sx={{ mr: 1, color: 'success.main' }} /> Restore</MenuItem>
                )}
                {/* Delete menu item removed */}
            </Menu>

            <CollectionCenterModal open={modalOpen} onClose={handleModalClose} center={editingCenter} />

            {/* Confirm Dialog (only used for restore now) */}
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