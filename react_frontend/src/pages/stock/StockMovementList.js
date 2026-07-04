// src/pages/stock/StockMovementList.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent,
    DialogTitle, IconButton, InputAdornment, Menu, MenuItem,
    Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TablePagination, TableRow, TextField, Typography,
    CircularProgress, Tooltip, FormControl, InputLabel, Select,
    Card, CardContent, Divider, useMediaQuery, useTheme, Grid
} from '@mui/material';
import {
    MoreVert as MoreVertIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon,
    SwapHoriz as TransferIcon,
    AssignmentReturn as ReturnIcon,
    FiberManualRecord as StatusIcon
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

// Movement types that appear in your data
const movementTypeConfig = {
    transfer: { label: 'Transfer', color: 'primary', icon: TransferIcon },
    return_approved: { label: 'Returned', color: 'secondary', icon: ReturnIcon },
};

const MovementCard = ({ movement, onViewDetails }) => {
    const config = movementTypeConfig[movement.movement_type] || { label: movement.movement_type, color: 'default', icon: StatusIcon };
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
                    <Chip icon={<IconComponent />} label={config.label} color={config.color} size="small" />
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
                        <Typography variant="caption" color="text.secondary">Type</Typography>
                        <Typography variant="body2">{movement.movement_type_description || config.label}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">From</Typography>
                        <Typography variant="body2">{movement.from_name}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">To</Typography>
                        <Typography variant="body2">{movement.to_name}</Typography>
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
                </Box>
            </CardContent>
        </Card>
    );
};

export default function StockMovementList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

    const { hasPermission } = usePermission();
    const canView = hasPermission('stock_movements.view');

    const { data, total, loading, fetchData } = useStockMovements();

    const [search, setSearch] = useState('');
    const [movementTypeFilter, setMovementTypeFilter] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedMovement, setSelectedMovement] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [allData, setAllData] = useState([]); // Store all data for client-side filtering

    // Fetch all data once (no pagination params for client-side filtering)
    const fetchAllMovements = useCallback(() => {
        if (!canView) return;
        // Fetch all data without pagination
        fetchData({ per_page: 1000 });
    }, [canView, fetchData]);

    useEffect(() => {
        fetchAllMovements();
    }, [fetchAllMovements]);

    // Update allData when data changes
    useEffect(() => {
        if (Array.isArray(data)) {
            setAllData(data);
        }
    }, [data]);

    // Client-side filtering
    const filteredMovements = useMemo(() => {
        let result = allData;

        // Filter by movement type
        if (movementTypeFilter) {
            result = result.filter(m => m.movement_type === movementTypeFilter);
        }

        // Filter by search
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(m => {
                const searchableFields = [
                    m.product_name,
                    m.imei,
                    m.sku,
                    m.brand,
                    m.model,
                    m.from_name,
                    m.to_name,
                    m.performed_by,
                    m.requester_name,
                    m.request_name,
                    m.notes,
                    m.movement_type_description,
                ].filter(Boolean);

                return searchableFields.some(field =>
                    String(field).toLowerCase().includes(searchLower)
                );
            });
        }

        return result;
    }, [allData, search, movementTypeFilter]);

    // Calculate total filtered count
    const filteredTotal = filteredMovements.length;

    // Paginate the filtered data
    const paginatedMovements = useMemo(() => {
        const start = page * rowsPerPage;
        const end = start + rowsPerPage;
        return filteredMovements.slice(start, end);
    }, [filteredMovements, page, rowsPerPage]);

    const handleMenuOpen = (event, movement) => {
        setSelectedMovement(movement);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => setActionMenu(null);

    const handleViewDetails = () => {
        setModalOpen(true);
        handleMenuClose();
    };

    const handleModalClose = (refresh) => {
        setModalOpen(false);
        setSelectedMovement(null);
        if (refresh) fetchAllMovements();
    };

    const handleClearFilters = () => {
        setSearch('');
        setMovementTypeFilter('');
        setPage(0);
    };

    const handleRefresh = () => {
        fetchAllMovements();
    };

    if (!canView) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography color="error">You do not have permission to view stock movements.</Typography>
            </Box>
        );
    }

    const movements = paginatedMovements;

    const handleCardViewDetails = (movement) => {
        setSelectedMovement(movement);
        setModalOpen(true);
    };

    return (
        <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 }, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden', boxShadow: 1 }}>
                {/* Header & Filters */}
                <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} alignItems="center">
                        <TextField
                            label="Search by product, IMEI, SKU, brand, notes or names"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                            }}
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
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
                            Refresh
                        </Button>
                        {(search || movementTypeFilter) && (
                            <Button variant="text" onClick={handleClearFilters}>Clear Filters</Button>
                        )}
                    </Box>
                    {/* Show filtered count */}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Showing {filteredMovements.length} of {allData.length} movements
                        {search && ` (filtered by: "${search}")`}
                        {movementTypeFilter && ` (type: ${movementTypeConfig[movementTypeFilter]?.label || movementTypeFilter})`}
                    </Typography>
                </Box>

                {/* Table or Card View */}
                {loading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress />
                    </Box>
                ) : showTableView ? (
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
                                {movements.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={headCells.length} align="center">
                                            {allData.length === 0 ? 'No stock movements found' : 'No matching movements found'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    movements.map((movement) => {
                                        const config = movementTypeConfig[movement.movement_type] || { label: movement.movement_type, color: 'default', icon: StatusIcon };
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
                                                    <Typography variant="body2">From: {movement.from_name}</Typography>
                                                    <Typography variant="body2" color="primary">To: {movement.to_name}</Typography>
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
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {movements.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>
                                {allData.length === 0 ? 'No stock movements found' : 'No matching movements found'}
                            </Paper>
                        ) : (
                            movements.map((movement) => (
                                <MovementCard
                                    key={movement.movement_id}
                                    movement={movement}
                                    onViewDetails={handleCardViewDetails}
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
                <MenuItem onClick={handleViewDetails}>View Details</MenuItem>
            </Menu>

            <StockMovementModal open={modalOpen} onClose={handleModalClose} movement={selectedMovement} />
        </Box>
    );
}