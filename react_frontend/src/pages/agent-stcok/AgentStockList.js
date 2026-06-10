// src/pages/agents/AgentStockList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Typography, CircularProgress, Stack, Tooltip
} from '@mui/material';
import { Refresh as RefreshIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { showSnackbar } from 'utils/snackbar';
import { agentSalesService } from 'services/agent-sales.service';

const headCells = [
    { id: 'product_name', label: 'Product Name' },
    { id: 'imei', label: 'IMEI' },
    // Color column removed
    { id: 'category', label: 'Category' },
    { id: 'model', label: 'Model' },
    { id: 'sku', label: 'SKU' },
    { id: 'selling_price', label: 'Selling Price' },
    { id: 'available_qty', label: 'Available Qty', align: 'center' },
    { id: 'actions', label: 'Actions', align: 'center' },
];

// Helper to format price
const formatPrice = (price) => {
    if (!price) return '—';
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(price);
};

// Helper to determine if we are in admin/manager view (has agent_name)
const isAdminView = (stockList) => stockList.length > 0 && stockList[0]?.hasOwnProperty('agent_name');

export default function AgentStockList() {
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const fetchStock = useCallback(async () => {
        setLoading(true);
        try {
            const response = await agentSalesService.getAvailableStock();
            const stockData = response.data?.data || [];
            setStock(Array.isArray(stockData) ? stockData : []);
        } catch (err) {
            console.error(err);
            showSnackbar({ type: 'error', message: err.response?.data?.message || 'Failed to load stock' });
            setStock([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStock();
    }, [fetchStock]);

    const handleViewDetails = (item) => {
        setSelectedProduct(item);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedProduct(null);
    };

    const showAgentColumn = stock.length > 0 && isAdminView(stock);

    // Helper to safely display null values as 'N/A'
    const safeValue = (val) => val || 'N/A';

    return (
        <Box sx={{ width: '100%', p: 2 }}>
            <Paper sx={{ width: '100%', borderRadius: 2, overflow: 'hidden', boxShadow: 3 }}>
                {/* Header */}
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5">
                        {showAgentColumn ? 'Agents Stock Inventory' : 'My Available Stock'}
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchStock}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                </Box>

                {/* Table */}
                <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table sx={{ minWidth: 950 }}>
                        <TableHead>
                            <TableRow>
                                {showAgentColumn && <TableCell>Agent</TableCell>}
                                {headCells.map(cell => (
                                    <TableCell key={cell.id} align={cell.align || 'left'}>
                                        {cell.label}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={showAgentColumn ? headCells.length + 1 : headCells.length} align="center">
                                        <CircularProgress size={28} />
                                    </TableCell>
                                </TableRow>
                            ) : stock.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={showAgentColumn ? headCells.length + 1 : headCells.length} align="center">
                                        <Typography variant="body2" color="text.secondary">No stock available</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                stock.map((item, idx) => (
                                    <TableRow key={idx} hover>
                                        {showAgentColumn && (
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={500}>{item.agent_name || '—'}</Typography>
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={500}>
                                                {item.product_name || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                                                {item.imei || '—'}
                                            </Typography>
                                        </TableCell>
                                        {/* Color cell removed */}
                                        <TableCell>{safeValue(item.category_name)}</TableCell>
                                        <TableCell>{safeValue(item.model)}</TableCell>
                                        <TableCell>{safeValue(item.sku)}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={500}>
                                                {formatPrice(item.selling_price)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={item.available_quantity}
                                                color={item.available_quantity > 0 ? 'success' : 'error'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="View details">
                                                <IconButton size="small" onClick={() => handleViewDetails(item)}>
                                                    <ViewIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Details Modal – Color removed */}
            <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
                <DialogTitle>Product Details</DialogTitle>
                <DialogContent dividers>
                    {selectedProduct && (
                        <Stack spacing={1.5}>
                            <DetailRow label="Product Name" value={selectedProduct.product_name} />
                            <DetailRow label="IMEI" value={selectedProduct.imei} fontFamily="monospace" />
                            {/* Color row removed */}
                            <DetailRow label="Category" value={selectedProduct.category_name} />
                            <DetailRow label="Model" value={selectedProduct.model} />
                            <DetailRow label="SKU" value={selectedProduct.sku} />
                            <DetailRow label="Stock Status" value={selectedProduct.stock_status} />
                            <DetailRow label="Selling Price" value={formatPrice(selectedProduct.selling_price)} />
                            <DetailRow label="Available Quantity" value={selectedProduct.available_quantity} />
                            {selectedProduct.agent_name && (
                                <DetailRow label="Agent" value={selectedProduct.agent_name} />
                            )}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// Helper component for consistent detail rows
const DetailRow = ({ label, value, fontFamily }) => (
    <Box display="flex" alignItems="baseline" gap={2}>
        <Typography variant="body2" fontWeight={600} sx={{ minWidth: 120 }}>
            {label}:
        </Typography>
        <Typography variant="body2" fontFamily={fontFamily || 'inherit'}>
            {value || '—'}
        </Typography>
    </Box>
);