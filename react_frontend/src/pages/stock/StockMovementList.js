// src/pages/stock/StockMovementList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography, CircularProgress, Tooltip,
    FormControl, InputLabel, Select
} from '@mui/material';
import {
    MoreVert as MoreVertIcon, Delete as DeleteIcon, Refresh as RefreshIcon,
    Search as SearchIcon, SwapHoriz as TransferIcon, ShoppingCart as PurchaseIcon,
    Sell as SaleIcon, AssignmentReturn as ReturnIcon, Adjust as AdjustmentIcon,
    Warning as LossIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { useStockMovements } from '@/hooks/useStockMovements';
import StockMovementModal from './StockMovementModal';

const headCells = [
    { id: 'brand', label: 'Brand' },                                 // ✅ first column
    { id: 'product', label: 'Product / IMEI / SKU / Model' },       // ✅ second column
    // Qty column removed as requested
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

export default function StockMovementList() {
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

    const handleMenuClose = () => {
        setActionMenu(null);
    };

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

    return (
        <Box sx={{ width: '100%', p: 0, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: 1, overflow: 'hidden', boxShadow: 1 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                        <TextField
                            label="Search by product, IMEI, SKU, brand or notes"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            sx={{ minWidth: 250 }}
                        />
                        <FormControl size="small" sx={{ minWidth: 150 }}>
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
                                        <CircularProgress size={32} />
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
                                            {/* Brand column */}
                                            <TableCell>
                                                <Typography variant="body2">{movement.brand || 'N/A'}</Typography>
                                            </TableCell>

                                            {/* Product / IMEI / SKU / Model column (no quantity) */}
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {movement.product_name}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary" display="block">
                                                    IMEI: {movement.imei}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary" display="block">
                                                    SKU: {movement.sku}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary" display="block">
                                                    Model: {movement.model || 'N/A'}
                                                </Typography>
                                            </TableCell>

                                            {/* Qty column removed entirely */}

                                            {/* Movement Type column */}
                                            <TableCell>
                                                <Chip
                                                    icon={<IconComponent />}
                                                    label={config.label}
                                                    color={config.color}
                                                    size="small"
                                                />
                                                <Typography variant="caption" display="block" color="textSecondary">
                                                    {movement.movement_type_description}
                                                </Typography>
                                            </TableCell>

                                            {/* From → To column */}
                                            <TableCell>
                                                <Typography variant="body2" color="textSecondary">
                                                    From: {movement.from_name} ({movement.from_type})
                                                </Typography>
                                                <Typography variant="body2" color="primary">
                                                    To: {movement.to_name} ({movement.to_type})
                                                </Typography>
                                            </TableCell>

                                            {/* Performed By */}
                                            <TableCell>{movement.performed_by}</TableCell>

                                            {/* Requester */}
                                            <TableCell>
                                                <Tooltip title={movement.request_id || 'No request'}>
                                                    <Typography variant="body2">
                                                        {movement.requester_name || movement.request_name || 'N/A'}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>

                                            {/* Date */}
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {new Date(movement.created_at).toLocaleDateString()}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {new Date(movement.created_at).toLocaleTimeString()}
                                                </Typography>
                                            </TableCell>

                                            {/* Actions */}
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

                <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
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
                    />
                </Box>
            </Paper>

            <Menu anchorEl={actionMenu} open={Boolean(actionMenu)} onClose={handleMenuClose}>
                <MenuItem onClick={handleViewDetails}>View Details</MenuItem>
                {canDelete && (
                    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                        <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                )}
            </Menu>

            <StockMovementModal open={modalOpen} onClose={handleModalClose} movement={selectedMovement} />

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