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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    TextField,
    InputAdornment,
    ToggleButton,
    ToggleButtonGroup,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Stack,
    Collapse,
    IconButton,
    Tooltip,
    TablePagination,
    Menu,
    ListItemIcon,
    ListItemText,
    LinearProgress,
    useTheme,
    alpha
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Search as SearchIcon,
    AttachMoney as MoneyIcon,
    Inventory as InventoryIcon,
    LocationOn as LocationIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Cancel as CancelIcon,
    FileDownload as FileDownloadIcon,
    TableChart as ExcelIcon,
    TextSnippet as CsvIcon,
    Print as PrintIcon,
    ColorLens as ColorIcon,
    QrCode as SkuIcon,
    Smartphone as ModelIcon,
    Warehouse as WarehouseIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    FilterList as FilterIcon,
    TableRows as TableRowsIcon,
    Clear as ClearIcon,
    ProductionQuantityLimits as ProductIcon,
    ShoppingCart as ShoppingCartIcon,
    Paid as PaidIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { useCurrentStock } from 'hooks/useSalesReport';
import { showSnackbar } from 'utils/snackbar';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const formatNumber = (number) => {
    return number?.toLocaleString() || 0;
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sw-TZ', {
        style: 'currency',
        currency: 'TZS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount || 0);
};

