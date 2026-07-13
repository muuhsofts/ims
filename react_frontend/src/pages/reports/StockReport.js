// src/pages/reports/StockReport.js
import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Button,
    Paper,
    Typography,
    CircularProgress,
    Grid,
    Card,
    CardContent,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    IconButton,
    Tooltip,
    TablePagination,
    Menu,
    ListItemIcon,
    ListItemText,
    LinearProgress,
    Stack,
    useTheme,
    useMediaQuery
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Search as SearchIcon,
    Inventory as InventoryIcon,
    FileDownload as FileDownloadIcon,
    TableChart as ExcelIcon,
    TextSnippet as CsvIcon,
    Clear as ClearIcon,
    Warehouse as WarehouseIcon,
    CheckCircle as CheckCircleIcon,
    AttachMoney as MoneyIcon,
    ShoppingCart as ShoppingCartIcon,
    Business as CompanyIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { useCurrentStock } from 'hooks/useSalesReport';
import { showSnackbar } from 'utils/snackbar';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const formatCurrency = (amount) => new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);

const formatLoanOptions = (loanPrices) => {
    if (!loanPrices || loanPrices.length === 0) return '—';
    return loanPrices.map(lp => `${lp.company_name}: ${formatCurrency(lp.price)}`).join('; ');
};

const getStockStatusLabel = (status) => {
    const labels = {
        'in_stock': 'In Stock',
        'low_stock': 'Low Stock',
        'out_of_stock': 'Out of Stock',
        'sold': 'Sold',
        'transferred': 'Transferred',
        'received': 'Received'
    };
    return labels[status] || status;
};

const getStockStatusColor = (status) => {
    switch (status) {
        case 'in_stock': return 'success';
        case 'low_stock': return 'warning';
        case 'out_of_stock': return 'error';
        case 'sold': return 'default';
        case 'transferred': return 'info';
        case 'received': return 'success';
        default: return 'default';
    }
};

