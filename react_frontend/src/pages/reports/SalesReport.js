// src/pages/reports/SalesReport.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    LinearProgress
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import {
    Refresh as RefreshIcon,
    Search as SearchIcon,
    AttachMoney as MoneyIcon,
    Receipt as ReceiptIcon,
    TrendingUp as TrendingUpIcon,
    CalendarToday as CalendarIcon,
    DateRange as DateRangeIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    CheckCircle as CheckCircleIcon,
    Pending as PendingIcon,
    Cancel as CancelIcon,
    Inventory as InventoryIcon,
    Phone as PhoneIcon,
    Person as PersonIcon,
    Payment as PaymentIcon,
    Smartphone as SmartphoneIcon,
    FileDownload as FileDownloadIcon,
    TableChart as ExcelIcon,
    TextSnippet as CsvIcon,
    Store as StoreIcon,
    AccountBalanceWallet as ProfitIcon,
    LocationOn as LocationIcon,
    Business as AgentIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { reportService } from 'services/report.service';
import { showSnackbar } from 'utils/snackbar';
import * as XLSX from 'xlsx';

const paymentMethodColors = {
    mpesa: 'success',
    cash: 'warning',
    bank_transfer: 'info',
    airtel_money: 'primary',
    halopesa: 'secondary',
    mixx_yas: 'default',
    mixed: 'error'
};

const statusColors = {
    completed: 'success',
    pending: 'warning',
    cancelled: 'error'
};

const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const formatDateForAPI = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper functions - FIXED to use product SKU from products table
const getProductName = (sale) => {
    return sale.product?.category?.category_name || 'Unknown Product';
};

const getProductModel = (sale) => {
    return sale.product?.category?.model || 'N/A';
};

// FIXED: Get SKU from product.sku (from products table), not from category
const getProductSku = (sale) => {
    return sale.product?.sku || 'N/A';
};

const getProductImei = (sale) => {
    return sale.product?.imei || 'N/A';
};

const getProductColor = (sale) => {
    return sale.product?.color || 'N/A';
};

const getProductBuyingPrice = (sale) => {
    return sale.product?.buying_price || 0;
};

const getCustomerName = (sale) => {
    return sale.customer?.customer_name || 'Walk-in Customer';
};

const getCustomerPhone = (sale) => {
    return sale.customer?.msisdn || sale.customer?.customer_phone || 'N/A';
};

const getAgentName = (sale) => {
    return sale.agent?.name || 'Unknown';
};

const getCollectionCenterName = (sale) => {
    return sale.collection_center?.cc_name || 'N/A';
};

const getCollectionCenterLocation = (sale) => {
    return sale.collection_center?.location || 'N/A';
};

const getCollectionCenterInfo = (sale) => {
    if (sale.collection_center) {
        return {
            name: sale.collection_center.cc_name,
            location: sale.collection_center.location,
            id: sale.collection_center.cc_id
        };
    }
    return null;
};

export default function SalesReport() {
    const { hasPermission } = usePermission();
    const canView = hasPermission('reports.sales.view');

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [expandedRows, setExpandedRows] = useState({});
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [exportAnchorEl, setExportAnchorEl] = useState(null);
    const printRef = useRef();

    const [reportType, setReportType] = useState('custom');
    const [statusFilter, setStatusFilter] = useState('all');

    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [dateRange, setDateRange] = useState({
        startDate: dayjs().startOf('month'),
        endDate: dayjs()
    });

    const [searchTerm, setSearchTerm] = useState('');

    const getExportData = () => {
        const salesToExport = filteredSales.length > 0 ? filteredSales : (data?.sales || []);
        return salesToExport.map(sale => ({
            'Customer Name': getCustomerName(sale),
            'Customer Phone': getCustomerPhone(sale),
            'Product Name': getProductName(sale),
            'Model': getProductModel(sale),
            'SKU': getProductSku(sale),  // Now using product SKU
            'IMEI': getProductImei(sale),
            'Color': getProductColor(sale),
            'Amount (TSh)': parseFloat(sale.total_amount).toLocaleString(),
            'Payment Method': sale.payment_method,
            'Agent': getAgentName(sale),
            'Collection Center': getCollectionCenterName(sale),
            'Collection Center Location': getCollectionCenterLocation(sale),
            'Date': formatDate(sale.created_at),
            'Status': sale.status
        }));
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
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');
            const fileName = `sales_report_${dayjs().format('DD-MM-YYYY_HH-mm')}.xlsx`;
            XLSX.writeFile(workbook, fileName);
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
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `sales_report_${dayjs().format('DD-MM-YYYY_HH-mm')}.csv`);
            link.click();
            URL.revokeObjectURL(url);
            showSnackbar({ type: 'success', message: 'Report exported to CSV successfully!' });
        } catch (error) {
            showSnackbar({ type: 'error', message: 'Failed to export to CSV' });
        }
        handleExportClose();
    };

    const handleExportClick = (event) => {
        setExportAnchorEl(event.currentTarget);
    };

    const handleExportClose = () => {
        setExportAnchorEl(null);
    };

    const getWeekRange = (date) => {
        const currentDate = new Date(date);
        const dayOfWeek = currentDate.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(currentDate);
        monday.setDate(currentDate.getDate() + diffToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return {
            week_start: formatDateForAPI(monday),
            week_end: formatDateForAPI(sunday)
        };
    };

    const getPeriodDisplay = () => {
        if (reportType === 'daily') return formatDate(selectedDate);
        if (reportType === 'weekly') {
            const { week_start, week_end } = getWeekRange(selectedDate);
            return `${formatDate(week_start)} to ${formatDate(week_end)}`;
        }
        if (reportType === 'monthly') return `${months[selectedMonth - 1]} ${selectedYear}`;
        if (reportType === 'yearly') return `${selectedYear}`;
        return `${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)}`;
    };

    const loadReport = useCallback(async () => {
        if (!canView) return;

        setLoading(true);
        setData(null);
        setPage(0);

        try {
            let fromDate, toDate;

            if (reportType === 'daily') {
                fromDate = formatDateForAPI(selectedDate);
                toDate = formatDateForAPI(selectedDate);
            }
            else if (reportType === 'weekly') {
                const { week_start, week_end } = getWeekRange(selectedDate);
                fromDate = week_start;
                toDate = week_end;
            }
            else if (reportType === 'monthly') {
                const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
                fromDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
                toDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;
            }
            else if (reportType === 'yearly') {
                fromDate = `${selectedYear}-01-01`;
                toDate = `${selectedYear}-12-31`;
            }
            else {
                fromDate = formatDateForAPI(dateRange.startDate);
                toDate = formatDateForAPI(dateRange.endDate);
            }

            const status = statusFilter === 'all' ? null : statusFilter;
            const response = await reportService.getSalesReport(fromDate, toDate, status);

            if (response.data?.success) {
                const reportData = response.data.data;
                setData({
                    period: getPeriodDisplay(),
                    summary: reportData.summary,
                    sales: reportData.sales || [],
                    totalRecords: reportData.total_records
                });
                showSnackbar({ type: 'success', message: `Found ${reportData.sales?.length || 0} sales` });
            } else {
                showSnackbar({ type: 'error', message: response.data?.message || 'Failed to fetch sales report' });
            }
        } catch (err) {
            console.error('Error loading report:', err);
            showSnackbar({ type: 'error', message: 'Failed to load sales report' });
        } finally {
            setLoading(false);
        }
    }, [canView, reportType, selectedDate, selectedYear, selectedMonth, dateRange, statusFilter]);

    useEffect(() => {
        loadReport();
    }, [loadReport]);

    const handleReportTypeChange = (event, newType) => {
        if (newType !== null) setReportType(newType);
    };

    const toggleRowExpand = (saleId) => {
        setExpandedRows(prev => ({ ...prev, [saleId]: !prev[saleId] }));
    };

    const filterSales = () => {
        if (!data?.sales) return [];
        if (!searchTerm) return data.sales;
        const term = searchTerm.toLowerCase();
        return data.sales.filter(sale =>
            getCustomerName(sale).toLowerCase().includes(term) ||
            getCustomerPhone(sale).toLowerCase().includes(term) ||
            getAgentName(sale).toLowerCase().includes(term) ||
            getCollectionCenterName(sale).toLowerCase().includes(term) ||
            sale.payment_method?.toLowerCase().includes(term) ||
            getProductName(sale).toLowerCase().includes(term) ||
            getProductImei(sale).includes(term)
        );
    };

    if (!canView) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error">You do not have permission to view sales reports.</Alert>
            </Box>
        );
    }

    const filteredSales = filterSales();
    const paginatedSales = filteredSales.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const summary = data?.summary || {
        total_transactions: 0,
        total_revenue: 0,
        total_profit: 0,
        overall_profit_margin: 0,
        average_transaction_value: 0,
        payment_methods: [],
        agent_performance: []
    };
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ p: 2, bgcolor: 'background.default', minHeight: '100vh' }}>
                <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    {/* Header */}
                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }} className="no-print">
                        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                            <Typography variant="h5" fontWeight="bold">
                                <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Sales Report
                            </Typography>
                            <Box>
                                <Tooltip title="Refresh">
                                    <IconButton onClick={loadReport} disabled={loading} sx={{ mr: 1 }}>
                                        <RefreshIcon />
                                    </IconButton>
                                </Tooltip>
                                {data?.sales && data.sales.length > 0 && (
                                    <Button variant="contained" startIcon={<FileDownloadIcon />} onClick={handleExportClick}>
                                        Export
                                    </Button>
                                )}
                                <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={handleExportClose}>
                                    <MenuItem onClick={exportToExcel}>
                                        <ListItemIcon><ExcelIcon color="success" /></ListItemIcon>
                                        <ListItemText>Excel (.xlsx)</ListItemText>
                                    </MenuItem>
                                    <MenuItem onClick={exportToCSV}>
                                        <ListItemIcon><CsvIcon color="primary" /></ListItemIcon>
                                        <ListItemText>CSV (.csv)</ListItemText>
                                    </MenuItem>
                                </Menu>
                            </Box>
                        </Box>

                        {/* Report Type Toggle */}
                        <Box sx={{ mb: 2, mt: 2 }}>
                            <ToggleButtonGroup value={reportType} exclusive onChange={handleReportTypeChange} size="small" fullWidth>
                                <ToggleButton value="daily"><CalendarIcon sx={{ mr: 0.5 }} /> Daily</ToggleButton>
                                <ToggleButton value="weekly"><CalendarIcon sx={{ mr: 0.5 }} /> Weekly</ToggleButton>
                                <ToggleButton value="monthly"><CalendarIcon sx={{ mr: 0.5 }} /> Monthly</ToggleButton>
                                <ToggleButton value="yearly"><TrendingUpIcon sx={{ mr: 0.5 }} /> Yearly</ToggleButton>
                                <ToggleButton value="custom"><DateRangeIcon sx={{ mr: 0.5 }} /> Custom</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>

                        {/* Date Selection */}
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            {reportType === 'daily' && (
                                <Grid item xs={12}>
                                    <DatePicker
                                        label="Select Date"
                                        value={selectedDate}
                                        onChange={setSelectedDate}
                                        format="DD/MM/YYYY"
                                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                    />
                                </Grid>
                            )}
                            {reportType === 'weekly' && (
                                <Grid item xs={12}>
                                    <DatePicker
                                        label="Any day in week"
                                        value={selectedDate}
                                        onChange={setSelectedDate}
                                        format="DD/MM/YYYY"
                                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                    />
                                    <Typography variant="caption" color="textSecondary">Select any day to get the full week (Monday to Sunday)</Typography>
                                </Grid>
                            )}
                            {reportType === 'monthly' && (
                                <>
                                    <Grid item xs={6}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Year</InputLabel>
                                            <Select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                                                {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Month</InputLabel>
                                            <Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                                                {months.map((m, i) => <MenuItem key={m} value={i+1}>{m}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </>
                            )}
                            {reportType === 'yearly' && (
                                <Grid item xs={12}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Year</InputLabel>
                                        <Select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                                            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}
                            {reportType === 'custom' && (
                                <>
                                    <Grid item xs={6}>
                                        <DatePicker
                                            label="Start Date"
                                            value={dateRange.startDate}
                                            onChange={(newValue) => setDateRange({ ...dateRange, startDate: newValue })}
                                            format="DD/MM/YYYY"
                                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <DatePicker
                                            label="End Date"
                                            value={dateRange.endDate}
                                            onChange={(newValue) => setDateRange({ ...dateRange, endDate: newValue })}
                                            format="DD/MM/YYYY"
                                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                        />
                                    </Grid>
                                </>
                            )}
                        </Grid>

                        {/* Status Filter */}
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Status</InputLabel>
                                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                        <MenuItem value="all">All Status</MenuItem>
                                        <MenuItem value="completed">Completed</MenuItem>
                                        <MenuItem value="pending">Pending</MenuItem>
                                        <MenuItem value="cancelled">Cancelled</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Button
                                    variant="contained"
                                    startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                                    onClick={loadReport}
                                    disabled={loading}
                                    fullWidth
                                    sx={{ height: '100%' }}
                                >
                                    {loading ? 'Loading...' : 'Load Report'}
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>

                    {loading ? (
                        <Box sx={{ p: 5 }}>
                            <LinearProgress />
                            <Typography sx={{ textAlign: 'center', mt: 2 }}>Loading sales data...</Typography>
                        </Box>
                    ) : data ? (
                        <Box ref={printRef} sx={{ p: 2 }}>
                            <Typography variant="subtitle1" color="primary" gutterBottom>
                                📅 Period: {data.period}
                            </Typography>

                            {/* Summary Cards */}
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card sx={{ bgcolor: 'background.paper' }}>
                                        <CardContent>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                <Box>
                                                    <Typography color="textSecondary" variant="caption">Total Transactions</Typography>
                                                    <Typography variant="h4" fontWeight="bold">{summary.total_transactions || 0}</Typography>
                                                </Box>
                                                <ReceiptIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card sx={{ bgcolor: 'background.paper' }}>
                                        <CardContent>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                <Box>
                                                    <Typography color="textSecondary" variant="caption">Total Revenue</Typography>
                                                    <Typography variant="h4" fontWeight="bold" color="success.main">
                                                        TSh {(summary.total_revenue || 0).toLocaleString()}
                                                    </Typography>
                                                </Box>
                                                <MoneyIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card sx={{ bgcolor: 'background.paper' }}>
                                        <CardContent>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                <Box>
                                                    <Typography color="textSecondary" variant="caption">Total Profit</Typography>
                                                    <Typography variant="h4" fontWeight="bold" color="info.main">
                                                        TSh {(summary.total_profit || 0).toLocaleString()}
                                                    </Typography>
                                                </Box>
                                                <ProfitIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.7 }} />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card sx={{ bgcolor: 'background.paper' }}>
                                        <CardContent>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                <Box>
                                                    <Typography color="textSecondary" variant="caption">Avg Transaction</Typography>
                                                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                                                        TSh {(summary.average_transaction_value || 0).toLocaleString()}
                                                    </Typography>
                                                </Box>
                                                <TrendingUpIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            {/* Payment Methods */}
                            {summary.payment_methods && summary.payment_methods.length > 0 && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>💳 Payment Methods</Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        {summary.payment_methods.map((method, idx) => (
                                            <Chip
                                                key={idx}
                                                label={`${method.method}: TSh ${method.amount?.toLocaleString()} (${method.count} transactions)`}
                                                color={paymentMethodColors[method.method] || 'default'}
                                                size="small"
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            )}

                            {/* Agent Performance */}
                            {summary.agent_performance && summary.agent_performance.length > 0 && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                        👤 Agent Performance ({summary.agent_performance.length})
                                    </Typography>
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'action.hover' }}>
                                                    <TableCell><b>Agent Name</b></TableCell>
                                                    <TableCell><b>Collection Center</b></TableCell>
                                                    <TableCell><b>Location</b></TableCell>
                                                    <TableCell align="right"><b>Sales Count</b></TableCell>
                                                    <TableCell align="right"><b>Revenue (TSh)</b></TableCell>
                                                    <TableCell align="right"><b>Profit (TSh)</b></TableCell>
                                                    <TableCell align="right"><b>Avg Ticket</b></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {summary.agent_performance.map((agent, idx) => (
                                                    <TableRow key={idx} hover>
                                                        <TableCell>
                                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                                <AgentIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                                                {agent.agent_name}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                icon={<StoreIcon />}
                                                                label={agent.collection_center_name}
                                                                size="small"
                                                                color="primary"
                                                                variant="outlined"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                                <LocationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                                <Typography variant="body2">{agent.collection_center_location || agent.location || 'N/A'}</Typography>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell align="right">{agent.sales_count}</TableCell>
                                                        <TableCell align="right">
                                                            <Typography fontWeight="bold" color="success.main">
                                                                TSh {agent.revenue.toLocaleString()}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            TSh {(agent.profit || 0).toLocaleString()}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            TSh {(agent.average_ticket || 0).toLocaleString()}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}

                            {/* Search */}
                            <TextField
                                placeholder="🔍 Search by customer, phone, agent, collection center, product, IMEI, or payment method..."
                                size="small"
                                fullWidth
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{ mb: 2 }}
                                InputProps={{
                                    startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>),
                                    endAdornment: searchTerm && (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setSearchTerm('')}>
                                                <CancelIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />

                            {/* Sales Table */}
                            {data.sales && data.sales.length > 0 ? (
                                <>
                                    <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="subtitle2" fontWeight="bold">
                                            📋 Sales Transactions ({filteredSales.length})
                                        </Typography>
                                        {searchTerm && (
                                            <Chip
                                                label={`Found ${filteredSales.length} results`}
                                                size="small"
                                                color="info"
                                                onDelete={() => setSearchTerm('')}
                                            />
                                        )}
                                    </Box>
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'action.hover' }}>
                                                    <TableCell width={40}></TableCell>
                                                    <TableCell><b>Customer</b></TableCell>
                                                    <TableCell><b>Phone</b></TableCell>
                                                    <TableCell><b>Product</b></TableCell>
                                                    <TableCell><b>Model / SKU</b></TableCell>
                                                    <TableCell><b>IMEI</b></TableCell>
                                                    <TableCell align="right"><b>Amount</b></TableCell>
                                                    <TableCell><b>Payment</b></TableCell>
                                                    <TableCell><b>Agent</b></TableCell>
                                                    <TableCell><b>Collection Center</b></TableCell>
                                                    <TableCell><b>Date</b></TableCell>
                                                    <TableCell><b>Status</b></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {paginatedSales.map((sale) => {
                                                    const isExpanded = expandedRows[sale.sale_id];
                                                    const productName = getProductName(sale);
                                                    const productModel = getProductModel(sale);
                                                    const productSku = getProductSku(sale);  // Now using product SKU
                                                    const productImei = getProductImei(sale);
                                                    const productColor = getProductColor(sale);
                                                    const collectionCenter = getCollectionCenterInfo(sale);

                                                    return (
                                                        <React.Fragment key={sale.sale_id}>
                                                            <TableRow hover>
                                                                <TableCell>
                                                                    <IconButton size="small" onClick={() => toggleRowExpand(sale.sale_id)}>
                                                                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                                    </IconButton>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Box display="flex" alignItems="center" gap={0.5}>
                                                                        <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                                        <Typography variant="body2">{getCustomerName(sale)}</Typography>
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {getCustomerPhone(sale) !== 'N/A' && (
                                                                        <Box display="flex" alignItems="center" gap={0.5}>
                                                                            <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                                            <Typography variant="body2">{getCustomerPhone(sale)}</Typography>
                                                                        </Box>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Box display="flex" alignItems="center" gap={0.5}>
                                                                        <SmartphoneIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                                                        <Tooltip title={productName}>
                                                                            <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>{productName}</Typography>
                                                                        </Tooltip>
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Stack direction="row" spacing={0.5}>
                                                                        {productModel !== 'N/A' && <Chip label={productModel} size="small" variant="outlined" />}
                                                                        {productSku !== 'N/A' && <Chip label={productSku} size="small" color="info" variant="outlined" />}
                                                                    </Stack>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{productImei}</Typography>
                                                                </TableCell>

                                                                <TableCell align="right">
                                                                    <Typography fontWeight="bold" color="success.main">
                                                                        TSh {parseFloat(sale.total_amount).toLocaleString()}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip
                                                                        label={sale.payment_method}
                                                                        size="small"
                                                                        color={paymentMethodColors[sale.payment_method] || 'default'}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>{getAgentName(sale)}</TableCell>
                                                                <TableCell>
                                                                    {collectionCenter ? (
                                                                        <Tooltip title={`Location: ${collectionCenter.location}`}>
                                                                            <Chip
                                                                                icon={<StoreIcon />}
                                                                                label={collectionCenter.name}
                                                                                size="small"
                                                                                color="primary"
                                                                                variant="outlined"
                                                                            />
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <Chip label="N/A" size="small" variant="outlined" />
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>{formatDate(sale.created_at)}</TableCell>
                                                                <TableCell>
                                                                    <Chip
                                                                        label={sale.status}
                                                                        size="small"
                                                                        icon={sale.status === 'completed' ? <CheckCircleIcon /> : sale.status === 'pending' ? <PendingIcon /> : <CancelIcon />}
                                                                        color={statusColors[sale.status] || 'default'}
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell colSpan={13} sx={{ p: 0 }}>
                                                                    <Collapse in={isExpanded}>
                                                                        <Box sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                                                                            <Typography variant="subtitle2" gutterBottom>
                                                                                <InventoryIcon sx={{ fontSize: 16, mr: 0.5 }} />
                                                                                Transaction Details:
                                                                            </Typography>
                                                                            <Grid container spacing={2}>
                                                                                <Grid item xs={12} sm={4}>
                                                                                    <Typography variant="caption" color="textSecondary">Product ID</Typography>
                                                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                                                        {sale.product?.product_id || 'N/A'}
                                                                                    </Typography>
                                                                                </Grid>
                                                                                <Grid item xs={12} sm={4}>
                                                                                    <Typography variant="caption" color="textSecondary">Buying Price</Typography>
                                                                                    <Typography variant="body2" color="error.main">
                                                                                        TSh {parseFloat(getProductBuyingPrice(sale)).toLocaleString()}
                                                                                    </Typography>
                                                                                </Grid>
                                                                                <Grid item xs={12} sm={4}>
                                                                                    <Typography variant="caption" color="textSecondary">Profit</Typography>
                                                                                    <Typography variant="body2" color="success.main">
                                                                                        TSh {(parseFloat(sale.total_amount) - parseFloat(getProductBuyingPrice(sale))).toLocaleString()}
                                                                                    </Typography>
                                                                                </Grid>
                                                                                {collectionCenter && (
                                                                                    <Grid item xs={12} sm={6}>
                                                                                        <Typography variant="caption" color="textSecondary">Collection Center</Typography>
                                                                                        <Typography variant="body2">
                                                                                            <StoreIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                                                                            {collectionCenter.name} - {collectionCenter.location}
                                                                                        </Typography>
                                                                                    </Grid>
                                                                                )}
                                                                                {sale.notes && (
                                                                                    <Grid item xs={12}>
                                                                                        <Typography variant="caption" color="textSecondary">Notes</Typography>
                                                                                        <Typography variant="body2">{sale.notes}</Typography>
                                                                                    </Grid>
                                                                                )}
                                                                            </Grid>
                                                                        </Box>
                                                                    </Collapse>
                                                                </TableCell>
                                                            </TableRow>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <TablePagination
                                        component="div"
                                        count={filteredSales.length}
                                        page={page}
                                        onPageChange={(e, p) => setPage(p)}
                                        rowsPerPage={rowsPerPage}
                                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                                        rowsPerPageOptions={[5, 10, 25, 50, 100]}
                                    />
                                </>
                            ) : (
                                <Box sx={{ p: 3, textAlign: 'center' }}>
                                    <ReceiptIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                                    <Typography color="textSecondary">
                                        {searchTerm ? 'No sales match your search criteria' : 'No sales found for the selected period'}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Box sx={{ p: 5, textAlign: 'center' }}>
                            <ReceiptIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                            <Typography color="textSecondary">Select period and click "Load Report" to view sales data</Typography>
                        </Box>
                    )}
                </Paper>
            </Box>
        </LocalizationProvider>
    );
}