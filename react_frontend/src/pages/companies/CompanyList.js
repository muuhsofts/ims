// src/pages/companies/CompanyList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TablePagination, TableRow,
    TextField, Typography, CircularProgress, Switch, FormControlLabel,
    Card, CardContent, Divider, useMediaQuery, useTheme, Tooltip
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Refresh as RefreshIcon, Search as SearchIcon, Restore as RestoreIcon,
    Block as BlockIcon, CheckCircle as CheckCircleIcon,
    Delete as DeleteIcon, Business as BusinessIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { useCompanies } from '@/hooks/useCompanies';
import CompanyModal from './CompanyModal';

const headCells = [
    { id: 'company_name', label: 'Company Name' },
    { id: 'address', label: 'Address' },
    { id: 'phone', label: 'Phone' },
    { id: 'email', label: 'Email' },
    { id: 'status', label: 'Status' },
    { id: 'created_at', label: 'Created At' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

export default function CompanyList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

    const { hasPermission } = usePermission();
    const canView = hasPermission('companies.view');
    const canCreate = hasPermission('companies.create');
    const canEdit = hasPermission('companies.edit');
    const canDelete = hasPermission('companies.delete');
    const canRestore = hasPermission('companies.restore');

    const { data, total, loading, fetchData, remove, restore, toggleStatus } = useCompanies();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [showDeleted, setShowDeleted] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });

    const fetchCompanies = useCallback(() => {
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
        fetchCompanies();
    }, [fetchCompanies]);

    const handleMenuOpen = (event, company) => {
        setSelectedCompany(company);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => {
        setActionMenu(null);
        setSelectedCompany(null);
    };

    const handleEdit = () => {
        setEditingCompany(selectedCompany);
        setModalOpen(true);
        handleMenuClose();
    };

    const handleDelete = () => {
        setConfirmDialog({
            open: true,
            title: 'Delete Company',
            message: `Are you sure you want to delete "${selectedCompany?.company_name}"?`,
            action: async () => {
                try {
                    await remove(selectedCompany.id);
                    showSnackbar({ type: 'success', message: 'Company deleted successfully' });
                    fetchCompanies();
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
            title: 'Restore Company',
            message: `Are you sure you want to restore "${selectedCompany?.company_name}"?`,
            action: async () => {
                try {
                    await restore(selectedCompany.id);
                    showSnackbar({ type: 'success', message: 'Company restored successfully' });
                    fetchCompanies();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Restore failed' });
                }
            }
        });
        handleMenuClose();
    };

    const handleToggleStatus = () => {
        if (!selectedCompany) return;
        const newStatus = selectedCompany.status === 'active' ? 'inactive' : 'active';
        setConfirmDialog({
            open: true,
            title: `${newStatus === 'active' ? 'Activate' : 'Deactivate'} Company`,
            message: `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} "${selectedCompany.company_name}"?`,
            action: async () => {
                try {
                    await toggleStatus(selectedCompany.id);
                    showSnackbar({ type: 'success', message: `Company ${newStatus}d successfully` });
                    fetchCompanies();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Status change failed' });
                }
            }
        });
        handleMenuClose();
    };

    const handleModalClose = (refresh) => {
        setModalOpen(false);
        setEditingCompany(null);
        if (refresh) fetchCompanies();
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
        return <Typography sx={{ p: 2 }}>You do not have permission to view companies.</Typography>;
    }

    const companies = Array.isArray(data) ? data : [];

    const getStatusChip = (status) => {
        switch (status) {
            case 'active': return <Chip label="Active" color="success" size="small" />;
            case 'inactive': return <Chip label="Inactive" color="default" size="small" />;
            default: return <Chip label={status} size="small" />;
        }
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleString();
    };

    // Card component for mobile view
    const CompanyCard = ({ company, onEdit, onDelete, onRestore, onToggleStatus }) => {
        const isDeleted = !!company.deleted_at;
        return (
            <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <CardContent sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <BusinessIcon color="primary" />
                        <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                            {company.company_name}
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    {company.address && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            📍 {company.address}
                        </Typography>
                    )}
                    {company.phone && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            📞 {company.phone}
                        </Typography>
                    )}
                    {company.email && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            ✉️ {company.email}
                        </Typography>
                    )}

                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                        {getStatusChip(company.status)}
                        <Typography variant="caption" color="text.secondary">
                            {formatDate(company.created_at)}
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    <Box display="flex" flexDirection="column" gap={1}>
                        {!isDeleted && canEdit && (
                            <Button fullWidth variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(company)}>
                                Edit
                            </Button>
                        )}
                        {!isDeleted && canDelete && (
                            <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(company)}>
                                Delete
                            </Button>
                        )}
                        {!isDeleted && canEdit && (
                            <Button
                                fullWidth
                                variant="outlined"
                                color={company.status === 'active' ? 'warning' : 'success'}
                                startIcon={company.status === 'active' ? <BlockIcon /> : <CheckCircleIcon />}
                                onClick={() => onToggleStatus(company)}
                            >
                                {company.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Button>
                        )}
                        {isDeleted && canRestore && (
                            <Button fullWidth variant="outlined" color="success" startIcon={<RestoreIcon />} onClick={() => onRestore(company)}>
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
                            Companies
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
                                    New Company
                                </Button>
                            )}
                        </Box>
                    </Box>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                        <TextField
                            label="Search by name, address, phone or email"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                            }}
                            sx={{ flex: 1, minWidth: { xs: '100%', sm: 250 } }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchCompanies} fullWidth={isMobile}>
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
                                ) : companies.length === 0 ? (
                                    <TableRow><TableCell colSpan={headCells.length} align="center">No companies found</TableCell></TableRow>
                                ) : (
                                    companies.map((company) => (
                                        <TableRow key={company.id} hover>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <BusinessIcon fontSize="small" color="primary" />
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {company.company_name}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>{company.address || '-'}</TableCell>
                                            <TableCell>{company.phone || '-'}</TableCell>
                                            <TableCell>{company.email || '-'}</TableCell>
                                            <TableCell>{getStatusChip(company.status)}</TableCell>
                                            <TableCell>{formatDate(company.created_at)}</TableCell>
                                            <TableCell>
                                                <IconButton size="small" onClick={(e) => handleMenuOpen(e, company)}>
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
                            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                        ) : companies.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>No companies found</Paper>
                        ) : (
                            companies.map((company) => (
                                <CompanyCard
                                    key={company.id}
                                    company={company}
                                    onEdit={() => {
                                        setEditingCompany(company);
                                        setModalOpen(true);
                                    }}
                                    onDelete={() => {
                                        setSelectedCompany(company);
                                        handleDelete();
                                    }}
                                    onRestore={() => {
                                        setSelectedCompany(company);
                                        handleRestore();
                                    }}
                                    onToggleStatus={() => {
                                        setSelectedCompany(company);
                                        handleToggleStatus();
                                    }}
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

            {/* Action Menu */}
            <Menu anchorEl={actionMenu} open={Boolean(actionMenu)} onClose={handleMenuClose}>
                {selectedCompany && !selectedCompany.deleted_at && canEdit && (
                    <MenuItem onClick={handleEdit}><EditIcon sx={{ mr: 1 }} /> Edit</MenuItem>
                )}
                {selectedCompany && !selectedCompany.deleted_at && canEdit && (
                    <MenuItem onClick={handleToggleStatus}>
                        {selectedCompany.status === 'active' ? (
                            <><BlockIcon sx={{ mr: 1, color: 'warning.main' }} /> Deactivate</>
                        ) : (
                            <><CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} /> Activate</>
                        )}
                    </MenuItem>
                )}
                {selectedCompany && !selectedCompany.deleted_at && canDelete && (
                    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                        <DeleteIcon sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                )}
                {selectedCompany && selectedCompany.deleted_at && canRestore && (
                    <MenuItem onClick={handleRestore}><RestoreIcon sx={{ mr: 1, color: 'success.main' }} /> Restore</MenuItem>
                )}
            </Menu>

            <CompanyModal open={modalOpen} onClose={handleModalClose} company={editingCompany} />

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