export default function StockReport() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const { hasPermission } = usePermission();
    const canView = hasPermission('reports.stock.view');
    const { data, loading, fetchData } = useCurrentStock();
    const [exportAnchorEl, setExportAnchorEl] = useState(null);
    const [warehouseFilter, setWarehouseFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        if (canView) fetchData();
    }, [canView, fetchData]);

    const handleRefresh = () => {
        fetchData();
        setSearchTerm('');
        setPage(0);
        showSnackbar({ type: 'success', message: 'Stock data refreshed!' });
    };

    const getUniqueWarehouses = () => {
        if (!data?.all_products) return [];
        const warehouses = new Map();
        data.all_products.forEach(product => {
            if (product.warehouse_name && !warehouses.has(product.warehouse_id)) {
                warehouses.set(product.warehouse_id, {
                    id: product.warehouse_id,
                    name: product.warehouse_name,
                    location: product.warehouse_location
                });
            }
        });
        return Array.from(warehouses.values());
    };

    // Compute counts
    const computeCounts = (products) => {
        const total = products.length;
        let inStock = 0;
        products.forEach(p => {
            if (p.stock_status === 'in_stock') inStock++;
        });
        return { total, inStock };
    };

    // Compute financial summary
    const computeFinancialSummary = (products) => {
        let totalBuyingPrice = 0;
        let totalCashPrice = 0;
        const loanByCompany = {};

        products.forEach(p => {
            totalBuyingPrice += p.buying_price || 0;
            totalCashPrice += p.cash_selling_price || 0;

            if (p.loan_prices && Array.isArray(p.loan_prices)) {
                p.loan_prices.forEach(lp => {
                    const name = lp.company_name || 'Unknown';
                    loanByCompany[name] = (loanByCompany[name] || 0) + (lp.price || 0);
                });
            }
        });

        return { totalBuyingPrice, totalCashPrice, loanByCompany };
    };

    const getExportData = () => {
        if (!data?.all_products) return [];
        const filteredProducts = filterProducts(data.all_products);
        return filteredProducts.map(product => ({
            'Warehouse': product.warehouse_name || 'Unknown',
            'Location': product.warehouse_location || 'Unknown',
            'Product': product.category_name || 'Unknown',
            'Model': product.model || 'N/A',
            'SKU': product.sku || 'N/A',
            'IMEI': product.imei || 'N/A',
            'Stock Status': getStockStatusLabel(product.stock_status),
            'Buying Price': formatCurrency(product.buying_price),
            'Cash Selling Price': formatCurrency(product.cash_selling_price),
            'Loan Options': formatLoanOptions(product.loan_prices)
        }));
    };

    const exportToExcel = () => {
        try {
            const exportData = getExportData();
            if (exportData.length === 0) throw new Error('No data');
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Report');
            XLSX.writeFile(workbook, `stock_report_${dayjs().format('DD-MM-YYYY_HH-mm')}.xlsx`);
            showSnackbar({ type: 'success', message: 'Report exported to Excel successfully!' });
        } catch (error) {
            showSnackbar({ type: 'warning', message: 'No data to export' });
        }
        handleExportClose();
    };

    const exportToCSV = () => {
        try {
            const exportData = getExportData();
            if (exportData.length === 0) throw new Error('No data');
            const headers = Object.keys(exportData[0]);
            const csvRows = [headers.join(',')];
            for (const row of exportData) {
                const values = headers.map(header => `"${String(row[header] || '').replace(/"/g, '""')}"`);
                csvRows.push(values.join(','));
            }
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `stock_report_${dayjs().format('DD-MM-YYYY_HH-mm')}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
            showSnackbar({ type: 'success', message: 'Report exported to CSV successfully!' });
        } catch (error) {
            showSnackbar({ type: 'warning', message: 'No data to export' });
        }
        handleExportClose();
    };

    const handleExportClick = (event) => setExportAnchorEl(event.currentTarget);
    const handleExportClose = () => setExportAnchorEl(null);

    const handleSearchChange = (event) => { setSearchTerm(event.target.value); setPage(0); };
    const clearSearch = () => { setSearchTerm(''); setPage(0); };

    const filterProducts = (products) => {
        let filtered = products || [];
        if (warehouseFilter !== 'all') filtered = filtered.filter(p => p.warehouse_id === warehouseFilter);
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.imei?.toLowerCase().includes(term) ||
                p.category_name?.toLowerCase().includes(term) ||
                p.model?.toLowerCase().includes(term) ||
                p.sku?.toLowerCase().includes(term) ||
                p.warehouse_name?.toLowerCase().includes(term) ||
                p.warehouse_location?.toLowerCase().includes(term)
            );
        }
        return filtered;
    };

    if (!canView) {
        return <Box sx={{ p: 2 }}><Alert severity="error">You do not have permission to view stock reports.</Alert></Box>;
    }

    const allProducts = data?.all_products || [];
    const warehouses = getUniqueWarehouses();
    const filteredProducts = filterProducts(allProducts);
    const paginatedProducts = filteredProducts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const counts = computeCounts(filteredProducts);
    const financialSummary = computeFinancialSummary(filteredProducts);

    const loanCompanyCards = Object.entries(financialSummary.loanByCompany).map(([company, total]) => ({
        company,
        total
    }));

    return (
        <Box sx={{ p: { xs: 1, sm: 2 }, bgcolor: 'background.default', minHeight: '100vh' }}>
            <Paper sx={{ borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden', bgcolor: 'background.paper' }}>
                {/* Header */}
                <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                        <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                            <InventoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Stock Report
                        </Typography>
                        <Box>
                            <Tooltip title="Refresh Data">
                                <Button variant="contained" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={loading} sx={{ mr: 1 }}>
                                    Refresh
                                </Button>
                            </Tooltip>
                            {allProducts.length > 0 && (
                                <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExportClick}>
                                    Export
                                </Button>
                            )}
                            <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={handleExportClose}>
                                <MenuItem onClick={exportToExcel}><ListItemIcon><ExcelIcon color="success" /></ListItemIcon><ListItemText>Excel</ListItemText></MenuItem>
                                <MenuItem onClick={exportToCSV}><ListItemIcon><CsvIcon color="primary" /></ListItemIcon><ListItemText>CSV</ListItemText></MenuItem>
                            </Menu>
                        </Box>
                    </Box>
                </Box>

                {loading ? (
                    <Box sx={{ p: 5 }}><LinearProgress /><Typography sx={{ textAlign: 'center', mt: 2 }}>Loading stock data...</Typography></Box>
                ) : data ? (
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {/* Combined Stock Summary Card */}
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} sm={6} md={4}>
                                <Card sx={{ bgcolor: 'background.paper', boxShadow: 1, borderRadius: 2 }}>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-around" alignItems="center">
                                            <Box textAlign="center">
                                                <Typography color="textSecondary" variant="caption">Total Stock</Typography>
                                                <Typography variant="h5" fontWeight="bold">{counts.total}</Typography>
                                            </Box>
                                            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
                                            <Box textAlign="center">
                                                <Typography color="textSecondary" variant="caption">In Stock</Typography>
                                                <Typography variant="h5" fontWeight="bold" color="success.main">{counts.inStock}</Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        {/* Financial Summary Cards */}
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>💰 Financial Summary</Typography>
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} sm={4}>
                                <Card sx={{ bgcolor: '#f5f5f5', borderLeft: 4, borderColor: 'error.main', borderRadius: 2 }}>
                                    <CardContent sx={{ py: 1.5 }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography color="textSecondary" variant="caption">Total Buying Price</Typography>
                                                <Typography variant="h5" fontWeight="bold" color="error.main">
                                                    {formatCurrency(financialSummary.totalBuyingPrice)}
                                                </Typography>
                                            </Box>
                                            <ShoppingCartIcon sx={{ fontSize: 28, color: 'error.main' }} />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Card sx={{ bgcolor: '#f5f5f5', borderLeft: 4, borderColor: 'success.main', borderRadius: 2 }}>
                                    <CardContent sx={{ py: 1.5 }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography color="textSecondary" variant="caption">Total Cash Selling Price</Typography>
                                                <Typography variant="h5" fontWeight="bold" color="success.main">
                                                    {formatCurrency(financialSummary.totalCashPrice)}
                                                </Typography>
                                            </Box>
                                            <MoneyIcon sx={{ fontSize: 28, color: 'success.main' }} />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                            {loanCompanyCards.length > 0 && (
                                <Grid item xs={12} sm={4}>
                                    <Card sx={{ bgcolor: '#f5f5f5', borderLeft: 4, borderColor: 'info.main', borderRadius: 2 }}>
                                        <CardContent sx={{ py: 1.5 }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Box>
                                                    <Typography color="textSecondary" variant="caption">Total Loan Price</Typography>
                                                    <Stack spacing={0.5}>
                                                        {loanCompanyCards.map((item, idx) => (
                                                            <Typography key={idx} variant="body2" fontWeight="bold" color="info.dark">
                                                                {item.company}: {formatCurrency(item.total)}
                                                            </Typography>
                                                        ))}
                                                    </Stack>
                                                </Box>
                                                <CompanyIcon sx={{ fontSize: 28, color: 'info.main' }} />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            )}
                        </Grid>

                        {/* Search & Warehouse Filter */}
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
                            <TextField
                                size="small"
                                placeholder="🔍 Search by IMEI, Product, Model, SKU..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                sx={{ flex: 1 }}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                                    endAdornment: searchTerm && (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={clearSearch}><ClearIcon /></IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>Warehouse</InputLabel>
                                <Select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
                                    <MenuItem value="all">All Warehouses</MenuItem>
                                    {warehouses.map(wh => (
                                        <MenuItem key={wh.id} value={wh.id}>
                                            <WarehouseIcon fontSize="small" sx={{ mr: 0.5 }} /> {wh.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        {searchTerm && (
                            <Alert severity="info" icon={<SearchIcon />} sx={{ mb: 2 }}>
                                Found {filteredProducts.length} product(s) matching "{searchTerm}"
                            </Alert>
                        )}

                        {/* Table */}
                        {filteredProducts.length === 0 ? (
                            <Alert severity="warning">No products found matching your criteria.</Alert>
                        ) : (
                            <>
                                <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                                    <Table size="small" sx={{ minWidth: 1300 }}>
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                                                <TableCell><b>Product</b></TableCell>
                                                <TableCell><b>Model</b></TableCell>
                                                <TableCell><b>SKU</b></TableCell>
                                                <TableCell><b>IMEI</b></TableCell>
                                                <TableCell><b>Warehouse</b></TableCell>
                                                <TableCell><b>Location</b></TableCell>
                                                <TableCell><b>Status</b></TableCell>
                                                <TableCell align="right"><b>Buying</b></TableCell>
                                                <TableCell align="right"><b>Cash</b></TableCell>
                                                <TableCell><b>Loan Options</b></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {paginatedProducts.map((p, i) => {
                                                const loanOptions = p.loan_prices || [];
                                                return (
                                                    <TableRow key={i} hover>
                                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{p.category_name || 'Unknown'}</TableCell>
                                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{p.model || 'N/A'}</TableCell>
                                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{p.sku || 'N/A'}</TableCell>
                                                        <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{p.imei || 'N/A'}</TableCell>
                                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{p.warehouse_name || 'Unknown'}</TableCell>
                                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{p.warehouse_location || 'N/A'}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={getStockStatusLabel(p.stock_status)}
                                                                size="small"
                                                                color={getStockStatusColor(p.stock_status)}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(p.buying_price)}</TableCell>
                                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(p.cash_selling_price || 0)}</TableCell>
                                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                            <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: '4px', overflowX: 'auto', maxWidth: '300px' }}>
                                                                {loanOptions.map((lp, idx) => (
                                                                    <Chip key={idx} label={`${lp.company_name}: ${formatCurrency(lp.price)}`} size="small" variant="outlined" />
                                                                ))}
                                                                {loanOptions.length === 0 && <Typography variant="caption">—</Typography>}
                                                            </Box>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <TablePagination
                                    component="div"
                                    count={filteredProducts.length}
                                    page={page}
                                    onPageChange={(e, p) => setPage(p)}
                                    rowsPerPage={rowsPerPage}
                                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                                    rowsPerPageOptions={[5, 10, 25, 50, 100]}
                                    sx={{
                                        '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                        }
                                    }}
                                />
                            </>
                        )}
                    </Box>
                ) : (
                    <Box sx={{ p: 5, textAlign: 'center' }}>
                        <InventoryIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                        <Typography color="textSecondary">Click "Refresh" to load stock data</Typography>
                    </Box>
                )}
            </Paper>
        </Box>
    );
}