const getStockStatusIcon = (status) => {
    switch (status) {
        case 'in_stock': return <CheckCircleIcon sx={{ fontSize: 14 }} />;
        case 'low_stock': return <WarningIcon sx={{ fontSize: 14 }} />;
        case 'out_of_stock': return <CancelIcon sx={{ fontSize: 14 }} />;
        case 'sold': return <CheckCircleIcon sx={{ fontSize: 14 }} />;
        case 'transferred': return <InventoryIcon sx={{ fontSize: 14 }} />;
        case 'received': return <CheckCircleIcon sx={{ fontSize: 14 }} />;
        default: return <InventoryIcon sx={{ fontSize: 14 }} />;
    }
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

export default function StockReport() {
    const theme = useTheme();
    const { hasPermission } = usePermission();
    const canView = hasPermission('reports.stock.view');

    const { data, loading, fetchData } = useCurrentStock();
    const [exportAnchorEl, setExportAnchorEl] = useState(null);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [expandedWarehouses, setExpandedWarehouses] = useState({});
    const [warehouseFilter, setWarehouseFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState('product');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortBy, setSortBy] = useState('product');
    const [sortOrder, setSortOrder] = useState('asc');
    const [showFilters, setShowFilters] = useState(true);
    const printRef = useRef();

    useEffect(() => {
        if (canView) {
            fetchData();
        }
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

    const getWarehouseSummary = () => {
        const warehouses = getUniqueWarehouses();
        return warehouses.map(wh => {
            const whProducts = (data?.all_products || []).filter(p => p.warehouse_id === wh.id);
            const totalBuying = whProducts.reduce((sum, p) => sum + (p.buying_price * p.quantity), 0);
            const totalSelling = whProducts.reduce((sum, p) => sum + (p.selling_price * p.quantity), 0);
            const totalProfit = totalSelling - totalBuying;
            return {
                ...wh,
                productCount: whProducts.length,
                totalUnits: whProducts.reduce((sum, p) => sum + p.quantity, 0),
                totalBuying,
                totalSelling,
                totalProfit
            };
        });
    };

    const getExportData = () => {
        if (!data?.all_products) return [];
        
        const filteredProducts = filterProductsByWarehouseAndStatusAndSearch(data.all_products);
        
        return filteredProducts.map(product => {
            const profit = (parseFloat(product.selling_price) || 0) - (parseFloat(product.buying_price) || 0);
            return {
                'Warehouse': product.warehouse_name || 'Unknown',
                'Location': product.warehouse_location || 'Unknown',
                'Product': product.category_name || 'Unknown',
                'Model': product.model || 'N/A',
                'SKU': product.sku || 'N/A',
                'IMEI': product.imei || 'N/A',
                'Color': product.color || 'N/A',
                'Quantity': product.quantity || 1,
                'Stock Status': getStockStatusLabel(product.stock_status),
                'Buying Price': formatCurrency(product.buying_price),
                'Selling Price': formatCurrency(product.selling_price),
                'Expected Profit': formatCurrency(profit)
            };
        });
    };

    const exportToExcel = () => {
        try {
            const exportData = getExportData();
            if (exportData.length === 0) {
                showSnackbar({ type: 'warning', message: 'No data to export' });
                return;
            }
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Report');
            XLSX.writeFile(workbook, `stock_report_${dayjs().format('DD-MM-YYYY_HH-mm')}.xlsx`);
            showSnackbar({ type: 'success', message: 'Report exported to Excel successfully!' });
        } catch (error) {
            showSnackbar({ type: 'error', message: 'Failed to export to Excel' });
        }
        handleExportClose();
    };

    const exportToCSV = () => {
        try {
            const exportData = getExportData();
            if (exportData.length === 0) {
                showSnackbar({ type: 'warning', message: 'No data to export' });
                return;
            }
            const headers = Object.keys(exportData[0]);
            const csvRows = [headers.join(',')];
            for (const row of exportData) {
                const values = headers.map(header => {
                    const value = row[header] || '';
                    return `"${String(value).replace(/"/g, '""')}"`;
                });
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
            showSnackbar({ type: 'error', message: 'Failed to export to CSV' });
        }
        handleExportClose();
    };

    const printReport = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Stock Report</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: Arial, sans-serif; margin: 20px; padding: 20px; background: white; }
                        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #4CAF50; }
                        .summary { margin-bottom: 20px; padding: 15px; background: #f5f5f5; display: flex; justify-content: space-around; flex-wrap: wrap; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
                        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
                        th { background-color: #4CAF50; color: white; font-weight: bold; }
                        .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Stock Report</h1>
                        <p>Generated: ${dayjs().format('DD/MM/YYYY HH:mm:ss')}</p>
                    </div>
                    ${printContent.innerHTML}
                    <div class="footer">Report generated on ${dayjs().format('DD/MM/YYYY HH:mm:ss')}</div>
                    <script>window.onload = function() { window.print(); setTimeout(window.close, 500); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
        handleExportClose();
    };

    const handleExportClick = (event) => {
        setExportAnchorEl(event.currentTarget);
    };

    const handleExportClose = () => {
        setExportAnchorEl(null);
    };

    const toggleCategoryExpand = (categoryId) => {
        setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
    };

    const toggleWarehouseExpand = (warehouseId) => {
        setExpandedWarehouses(prev => ({ ...prev, [warehouseId]: !prev[warehouseId] }));
    };

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };

    const clearSearch = () => {
        setSearchTerm('');
        setPage(0);
    };

    const filterProductsByWarehouseAndStatusAndSearch = (products) => {
        let filtered = products;
        
        if (warehouseFilter !== 'all') {
            filtered = filtered.filter(p => p.warehouse_id === warehouseFilter);
        }
        if (statusFilter !== 'all') {
            filtered = filtered.filter(p => p.stock_status === statusFilter);
        }
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.imei?.toLowerCase().includes(term) ||
                p.color?.toLowerCase().includes(term) ||
                p.category_name?.toLowerCase().includes(term) ||
                p.model?.toLowerCase().includes(term) ||
                p.sku?.toLowerCase().includes(term) ||
                p.warehouse_name?.toLowerCase().includes(term) ||
                p.warehouse_location?.toLowerCase().includes(term)
            );
        }
        
        return filtered;
    };

    const sortProducts = (products) => {
        if (sortBy === 'product') {
            return [...products].sort((a, b) => {
                const comparison = (a.category_name || '').localeCompare(b.category_name || '');
                return sortOrder === 'asc' ? comparison : -comparison;
            });
        } else if (sortBy === 'price') {
            return [...products].sort((a, b) => {
                const comparison = (a.selling_price || 0) - (b.selling_price || 0);
                return sortOrder === 'asc' ? comparison : -comparison;
            });
        } else if (sortBy === 'profit') {
            return [...products].sort((a, b) => {
                const profitA = (a.selling_price || 0) - (a.buying_price || 0);
                const profitB = (b.selling_price || 0) - (b.buying_price || 0);
                const comparison = profitA - profitB;
                return sortOrder === 'asc' ? comparison : -comparison;
            });
        }
        return products;
    };

    if (!canView) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error">You do not have permission to view stock reports.</Alert>
            </Box>
        );
    }

    const summaryData = data?.summary || { total_unique_products: 0, total_units: 0, total_value: 0, average_unit_price: 0 };
    const stockByCategory = data?.stock_by_category || [];
    const allProducts = data?.all_products || [];
    const warehouses = getUniqueWarehouses();
    const warehouseSummary = getWarehouseSummary();

    const filteredProducts = filterProductsByWarehouseAndStatusAndSearch(allProducts);
    const sortedFilteredProducts = sortProducts(filteredProducts);
    
    const totalBuying = filteredProducts.reduce((sum, p) => sum + (p.buying_price * p.quantity), 0);
    const totalSelling = filteredProducts.reduce((sum, p) => sum + (p.selling_price * p.quantity), 0);
    const totalProfit = totalSelling - totalBuying;
    const profitPercentage = totalBuying > 0 ? (totalProfit / totalBuying) * 100 : 0;

    const paginatedProducts = sortedFilteredProducts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Box sx={{ p: 2, bgcolor: 'background.default', minHeight: '100vh' }}>
            <Paper sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: 'background.paper' }}>
                {/* Header */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }} className="no-print">
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                        <Typography variant="h5" fontWeight="bold">
                            <InventoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Stock Report
                        </Typography>
                        <Box>
                            <Tooltip title="Refresh Data">
                                <span>
                                    <Button 
                                        variant="contained" 
                                        startIcon={<RefreshIcon />} 
                                        onClick={handleRefresh} 
                                        disabled={loading} 
                                        sx={{ mr: 1 }}
                                    >
                                        Refresh
                                    </Button>
                                </span>
                            </Tooltip>
                            {allProducts.length > 0 && (
                                <Button 
                                    variant="outlined" 
                                    startIcon={<FileDownloadIcon />} 
                                    onClick={handleExportClick}
                                >
                                    Export
                                </Button>
                            )}
                            <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={handleExportClose}>
                                <MenuItem onClick={exportToExcel}>
                                    <ListItemIcon><ExcelIcon color="success" /></ListItemIcon>
                                    <ListItemText>Excel</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={exportToCSV}>
                                    <ListItemIcon><CsvIcon color="primary" /></ListItemIcon>
                                    <ListItemText>CSV</ListItemText>
                                </MenuItem>
                                
                            </Menu>
                        </Box>
                    </Box>
                </Box>

                {loading ? (
                    <Box sx={{ p: 5 }}>
                        <LinearProgress />
                        <Typography sx={{ textAlign: 'center', mt: 2 }}>Loading stock data...</Typography>
                    </Box>
                ) : data ? (
                    <Box ref={printRef} sx={{ p: 2 }}>
                        {/* Period Info */}
                        <Typography variant="subtitle1" color="primary" gutterBottom>
                            📊 Current Stock Snapshot - {dayjs().format('DD/MM/YYYY HH:mm:ss')}
                        </Typography>

                        {/* Summary Cards */}
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} sm={6} md={2.4}>
                                <Card sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" justifyContent="space-between">
                                            <Box>
                                                <Typography color="textSecondary" variant="caption">Unique Products</Typography>
                                                <Typography variant="h4" fontWeight="bold" color="text.primary">{summaryData.total_unique_products}</Typography>
                                            </Box>
                                            <InventoryIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={2.4}>
                                <Card sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" justifyContent="space-between">
                                            <Box>
                                                <Typography color="textSecondary" variant="caption">Total Units</Typography>
                                                <Typography variant="h4" fontWeight="bold" color="info.main">{summaryData.total_units}</Typography>
                                            </Box>
                                            <InventoryIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.7 }} />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={2.4}>
                                <Card sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" justifyContent="space-between">
                                            <Box>
                                                <Typography color="textSecondary" variant="caption">Total Value</Typography>
                                                <Typography variant="h4" fontWeight="bold" color="success.main">{formatCurrency(summaryData.total_value)}</Typography>
                                            </Box>
                                            <MoneyIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={2.4}>
                                <Card sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" justifyContent="space-between">
                                            <Box>
                                                <Typography color="textSecondary" variant="caption">Avg Price</Typography>
                                                <Typography variant="h4" fontWeight="bold" color="warning.main">{formatCurrency(summaryData.average_unit_price)}</Typography>
                                            </Box>
                                            <MoneyIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={2.4}>
                                <Card sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" justifyContent="space-between">
                                            <Box>
                                                <Typography color="textSecondary" variant="caption">Warehouses</Typography>
                                                <Typography variant="h4" fontWeight="bold" color="secondary.main">{warehouses.length}</Typography>
                                            </Box>
                                            <WarehouseIcon sx={{ fontSize: 40, color: 'secondary.main', opacity: 0.7 }} />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        {/* Financial Summary Cards - Total Buying, Selling, Expected Profit */}
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={4}>
                                <Card sx={{ 
                                    bgcolor: theme.palette.mode === 'dark' ? alpha('#f44336', 0.1) : '#ffebee',
                                    borderLeft: 4, 
                                    borderColor: 'error.main',
                                    boxShadow: 1
                                }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" justifyContent="space-between">
                                            <Box>
                                                <Typography variant="caption" color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <ShoppingCartIcon sx={{ fontSize: 16 }} /> Total Buying Price
                                                </Typography>
                                                <Typography variant="h4" fontWeight="bold" color="error.main">
                                                    {formatCurrency(totalBuying)}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ 
                                                bgcolor: alpha(theme.palette.error.main, 0.1), 
                                                borderRadius: 2, 
                                                p: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <ShoppingCartIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.7 }} />
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Card sx={{ 
                                    bgcolor: theme.palette.mode === 'dark' ? alpha('#4caf50', 0.1) : '#e8f5e9',
                                    borderLeft: 4, 
                                    borderColor: 'success.main',
                                    boxShadow: 1
                                }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" justifyContent="space-between">
                                            <Box>
                                                <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <PaidIcon sx={{ fontSize: 16 }} /> Total Selling Price
                                                </Typography>
                                                <Typography variant="h4" fontWeight="bold" color="success.main">
                                                    {formatCurrency(totalSelling)}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ 
                                                bgcolor: alpha(theme.palette.success.main, 0.1), 
                                                borderRadius: 2, 
                                                p: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <PaidIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Card sx={{ 
                                    bgcolor: theme.palette.mode === 'dark' ? alpha(totalProfit >= 0 ? '#4caf50' : '#f44336', 0.1) : (totalProfit >= 0 ? '#e8f5e9' : '#ffebee'),
                                    borderLeft: 4, 
                                    borderColor: totalProfit >= 0 ? 'success.main' : 'error.main',
                                    boxShadow: 1
                                }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" justifyContent="space-between">
                                            <Box>
                                                <Typography variant="caption" color={totalProfit >= 0 ? 'success.main' : 'error.main'} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <TrendingUpIcon sx={{ fontSize: 16 }} /> Expected Profit
                                                </Typography>
                                                <Typography variant="h4" fontWeight="bold" color={totalProfit >= 0 ? 'success.main' : 'error.main'}>
                                                    {formatCurrency(totalProfit)}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    ({profitPercentage.toFixed(2)}% margin)
                                                </Typography>
                                            </Box>
                                            <Box sx={{ 
                                                bgcolor: alpha(totalProfit >= 0 ? theme.palette.success.main : theme.palette.error.main, 0.1), 
                                                borderRadius: 2, 
                                                p: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <TrendingUpIcon sx={{ fontSize: 40, color: totalProfit >= 0 ? 'success.main' : 'error.main', opacity: 0.7 }} />
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        {/* Filters Section */}
                        <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <FilterIcon />
                                        Filters & Search
                                    </Typography>
                                    <IconButton size="small" onClick={() => setShowFilters(!showFilters)}>
                                        <ExpandMoreIcon sx={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                                    </IconButton>
                                </Box>
                                <Collapse in={showFilters}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={3}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>🏢 Warehouse</InputLabel>
                                                <Select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
                                                    <MenuItem value="all">All Warehouses</MenuItem>
                                                    {warehouses.map(wh => (
                                                        <MenuItem key={wh.id} value={wh.id}>
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <WarehouseIcon fontSize="small" />
                                                                {wh.name}
                                                            </Box>
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} md={3}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>📦 Stock Status</InputLabel>
                                                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                                    <MenuItem value="all">All Status</MenuItem>
                                                    <MenuItem value="in_stock">✅ In Stock</MenuItem>
                                                    <MenuItem value="sold">💰 Sold</MenuItem>
                                                    <MenuItem value="low_stock">⚠️ Low Stock</MenuItem>
                                                    <MenuItem value="out_of_stock">❌ Out of Stock</MenuItem>
                                                    <MenuItem value="transferred">🚚 Transferred</MenuItem>
                                                    <MenuItem value="received">📥 Received</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} md={3}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                placeholder="🔍 Search by IMEI, Color, Product, Model, SKU..."
                                                value={searchTerm}
                                                onChange={handleSearchChange}
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <SearchIcon />
                                                        </InputAdornment>
                                                    ),
                                                    endAdornment: searchTerm && (
                                                        <InputAdornment position="end">
                                                            <IconButton size="small" onClick={clearSearch}>
                                                                <ClearIcon />
                                                            </IconButton>
                                                        </InputAdornment>
                                                    )
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={3}>
                                            <ToggleButtonGroup value={viewMode} exclusive onChange={(e, val) => val && setViewMode(val)} size="small" fullWidth>
                                                <ToggleButton value="product">
                                                    <ProductIcon sx={{ mr: 0.5 }} />
                                                    Product
                                                </ToggleButton>
                                                <ToggleButton value="warehouse">
                                                    <WarehouseIcon sx={{ mr: 0.5 }} />
                                                    Warehouse
                                                </ToggleButton>
                                                <ToggleButton value="list">
                                                    <TableRowsIcon sx={{ mr: 0.5 }} />
                                                    List
                                                </ToggleButton>
                                            </ToggleButtonGroup>
                                        </Grid>
                                    </Grid>
                                    
                                    {viewMode === 'list' && (
                                        <Box display="flex" justifyContent="flex-end" alignItems="center" gap={2} mt={2}>
                                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                                <InputLabel>Sort By</InputLabel>
                                                <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                                    <MenuItem value="product">📦 Product</MenuItem>
                                                    <MenuItem value="price">💰 Price</MenuItem>
                                                    <MenuItem value="profit">📈 Profit</MenuItem>
                                                </Select>
                                            </FormControl>
                                            <Tooltip title={sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'}>
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                                    sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}
                                                >
                                                    {sortOrder === 'asc' ? <TrendingUpIcon /> : <TrendingDownIcon />}
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    )}
                                </Collapse>
                            </CardContent>
                        </Card>

                        {/* Search Results Summary */}
                        {searchTerm && (
                            <Alert severity="info" icon={<SearchIcon />} sx={{ mb: 2 }}>
                                Found {filteredProducts.length} product(s) matching "{searchTerm}"
                            </Alert>
                        )}

                        {/* Product View */}
                        {viewMode === 'product' && stockByCategory.map((category, idx) => {
                            let products = filterProductsByWarehouseAndStatusAndSearch(category.products || []);
                            const isExpanded = expandedCategories[category.category_name];
                            if (products.length === 0) return null;
                            return (
                                <Card key={idx} sx={{ mb: 2, overflow: 'hidden', bgcolor: 'background.paper' }}>
                                    <Box 
                                        sx={{ 
                                            p: 2, 
                                            bgcolor: theme.palette.mode === 'dark' ? 'action.hover' : '#f5f5f5', 
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'action.selected' : '#eeeeee' }
                                        }}
                                        onClick={() => toggleCategoryExpand(category.category_name)}
                                    >
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <ProductIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                                            <Box>
                                                <Typography variant="h6" fontWeight="bold">{category.category_name}</Typography>
                                                <Stack direction="row" spacing={1} mt={0.5}>
                                                    {category.model && <Chip icon={<ModelIcon />} label={category.model} size="small" variant="outlined" />}
                                                    {category.sku && <Chip icon={<SkuIcon />} label={category.sku} size="small" variant="outlined" />}
                                                </Stack>
                                            </Box>
                                        </Box>
                                        <Box textAlign="right">
                                            <Typography variant="body2" fontWeight="bold" color="primary.main">
                                                {products.reduce((sum, p) => sum + p.quantity, 0)} Units
                                            </Typography>
                                            <Typography variant="caption" color="success.main">
                                                {formatCurrency(products.reduce((sum, p) => sum + (p.selling_price * p.quantity), 0))}
                                            </Typography>
                                        </Box>
                                        <IconButton size="small">
                                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        </IconButton>
                                    </Box>
                                    <Collapse in={isExpanded}>
                                        <Box sx={{ p: 0 }}>
                                            <TableContainer>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'action.hover' : '#e3f2fd' }}>
                                                            <TableCell><b>Warehouse</b></TableCell>
                                                            <TableCell><b>Location</b></TableCell>
                                                            <TableCell><b>IMEI</b></TableCell>
                                                            <TableCell><b>Color</b></TableCell>
                                                            <TableCell align="right"><b>Qty</b></TableCell>
                                                            <TableCell><b>Status</b></TableCell>
                                                            <TableCell align="right"><b>Buying</b></TableCell>
                                                            <TableCell align="right"><b>Selling</b></TableCell>
                                                            <TableCell align="right"><b>Profit</b></TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {products.map((p, i) => {
                                                            const profit = p.selling_price - p.buying_price;
                                                            return (
                                                                <TableRow key={i} hover>
                                                                    <TableCell>
                                                                        <Chip icon={<WarehouseIcon />} label={p.warehouse_name} size="small" variant="outlined" />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Box display="flex" alignItems="center" gap={0.5}>
                                                                            <LocationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                                            <Typography variant="body2">{p.warehouse_location || 'N/A'}</Typography>
                                                                        </Box>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{p.imei}</Typography>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip 
                                                                            icon={<ColorIcon />} 
                                                                            label={p.color} 
                                                                            size="small" 
                                                                            variant="outlined"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Chip label={p.quantity} size="small" color="primary" />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip 
                                                                            icon={getStockStatusIcon(p.stock_status)} 
                                                                            label={getStockStatusLabel(p.stock_status)} 
                                                                            size="small" 
                                                                            color={getStockStatusColor(p.stock_status)} 
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Typography fontWeight="bold" color="error.main">{formatCurrency(p.buying_price)}</Typography>
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Typography fontWeight="bold" color="success.main">{formatCurrency(p.selling_price)}</Typography>
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Typography fontWeight="bold" color={profit >= 0 ? 'success.main' : 'error.main'}>
                                                                            {formatCurrency(profit)}
                                                                        </Typography>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Box>
                                    </Collapse>
                                </Card>
                            );
                        })}

                        {/* Warehouse View */}
                        {viewMode === 'warehouse' && warehouseSummary.map((wh, idx) => {
                            let products = filterProductsByWarehouseAndStatusAndSearch(allProducts.filter(p => p.warehouse_id === wh.id));
                            const isExpanded = expandedWarehouses[wh.name];
                            if (products.length === 0) return null;
                            const whTotal = products.reduce((sum, p) => sum + (p.buying_price * p.quantity), 0);
                            return (
                                <Card key={idx} sx={{ mb: 2, overflow: 'hidden', bgcolor: 'background.paper' }}>
                                    <Box 
                                        sx={{ 
                                            p: 2, 
                                            bgcolor: theme.palette.mode === 'dark' ? 'action.hover' : '#f5f5f5', 
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'action.selected' : '#eeeeee' }
                                        }}
                                        onClick={() => toggleWarehouseExpand(wh.name)}
                                    >
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <WarehouseIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                                            <Box>
                                                <Typography variant="h6" fontWeight="bold">{wh.name}</Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    <LocationIcon sx={{ fontSize: 12, verticalAlign: 'middle' }} /> {wh.location || 'N/A'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box textAlign="right">
                                            <Typography variant="body2" fontWeight="bold" color="primary.main">
                                                {products.length} Products
                                            </Typography>
                                            <Typography variant="caption" color="success.main">
                                                {formatCurrency(whTotal)}
                                            </Typography>
                                        </Box>
                                        <IconButton size="small">
                                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        </IconButton>
                                    </Box>
                                    <Collapse in={isExpanded}>
                                        <Box sx={{ p: 0 }}>
                                            <TableContainer>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'action.hover' : '#e3f2fd' }}>
                                                            <TableCell><b>Product</b></TableCell>
                                                            <TableCell><b>Model</b></TableCell>
                                                            <TableCell><b>SKU</b></TableCell>
                                                            <TableCell><b>IMEI</b></TableCell>
                                                            <TableCell><b>Color</b></TableCell>
                                                            <TableCell align="right"><b>Qty</b></TableCell>
                                                            <TableCell><b>Status</b></TableCell>
                                                            <TableCell align="right"><b>Buying</b></TableCell>
                                                            <TableCell align="right"><b>Selling</b></TableCell>
                                                            <TableCell align="right"><b>Profit</b></TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {products.map((p, i) => {
                                                            const profit = p.selling_price - p.buying_price;
                                                            return (
                                                                <TableRow key={i} hover>
                                                                    <TableCell>
                                                                        <Chip icon={<ProductIcon />} label={p.category_name} size="small" variant="outlined" />
                                                                    </TableCell>
                                                                    <TableCell>{p.model}</TableCell>
                                                                    <TableCell>
                                                                        <Chip label={p.sku} size="small" variant="outlined" />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{p.imei}</Typography>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip 
                                                                            icon={<ColorIcon />} 
                                                                            label={p.color} 
                                                                            size="small" 
                                                                            variant="outlined"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Chip label={p.quantity} size="small" color="primary" />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip 
                                                                            icon={getStockStatusIcon(p.stock_status)} 
                                                                            label={getStockStatusLabel(p.stock_status)} 
                                                                            size="small" 
                                                                            color={getStockStatusColor(p.stock_status)} 
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Typography fontWeight="bold" color="error.main">{formatCurrency(p.buying_price)}</Typography>
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Typography fontWeight="bold" color="success.main">{formatCurrency(p.selling_price)}</Typography>
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Typography fontWeight="bold" color={profit >= 0 ? 'success.main' : 'error.main'}>
                                                                            {formatCurrency(profit)}
                                                                        </Typography>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Box>
                                    </Collapse>
                                </Card>
                            );
                        })}

                        {/* List View */}
                        {viewMode === 'list' && (
                            <>
                                {paginatedProducts.length === 0 ? (
                                    <Alert severity="warning">No products found matching your criteria.</Alert>
                                ) : (
                                    <>
                                        <TableContainer component={Paper} variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'action.hover' : '#e3f2fd' }}>
                                                        <TableCell><b>Warehouse</b></TableCell>
                                                        <TableCell><b>Location</b></TableCell>
                                                        <TableCell><b>Product</b></TableCell>
                                                        <TableCell><b>Model</b></TableCell>
                                                        <TableCell><b>SKU</b></TableCell>
                                                        <TableCell><b>IMEI</b></TableCell>
                                                        <TableCell><b>Color</b></TableCell>
                                                        <TableCell align="right"><b>Qty</b></TableCell>
                                                        <TableCell><b>Status</b></TableCell>
                                                        <TableCell align="right"><b>Buying</b></TableCell>
                                                        <TableCell align="right"><b>Selling</b></TableCell>
                                                        <TableCell align="right"><b>Profit</b></TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {paginatedProducts.map((p, i) => {
                                                        const profit = p.selling_price - p.buying_price;
                                                        return (
                                                            <TableRow key={i} hover>
                                                                <TableCell>
                                                                    <Chip icon={<WarehouseIcon />} label={p.warehouse_name} size="small" variant="outlined" />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Box display="flex" alignItems="center" gap={0.5}>
                                                                        <LocationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                                        {p.warehouse_location || 'N/A'}
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Box display="flex" alignItems="center" gap={0.5}>
                                                                        <ProductIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                                                        {p.category_name}
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell>{p.model}</TableCell>
                                                                <TableCell>
                                                                    <Chip label={p.sku} size="small" variant="outlined" />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{p.imei}</Typography>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip 
                                                                        icon={<ColorIcon />} 
                                                                        label={p.color} 
                                                                        size="small" 
                                                                        variant="outlined"
                                                                    />
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    <Chip label={p.quantity} size="small" color="primary" />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip 
                                                                        icon={getStockStatusIcon(p.stock_status)} 
                                                                        label={getStockStatusLabel(p.stock_status)} 
                                                                        size="small" 
                                                                        color={getStockStatusColor(p.stock_status)} 
                                                                    />
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    <Typography fontWeight="bold" color="error.main">{formatCurrency(p.buying_price)}</Typography>
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    <Typography fontWeight="bold" color="success.main">{formatCurrency(p.selling_price)}</Typography>
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    <Typography fontWeight="bold" color={profit >= 0 ? 'success.main' : 'error.main'}>
                                                                        {formatCurrency(profit)}
                                                                    </Typography>
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
                                            sx={{ bgcolor: 'background.paper' }}
                                        />
                                    </>
                                )}
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