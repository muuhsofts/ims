// src/pages/returns/ReturnsList.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent,
    DialogTitle, IconButton, InputAdornment, Menu, MenuItem,
    Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TablePagination, TableRow, TextField, Typography,
    CircularProgress, Card, CardContent, Divider, useMediaQuery,
    useTheme, Tooltip, Avatar, CardActions
} from '@mui/material';
import {
    Add as AddIcon,
    MoreVert as MoreVertIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon,
    Person as PersonIcon,
    PhoneIphone as PhoneIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Pending as PendingIcon,
    ThumbUp as ApproveIcon,
    Warehouse as WarehouseIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { useReturns } from '@/hooks/useReturns';
import ReturnsModal from './ReturnsModal';
import ApproveReturnModal from './ApproveReturnModal';

const headCells = [
    { id: 'customer_name', label: 'Customer' },
    { id: 'imei', label: 'IMEI' },
    { id: 'product', label: 'Product' },
    { id: 'sale_info', label: 'Sale Info' },
    { id: 'status', label: 'Status' },
    { id: 'return_date', label: 'Return Date' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

const getStatusColor = (status) => {
    switch (status) {
        case 'returned': return 'warning';
        case 'approved': return 'info';
        case 'completed': return 'success';
        case 'cancelled': return 'error';
        default: return 'default';
    }
};

const getStatusIcon = (status) => {
    switch (status) {
        case 'returned': return <PendingIcon fontSize="small" />;
        case 'approved': return <ApproveIcon fontSize="small" />;
        case 'completed': return <CheckCircleIcon fontSize="small" />;
        case 'cancelled': return <CancelIcon fontSize="small" />;
        default: return null;
    }
};

const getStatusLabel = (status) => {
    switch (status) {
        case 'returned': return 'Pending';
        case 'approved': return 'Approved';
        case 'completed': return 'Completed';
        case 'cancelled': return 'Cancelled';
        default: return status;
    }
};

// Card component for mobile view
const ReturnCard = ({ returnItem, canApprove, canCancel, onAction }) => {
    const isAgent = returnItem.performed_by === localStorage.getItem('userId');

    return (
        <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
            <CardContent sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                            {returnItem.customer_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            IMEI: {returnItem.imei}
                        </Typography>
                    </Box>
                    <Chip
                        label={getStatusLabel(returnItem.status)}
                        color={getStatusColor(returnItem.status)}
                        size="small"
                        icon={getStatusIcon(returnItem.status)}
                    />
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <PhoneIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                        {returnItem.product?.sku || 'N/A'} - {returnItem.product?.category?.category_name || 'N/A'}
                    </Typography>
                </Box>
                {returnItem.sale && (
                    <Typography variant="caption" color="text.secondary" display="block">
                        Sale: {returnItem.sale.total_amount} TSh ({returnItem.sale.payment_method})
                    </Typography>
                )}
                <Typography variant="caption" color="text.secondary" display="block">
                    Returned: {new Date(returnItem.return_date).toLocaleString()}
                </Typography>
                {returnItem.approved_at && (
                    <Typography variant="caption" color="text.secondary" display="block">
                        Approved: {new Date(returnItem.approved_at).toLocaleString()}
                    </Typography>
                )}
                {returnItem.completed_date && (
                    <Typography variant="caption" color="text.secondary" display="block">
                        Completed: {new Date(returnItem.completed_date).toLocaleString()}
                    </Typography>
                )}
                {returnItem.notes && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Notes: {returnItem.notes}
                    </Typography>
                )}
            </CardContent>
            {(returnItem.status === 'returned' && (canApprove || (canCancel && isAgent))) && (
                <CardActions sx={{ p: 1, justifyContent: 'flex-end' }}>
                    {canApprove && (
                        <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => onAction('approve', returnItem)}
                            startIcon={<ApproveIcon />}
                        >
                            Approve
                        </Button>
                    )}
                    {canCancel && isAgent && (
                        <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => onAction('cancel', returnItem)}
                            startIcon={<CancelIcon />}
                        >
                            Cancel
                        </Button>
                    )}
                </CardActions>
            )}
        </Card>
    );
};

export default function ReturnsList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

    const { hasPermission } = usePermission();
    const canView = hasPermission('returns.view');
    const canCreate = hasPermission('returns.create');
    const canApprove = hasPermission('returns.approve');
    const canCancel = hasPermission('returns.cancel');

    const {
        data,
        total,
        loading,
        fetchReturns,
        cancelReturn,
        fetchStatistics
    } = useReturns();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [modalOpen, setModalOpen] = useState(false);
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [allData, setAllData] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });

    // Fetch all data once (no pagination params for client-side filtering)
    const fetchAllReturns = useCallback(() => {
        if (!canView) return;
        fetchReturns({ per_page: 1000 });
    }, [canView, fetchReturns]);

    useEffect(() => {
        fetchAllReturns();
        fetchStatistics();
    }, [fetchAllReturns, fetchStatistics]);

    // Update allData when data changes
    useEffect(() => {
        if (Array.isArray(data)) {
            setAllData(data);
        }
    }, [data]);

    // Client-side filtering
    const filteredReturns = useMemo(() => {
        let result = allData;

        // Filter by status
        if (statusFilter) {
            result = result.filter(r => r.status === statusFilter);
        }

        // Filter by search (IMEI or Customer Name)
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(r => {
                const searchableFields = [
                    r.customer_name,
                    r.imei,
                    r.product?.sku,
                    r.product?.category?.category_name,
                    r.notes,
                ].filter(Boolean);

                return searchableFields.some(field =>
                    String(field).toLowerCase().includes(searchLower)
                );
            });
        }

        return result;
    }, [allData, search, statusFilter]);

    // Calculate total filtered count
    const filteredTotal = filteredReturns.length;

    // Paginate the filtered data
    const paginatedReturns = useMemo(() => {
        const start = page * rowsPerPage;
        const end = start + rowsPerPage;
        return filteredReturns.slice(start, end);
    }, [filteredReturns, page, rowsPerPage]);

    const handleMenuOpen = (event, returnItem) => {
        setSelectedReturn(returnItem);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => {
        setActionMenu(null);
        setSelectedReturn(null);
    };

    const handleApprove = () => {
        setApproveModalOpen(true);
        handleMenuClose();
    };

    const handleCancel = async () => {
        if (!selectedReturn) return;
        setConfirmDialog({
            open: true,
            title: 'Cancel Return',
            message: `Are you sure you want to cancel the return for ${selectedReturn.customer_name} (IMEI: ${selectedReturn.imei})?`,
            action: async () => {
                await cancelReturn(selectedReturn.return_id);
                fetchAllReturns();
            }
        });
        handleMenuClose();
    };

    const handleAction = (action, returnItem) => {
        setSelectedReturn(returnItem);
        if (action === 'approve') {
            setApproveModalOpen(true);
        } else if (action === 'cancel') {
            setConfirmDialog({
                open: true,
                title: 'Cancel Return',
                message: `Are you sure you want to cancel the return for ${returnItem.customer_name} (IMEI: ${returnItem.imei})?`,
                action: async () => {
                    await cancelReturn(returnItem.return_id);
                    fetchAllReturns();
                }
            });
        }
    };

    const handleConfirm = async () => {
        if (!confirmDialog.action) return;
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
            await confirmDialog.action();
            showSnackbar({ type: 'success', message: 'Operation completed successfully' });
        } catch (err) {
            // Error handled in hook
        }
    };

    const handleClearFilters = () => {
        setSearch('');
        setStatusFilter('');
        setPage(0);
    };

    const handleRefresh = () => {
        fetchAllReturns();
    };

    if (!canView) {
        return <Typography sx={{ p: 2 }}>You do not have permission to view returns.</Typography>;
    }

    const returns = paginatedReturns;

    return (
        <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 }, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden', boxShadow: 1 }}>
                {/* Header & Filters */}
                <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={2}>
                        <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                            Returns Management
                        </Typography>
                        {canCreate && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)} fullWidth={isMobile}>
                                New Return
                            </Button>
                        )}
                    </Box>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                        <TextField
                            label="Search by IMEI, Customer or Product"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                            }}
                            sx={{ flex: 1, minWidth: { xs: '100%', sm: 250 } }}
                        />
                        <TextField
                            select
                            label="Status"
                            size="small"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            sx={{ minWidth: { xs: '100%', sm: 150 } }}
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="returned">Pending</MenuItem>
                            <MenuItem value="approved">Approved</MenuItem>
                            <MenuItem value="completed">Completed</MenuItem>
                            <MenuItem value="cancelled">Cancelled</MenuItem>
                        </TextField>
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh} fullWidth={isMobile}>
                            Refresh
                        </Button>
                        {(search || statusFilter) && (
                            <Button variant="text" onClick={handleClearFilters}>Clear Filters</Button>
                        )}
                    </Box>
                    {/* Show filtered count */}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Showing {filteredReturns.length} of {allData.length} returns
                        {search && ` (filtered by: "${search}")`}
                        {statusFilter && ` (status: ${getStatusLabel(statusFilter)})`}
                    </Typography>
                </Box>

                {/* Table or Card View */}
                {loading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress />
                    </Box>
                ) : showTableView ? (
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
                                {returns.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={headCells.length} align="center">
                                            {allData.length === 0 ? 'No returns found' : 'No matching returns found'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    returns.map((ret) => (
                                        <TableRow key={ret.return_id} hover>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                                                        <PersonIcon sx={{ fontSize: 14 }} />
                                                    </Avatar>
                                                    {ret.customer_name}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title={ret.imei}>
                                                    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                                        {ret.imei}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>
                                                {ret.product ? (
                                                    <Box>
                                                        <Typography variant="body2">{ret.product.sku || 'N/A'}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {ret.product.category?.category_name || 'N/A'}
                                                        </Typography>
                                                    </Box>
                                                ) : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {ret.sale ? (
                                                    <Box>
                                                        <Typography variant="body2">{ret.sale.total_amount} TSh</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {ret.sale.payment_method}
                                                        </Typography>
                                                    </Box>
                                                ) : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={getStatusLabel(ret.status)}
                                                    color={getStatusColor(ret.status)}
                                                    size="small"
                                                    icon={getStatusIcon(ret.status)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {new Date(ret.return_date).toLocaleDateString()}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(ret.return_date).toLocaleTimeString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {ret.status === 'returned' && (
                                                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, ret)}>
                                                        <MoreVertIcon />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {returns.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>
                                {allData.length === 0 ? 'No returns found' : 'No matching returns found'}
                            </Paper>
                        ) : (
                            returns.map((ret) => (
                                <ReturnCard
                                    key={ret.return_id}
                                    returnItem={ret}
                                    canApprove={canApprove}
                                    canCancel={canCancel}
                                    onAction={handleAction}
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
                        count={filteredTotal}
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
                {canApprove && (
                    <MenuItem onClick={handleApprove}>
                        <ApproveIcon sx={{ mr: 1, color: 'primary.main' }} /> Approve Return
                    </MenuItem>
                )}
                {canCancel && (
                    <MenuItem onClick={handleCancel}>
                        <CancelIcon sx={{ mr: 1, color: 'error.main' }} /> Cancel Return
                    </MenuItem>
                )}
            </Menu>

            {/* Modals */}
            <ReturnsModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={fetchAllReturns}
            />

            <ApproveReturnModal
                open={approveModalOpen}
                onClose={() => setApproveModalOpen(false)}
                returnItem={selectedReturn}
                onSuccess={fetchAllReturns}
            />

            {/* Confirm Dialog */}
            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))} fullWidth maxWidth="xs">
                <DialogTitle sx={{ pb: 1 }}>{confirmDialog.title}</DialogTitle>
                <DialogContent><Typography>{confirmDialog.message}</Typography></DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button onClick={handleConfirm} color="error" variant="contained">Confirm</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}