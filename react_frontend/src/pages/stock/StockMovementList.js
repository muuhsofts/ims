// src/pages/stock/StockMovementList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography, CircularProgress, Tooltip,
    FormControl, InputLabel, Select, Card, CardContent, Divider,
    useMediaQuery, useTheme, Grid
} from '@mui/material';
import {
    MoreVert as MoreVertIcon, Delete as DeleteIcon, Refresh as RefreshIcon,
    Search as SearchIcon, SwapHoriz as TransferIcon, ShoppingCart as PurchaseIcon,
    Sell as SaleIcon, AssignmentReturn as ReturnIcon, Adjust as AdjustmentIcon,
    Warning as LossIcon, LocationOn as LocationIcon, Person as PersonIcon,
    CalendarToday as CalendarIcon, Category as CategoryIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { useStockMovements } from '@/hooks/useStockMovements';
import StockMovementModal from './StockMovementModal';

const headCells = [
    { id: 'brand', label: 'Brand' },
    { id: 'product', label: 'Product / IMEI / SKU / Model' },
    { id: 'movement_type', label: 'Type' },
    { id: 'from_to', label: 'From → To' },
    { id: 'performed_by', label: 'Performed By' },
    { id: 'requester', label: 'Requester' },
    { id: 'created_at', label: 'Date' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

const movementTypeConfig = {
    transfer: { label: 'Transfer', color: 'primary', icon: TransferIcon },
    purchase: { label: 'Purchase', color: 'success', icon: PurchaseIcon },
    sale: { label: 'Sale', color: 'error', icon: SaleIcon },
    return: { label: 'Return', color: 'warning', icon: ReturnIcon },
    adjustment: { label: 'Adjustment', color: 'info', icon: AdjustmentIcon },
    loss: { label: 'Loss', color: 'default', icon: LossIcon },
};

// Card component for mobile/tablet view
const MovementCard = ({ movement, onViewDetails, onDelete }) => {
    const config = movementTypeConfig[movement.movement_type] || movementTypeConfig.transfer;
    const IconComponent = config.icon;

    return (
        <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
            <CardContent sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                            {movement.product_name || '—'}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
                            IMEI: {movement.imei || '—'}
                        </Typography>
                    </Box>
                    <Chip
                        icon={<IconComponent />}
                        label={config.label}
                        color={config.color}
                        size="small"
                    />
                </Box>

                <Divider sx={{ my: 1 }} />

                <Grid container spacing={1}>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Brand</Typography>
                        <Typography variant="body2">{movement.brand || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">SKU</Typography>
                        <Typography variant="body2">{movement.sku || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Model</Typography>
                        <Typography variant="body2">{movement.model || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">Type Description</Typography>
                        <Typography variant="body2">{movement.movement_type_description || config.label}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">From</Typography>
                        <Typography variant="body2">{movement.from_name} ({movement.from_type})</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">To</Typography>
                        <Typography variant="body2">{movement.to_name} ({movement.to_type})</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Performed By</Typography>
                        <Typography variant="body2">{movement.performed_by}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Requester</Typography>
                        <Typography variant="body2">{movement.requester_name || movement.request_name || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">Date</Typography>
                        <Typography variant="body2">
                            {new Date(movement.created_at).toLocaleString()}
                        </Typography>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 1 }} />

                <Box display="flex" justifyContent="flex-end" gap={1}>
                    <Button size="small" variant="outlined" onClick={() => onViewDetails(movement)}>
                        View Details
                    </Button>
                    {movement.canDelete && (
                        <Button size="small" variant="outlined" color="error" onClick={() => onDelete(movement)}>
                            Delete
                        </Button>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

export default function StockMovementList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md')); // Table on medium and up

    const { hasPermission } = usePermission();
    const canView = hasPermission('stock_movements.view');
    const canDelete = hasPermission('stock_movements.delete');

    const { data, total, loading, fetchData, remove } = useStockMovements();

    const [search, setSearch] = useState('');
    const [movementTypeFilter, setMovementTypeFilter] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedMovement, setSelectedMovement] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });

    const fetchMovements = useCallback(() => {
        if (!canView) return;
        const params = {
            page: page + 1,
            per_page: rowsPerPage,
            search: search || undefined,
            movement_type: movementTypeFilter || undefined,
        };
        fetchData(params);
    }, [page, rowsPerPage, search, movementTypeFilter, canView, fetchData]);

    useEffect(() => {
        fetchMovements();
    }, [fetchMovements]);

    const handleMenuOpen = (event, movement) => {
        setSelectedMovement(movement);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => setActionMenu(null);

    const handleViewDetails = () => {
        setModalOpen(true);
        handleMenuClose();
    };

    const handleDelete = () => {
        setConfirmDialog({
            open: true,
            title: 'Delete Movement',
            message: `Are you sure you want to delete this movement record?`,
            action: async () => {
                try {
                    await remove(selectedMovement.movement_id);
                    showSnackbar({ type: 'success', message: 'Movement deleted successfully' });
                    fetchMovements();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Delete failed' });
                }
            }
        });
        handleMenuClose();
    };

    const handleModalClose = (refresh) => {
        setModalOpen(false);
        setSelectedMovement(null);
        if (refresh) fetchMovements();
    };

    const handleConfirm = async () => {
        if (!confirmDialog.action) return;
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        await confirmDialog.action();
    };

    const handleClearFilters = () => {
        setSearch('');
        setMovementTypeFilter('');
        setPage(0);
    };

    if (!canView) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography color="error">You do not have permission to view stock movements.</Typography>
            </Box>
        );
    }

    const movements = Array.isArray(data) ? data : [];

    // Card-specific handlers
    const handleCardViewDetails = (movement) => {
        setSelectedMovement(movement);
        setModalOpen(true);
    };

    const handleCardDelete = (movement) => {
        setSelectedMovement(movement);
        handleDelete();
    };

    return (
        <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 }, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden', boxShadow: 1 }}>
                {/* Header & Filters */}
                <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} alignItems="center">
                        <TextField
                            label="Search by product, IMEI, SKU, brand or notes"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            sx={{ flex: 1, minWidth: { xs: '100%', sm: 250 } }}
                        />
                        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
                            <InputLabel>Movement Type</InputLabel>
                            <Select
                                value={movementTypeFilter}
                                label="Movement Type"
                                onChange={(e) => setMovementTypeFilter(e.target.value)}
                            >
                                <MenuItem value="">All</MenuItem>
                                {Object.entries(movementTypeConfig).map(([key, config]) => (
                                    <MenuItem key={key} value={key}>{config.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchMovements}>
                            Refresh
                        </Button>
                        {(search || movementTypeFilter) && (
                            <Button variant="text" onClick={handleClearFilters}>Clear Filters</Button>
                        )}
                    </Box>
                </Box>

                {/* Table or Card View */}
                {showTableView ? (
                    // Desktop Table View
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table sx={{ minWidth: 1200 }}>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                                    {headCells.map((cell) => (
                                        <TableCell key={cell.id} sx={{ fontWeight: 'bold' }}>{cell.label}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={headCells.length} align="center">
                                            <CircularProgress size={32} sx={{ my: 3 }} />
                                        </TableCell>
                                    </TableRow>
                                ) : movements.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={headCells.length} align="center">
                                            No stock movements found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    movements.map((movement) => {
                                        const config = movementTypeConfig[movement.movement_type] || movementTypeConfig.transfer;
                                        const IconComponent = config.icon;
                                        return (
                                            <TableRow key={movement.movement_id} hover>
                                                <TableCell>{movement.brand || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="medium">{movement.product_name}</Typography>
                                                    <Typography variant="caption" display="block">IMEI: {movement.imei}</Typography>
                                                    <Typography variant="caption" display="block">SKU: {movement.sku}</Typography>
                                                    <Typography variant="caption" display="block">Model: {movement.model || 'N/A'}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip icon={<IconComponent />} label={config.label} color={config.color} size="small" />
                                                    <Typography variant="caption" display="block">{movement.movement_type_description}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">From: {movement.from_name} ({movement.from_type})</Typography>
                                                    <Typography variant="body2" color="primary">To: {movement.to_name} ({movement.to_type})</Typography>
                                                </TableCell>
                                                <TableCell>{movement.performed_by}</TableCell>
                                                <TableCell>{movement.requester_name || movement.request_name || 'N/A'}</TableCell>
                                                <TableCell>
                                                    {new Date(movement.created_at).toLocaleDateString()}
                                                    <Typography variant="caption" display="block">{new Date(movement.created_at).toLocaleTimeString()}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, movement)}>
                                                        <MoreVertIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    // Mobile/Tablet Card View
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                        ) : movements.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>No stock movements found</Paper>
                        ) : (
                            movements.map((movement) => (
                                <MovementCard
                                    key={movement.movement_id}
                                    movement={movement}
                                    onViewDetails={handleCardViewDetails}
                                    onDelete={handleCardDelete}
                                />
                            ))
                        )}
                    </Box>
                )}

                {/* Pagination */}
                <Box sx={{ borderTop: 1, borderColor: 'divider', py: { xs: 1, sm: 0 } }}>
                    <TablePagination
                        rowsPerPageOptions={[10, 20, 50, 100]}
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
                <MenuItem onClick={handleViewDetails}>View Details</MenuItem>
                {canDelete && (
                    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                        <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                )}
            </Menu>

            <StockMovementModal open={modalOpen} onClose={handleModalClose} movement={selectedMovement} />

            {/* Confirm Delete Dialog */}
            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))} fullWidth maxWidth="xs">
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