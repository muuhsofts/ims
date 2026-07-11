// src/pages/agents/AgentStockList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Typography, CircularProgress, Stack, Tooltip,
    Card, CardContent, Divider, useMediaQuery, useTheme, Grid, Collapse
} from '@mui/material';
import { Refresh as RefreshIcon, Visibility as ViewIcon, Person as PersonIcon, Business as BusinessIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import { showSnackbar } from 'utils/snackbar';
import { agentSalesService } from 'services/agent-sales.service';

const headCells = [
    { id: 'product_name', label: 'Product Name' },
    { id: 'imei', label: 'IMEI' },
    { id: 'category', label: 'Category' },
    { id: 'model', label: 'Model' },
    { id: 'sku', label: 'SKU' },
    { id: 'cash_selling_price', label: 'Cash Price' },
    { id: 'loan_prices', label: 'Loan Prices' },
    { id: 'available_qty', label: 'Available Qty', align: 'center' },
    { id: 'actions', label: 'Actions', align: 'center' },
];

// Helper to format price
const formatPrice = (price) => {
    if (price === null || price === undefined || isNaN(price)) return '—';
    return `TSh ${parseFloat(price).toLocaleString()}`;
};

// Helper to determine if we are in admin/manager view (has agent_name)
const isAdminView = (stockList) => stockList.length > 0 && stockList[0]?.hasOwnProperty('agent_name');

// Helper component for consistent detail rows in modal
const DetailRow = ({ label, value, fontFamily }) => (
    <Box display="flex" alignItems="baseline" gap={2} flexWrap="wrap">
        <Typography variant="body2" fontWeight={600} sx={{ minWidth: 120 }}>
            {label}:
        </Typography>
        <Typography variant="body2" fontFamily={fontFamily || 'inherit'}>
            {value !== null && value !== undefined ? value : '—'}
        </Typography>
    </Box>
);

// ✅ Get loan prices from product
const getLoanPrices = (product) => {
    if (!product?.loan_prices) return [];
    return Array.isArray(product.loan_prices) ? product.loan_prices : [];
};

// Stock Card Component (used on mobile/tablet)
const StockCard = ({ item, showAgent, onViewDetails }) => {
    const safeValue = (val) => (val !== null && val !== undefined ? val : 'N/A');
    const loanPrices = getLoanPrices(item);
    const hasLoanPrices = loanPrices.length > 0;
    const [expanded, setExpanded] = useState(false);

    return (
        <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
            <CardContent sx={{ p: 2 }}>
                {showAgent && (
                    <>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <PersonIcon fontSize="small" color="action" />
                            <Typography variant="subtitle2" fontWeight="bold">
                                {item.agent_name || '—'}
                            </Typography>
                        </Box>
                        <Divider sx={{ my: 1 }} />
                    </>
                )}
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {item.product_name || '—'}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mb: 0.5 }}>
                    IMEI: {item.imei || '—'}
                </Typography>
                <Grid container spacing={1} sx={{ mt: 0.5 }}>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Category</Typography>
                        <Typography variant="body2">{safeValue(item.category_name)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Model</Typography>
                        <Typography variant="body2">{safeValue(item.model)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">SKU</Typography>
                        <Typography variant="body2">{safeValue(item.sku)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Cash Price</Typography>
                        <Typography variant="body2" fontWeight="bold">{formatPrice(item.cash_selling_price)}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">Loan Prices</Typography>
                        {hasLoanPrices ? (
                            <Box sx={{ mt: 0.5 }}>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <BusinessIcon fontSize="small" color="primary" sx={{ fontSize: '0.8rem' }} />
                                    <Typography variant="caption" fontWeight="bold">
                                        {loanPrices.length} company{loanPrices.length > 1 ? 'ies' : ''}
                                    </Typography>
                                    <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                                        {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                    </IconButton>
                                </Box>
                                <Collapse in={expanded}>
                                    {loanPrices.map((lp, idx) => (
                                        <Typography key={idx} variant="caption" display="block" sx={{ fontSize: '0.7rem', ml: 1 }}>
                                            {lp.company_name}: {formatPrice(lp.price)}
                                        </Typography>
                                    ))}
                                </Collapse>
                                {!expanded && loanPrices.length > 2 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                        +{loanPrices.length - 2} more
                                    </Typography>
                                )}
                            </Box>
                        ) : (
                            <Typography variant="body2" color="text.secondary">N/A</Typography>
                        )}
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Available Qty</Typography>
                        <Chip label={item.available_quantity} color={item.available_quantity > 0 ? 'success' : 'error'} size="small" />
                    </Grid>
                </Grid>
                <Box display="flex" justifyContent="flex-end" mt={2}>
                    <Button size="small" variant="outlined" startIcon={<ViewIcon />} onClick={() => onViewDetails(item)}>
                        View Details
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};

// ✅ Loan Prices Cell for table
const LoanPricesCell = ({ product }) => {
    const loanPrices = getLoanPrices(product);
    const [expanded, setExpanded] = useState(false);
    const displayCount = 2;

    if (loanPrices.length === 0) {
        return <Typography variant="body2" color="text.secondary">N/A</Typography>;
    }

    const visiblePrices = expanded ? loanPrices : loanPrices.slice(0, displayCount);
    const hasMore = loanPrices.length > displayCount;

    return (
        <Box>
            <Box display="flex" alignItems="center" gap={0.5}>
                <BusinessIcon fontSize="small" color="primary" sx={{ fontSize: '0.8rem' }} />
                <Typography variant="caption" fontWeight="bold">
                    {loanPrices.length} company{loanPrices.length > 1 ? 'ies' : ''}
                </Typography>
                <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                    {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
            </Box>
            <Collapse in={expanded || loanPrices.length <= displayCount}>
                <Box sx={{ mt: 0.5 }}>
                    {visiblePrices.map((lp, idx) => (
                        <Typography key={idx} variant="caption" display="block" sx={{ fontSize: '0.7rem' }}>
                            {lp.company_name}: {formatPrice(lp.price)}
                        </Typography>
                    ))}
                    {hasMore && !expanded && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            +{loanPrices.length - displayCount} more
                        </Typography>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
};

export default function AgentStockList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

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
    const safeValue = (val) => (val !== null && val !== undefined ? val : 'N/A');

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: 3 }}>
                {/* Header */}
                <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                        {showAgentColumn ? 'Agents Stock Inventory' : ' Available Stock'}
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchStock}
                        disabled={loading}
                        fullWidth={isMobile}
                    >
                        Refresh
                    </Button>
                </Box>

                {/* Table View (Desktop) */}
                {showTableView ? (
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table sx={{ minWidth: 1150 }}>
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
                                                <Typography variant="body2" fontWeight={500}>{item.product_name || '—'}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">{item.imei || '—'}</Typography>
                                            </TableCell>
                                            <TableCell>{safeValue(item.category_name)}</TableCell>
                                            <TableCell>{safeValue(item.model)}</TableCell>
                                            <TableCell>{safeValue(item.sku)}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={500}>{formatPrice(item.cash_selling_price)}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <LoanPricesCell product={item} />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip label={item.available_quantity} color={item.available_quantity > 0 ? 'success' : 'error'} size="small" />
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
                ) : (
                    // Card View (Mobile/Tablet)
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}>
                                <CircularProgress />
                            </Box>
                        ) : stock.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>
                                <Typography color="text.secondary">No stock available</Typography>
                            </Paper>
                        ) : (
                            stock.map((item, idx) => (
                                <StockCard
                                    key={idx}
                                    item={item}
                                    showAgent={showAgentColumn}
                                    onViewDetails={handleViewDetails}
                                />
                            ))
                        )}
                    </Box>
                )}
            </Paper>

            {/* Details Modal */}
            <Dialog
                open={modalOpen}
                onClose={handleCloseModal}
                maxWidth="sm"
                fullWidth
                fullScreen={isMobile}
                PaperProps={{ sx: { borderRadius: { xs: 0, sm: 2 } } }}
            >
                <DialogTitle sx={{ pb: 1 }}>Product Details</DialogTitle>
                <DialogContent dividers>
                    {selectedProduct && (
                        <Stack spacing={1.5}>
                            <DetailRow label="Product Name" value={selectedProduct.product_name} />
                            <DetailRow label="IMEI" value={selectedProduct.imei} fontFamily="monospace" />
                            <DetailRow label="Category" value={selectedProduct.category_name} />
                            <DetailRow label="Model" value={selectedProduct.model} />
                            <DetailRow label="SKU" value={selectedProduct.sku} />
                            <DetailRow label="Stock Status" value={selectedProduct.stock_status} />
                            <DetailRow label="Cash Price" value={formatPrice(selectedProduct.cash_selling_price)} />

                            {/* ✅ Loan Prices in Modal */}
                            <Box>
                                <Typography variant="body2" fontWeight={600} sx={{ minWidth: 120, display: 'inline-block' }}>
                                    Loan Prices:
                                </Typography>
                                {getLoanPrices(selectedProduct).length > 0 ? (
                                    <Box sx={{ mt: 0.5, ml: 2 }}>
                                        {getLoanPrices(selectedProduct).map((lp, idx) => (
                                            <Typography key={idx} variant="body2">
                                                • {lp.company_name}: {formatPrice(lp.price)}
                                            </Typography>
                                        ))}
                                    </Box>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                                        N/A
                                    </Typography>
                                )}
                            </Box>

                            <DetailRow label="Available Quantity" value={selectedProduct.available_quantity} />
                            {selectedProduct.agent_name && <DetailRow label="Agent" value={selectedProduct.agent_name} />}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseModal}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}