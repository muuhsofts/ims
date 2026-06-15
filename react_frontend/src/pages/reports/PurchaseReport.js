// src/pages/reports/PurchasesReport.js - Responsive with Card/Table toggle
import React, { useState, useEffect, useCallback } from 'react';
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
    TablePagination,
    Menu,
    ListItemIcon,
    ListItemText,
    IconButton,
    Tooltip,
    Collapse,
    LinearProgress,
    Stack,
    useTheme,
    useMediaQuery,
    Divider
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
    CheckCircle as CheckCircleIcon,
    Pending as PendingIcon,
    Cancel as CancelIcon,
    Business as SupplierIcon,
    Inventory as InventoryIcon,
    FileDownload as FileDownloadIcon,
    PictureAsPdf as PdfIcon,
    TableChart as ExcelIcon,
    TextSnippet as CsvIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Person as PersonIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Category as CategoryIcon,
    Smartphone as SmartphoneIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { reportService } from 'services/report.service';
import { showSnackbar } from 'utils/snackbar';
import * as XLSX from 'xlsx';

dayjs.locale('en');

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

export default function PurchasesReport() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md')); // Table on medium and up

    const { hasPermission } = usePermission();
    const canView = hasPermission('reports.purchases.view');

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [expandedRows, setExpandedRows] = useState({});
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [exportAnchorEl, setExportAnchorEl] = useState(null);

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
        const purchasesToExport = filteredPurchases.length > 0 ? filteredPurchases : (data?.purchases || []);
        return purchasesToExport.map(purchase => ({
            'Supplier Name': purchase.supplier?.supplier_name || 'Unknown',
            'Contact Person': purchase.supplier?.contact_person || 'Unknown',
            'Phone': purchase.supplier?.supplier_phone || purchase.supplier?.phone || 'Unknown',
            'Email': purchase.supplier?.email || 'Unknown',
            'Category': purchase.category?.category_name || 'Unknown',
            'Model': purchase.category?.model || 'Unknown',
            'SKU': purchase.selected_skus || 'Unknown',
            'Quantity': purchase.quantity_ordered,
            'Unit Price (TSh)': parseFloat(purchase.unit_price).toLocaleString(),
            'Subtotal (TSh)': parseFloat(purchase.subtotal).toLocaleString(),
            'Status': purchase.status,
            'Date': formatDate(purchase.created_at)
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
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchases Report');
            const fileName = `purchases_report_${dayjs().format('DD-MM-YYYY_HH-mm')}.xlsx`;
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
            link.setAttribute('download', `purchases_report_${dayjs().format('DD-MM-YYYY_HH-mm')}.csv`);
            link.click();
            URL.revokeObjectURL(url);
            showSnackbar({ type: 'success', message: 'Report exported to CSV successfully!' });
        } catch (error) {
            showSnackbar({ type: 'error', message: 'Failed to export to CSV' });
        }
        handleExportClose();
    };

    const exportToPDF = () => {
        try {
            if (!data?.purchases?.length) {
                showSnackbar({ type: 'warning', message: 'No data to export' });
                return;
            }

            const totalAmount = data.summary?.total_amount || 0;
            const totalQuantity = data.summary?.total_quantity || 0;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Purchases Report</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
                            .header { text-align: center; margin-bottom: 30px; }
                            .summary { margin-bottom: 20px; padding: 15px; background: #f5f5f5; display: flex; justify-content: space-around; flex-wrap: wrap; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #4CAF50; color: white; }
                            .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #666; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Purchases Report</h1>
                            <p>Period: ${data.period || getPeriodDisplay()} | Generated: ${dayjs().format('DD/MM/YYYY HH:mm:ss')}</p>
                        </div>
                        <div class="summary">
                            <div><strong>Total Purchases:</strong> ${data.purchases.length}</div>
                            <div><strong>Total Quantity:</strong> ${totalQuantity}</div>
                            <div><strong>Total Amount:</strong> TSh ${totalAmount.toLocaleString()}</div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Supplier</th>
                                    <th>Contact Person</th>
                                    <th>Phone</th>
                                    <th>Category</th>
                                    <th>Model / SKU</th>
                                    <th>Qty</th>
                                    <th>Unit Price</th>
                                    <th>Subtotal</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.purchases.map(purchase => `
                                    <tr>
                                        <td>${purchase.supplier?.supplier_name || 'Unknown'}</td>
                                        <td>${purchase.supplier?.contact_person || 'Unknown'}</td>
                                        <td>${purchase.supplier?.supplier_phone || purchase.supplier?.phone || 'Unknown'}</td>
                                        <td>${purchase.category?.category_name || 'Unknown'}</td>
                                        <td>${purchase.category?.model || 'Unknown'} / ${purchase.selected_skus || 'Unknown'}</td>
                                        <td>${purchase.quantity_ordered}</td>
                                        <td>TSh ${parseFloat(purchase.unit_price).toLocaleString()}</td>
                                        <td>TSh ${parseFloat(purchase.subtotal).toLocaleString()}</td>
                                        <td>${purchase.status}</td>
                                        <td>${formatDate(purchase.created_at)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div class="footer">Report generated on ${dayjs().format('DD/MM/YYYY HH:mm:ss')}</div>
                        <script>window.onload = function() { window.print(); setTimeout(window.close, 500); }</script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        } catch (error) {
            showSnackbar({ type: 'error', message: 'Failed to generate PDF' });
        }
        handleExportClose();
    };

    const getDateRangeForAPI = () => {
        if (reportType === 'daily') {
            return { from_date: formatDateForAPI(selectedDate), to_date: formatDateForAPI(selectedDate) };
        } else if (reportType === 'weekly') {
            const currentDate = new Date(selectedDate);
            const dayOfWeek = currentDate.getDay();
            const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(currentDate);
            monday.setDate(currentDate.getDate() + diffToMonday);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            return { from_date: formatDateForAPI(monday), to_date: formatDateForAPI(sunday) };
        } else if (reportType === 'monthly') {
            const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
            return {
                from_date: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
                to_date: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`
            };
        } else if (reportType === 'yearly') {
            return { from_date: `${selectedYear}-01-01`, to_date: `${selectedYear}-12-31` };
        } else {
            return {
                from_date: formatDateForAPI(dateRange.startDate),
                to_date: formatDateForAPI(dateRange.endDate)
            };
        }
    };

    const getPeriodDisplay = () => {
        const { from_date, to_date } = getDateRangeForAPI();
        if (reportType === 'daily') return formatDate(from_date);
        if (reportType === 'weekly') return `${formatDate(from_date)} to ${formatDate(to_date)}`;
        if (reportType === 'monthly') return `${months[selectedMonth - 1]} ${selectedYear}`;
        if (reportType === 'yearly') return `${selectedYear}`;
        return `${formatDate(from_date)} to ${formatDate(to_date)}`;
    };

    const loadReport = useCallback(async () => {
        if (!canView) return;
        setLoading(true);
        setData(null);
        setPage(0);

        try {
            const { from_date, to_date } = getDateRangeForAPI();
            const status = statusFilter === 'all' ? null : statusFilter;

            const response = await reportService.getPurchasesReport(from_date, to_date, status);

            if (response.data?.success) {
                const reportData = response.data.data;
                setData({
                    period: getPeriodDisplay(),
                    filter: reportData.filter || {},
                    summary: reportData.summary || {},
                    purchases: reportData.purchases || []
                });
                showSnackbar({ type: 'success', message: `Found ${reportData.purchases?.length || 0} purchases` });
            } else {
                showSnackbar({ type: 'error', message: response.data?.message || 'Failed to fetch purchases report' });
            }
        } catch (err) {
            console.error('Error loading report:', err);
            showSnackbar({ type: 'error', message: 'Failed to load purchases report' });
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

    const toggleRowExpand = (purchaseId) => {
        setExpandedRows(prev => ({ ...prev, [purchaseId]: !prev[purchaseId] }));
    };

    const filterPurchases = () => {
        if (!data?.purchases) return [];
        if (!searchTerm) return data.purchases;
        const term = searchTerm.toLowerCase();
        return data.purchases.filter(purchase =>
            (purchase.supplier?.supplier_name || '').toLowerCase().includes(term) ||
            (purchase.supplier?.contact_person || '').toLowerCase().includes(term) ||
            (purchase.supplier?.supplier_phone || purchase.supplier?.phone || '').includes(term) ||
            (purchase.supplier?.email || '').toLowerCase().includes(term) ||
            (purchase.category?.category_name || '').toLowerCase().includes(term) ||
            (purchase.category?.model || '').toLowerCase().includes(term) ||
            (purchase.selected_skus || '').toLowerCase().includes(term) ||
            (purchase.status || '').toLowerCase().includes(term)
        );
    };

    const handleExportClick = (event) => {
        setExportAnchorEl(event.currentTarget);
    };

    const handleExportClose = () => {
        setExportAnchorEl(null);
    };

    if (!canView) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error">You do not have permission to view purchases reports.</Alert>
            </Box>
        );
    }

    const filteredPurchases = filterPurchases();
    const paginatedPurchases = filteredPurchases.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const summaryData = data?.summary || {
        total_purchases: 0,
        total_quantity: 0,
        total_amount: 0,
        average_order_value: 0,
        by_status: []
    };
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    // Card component for mobile/tablet view
    const PurchaseCard = ({ purchase }) => {
        const isExpanded = expandedRows[purchase.purchase_id];
        const categoryName = purchase.category?.category_name || 'Unknown';
        const modelName = purchase.category?.model || 'Unknown';
        const skuName = purchase.selected_skus || 'Unknown';

        return (
            <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Header: Supplier and Status */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SupplierIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                            <Typography variant="subtitle1" fontWeight="bold">
                                {purchase.supplier?.supplier_name || 'Unknown'}
                            </Typography>
                        </Box>
                        <Chip
                            label={purchase.status}
                            size="small"
                            color={statusColors[purchase.status] || 'default'}
                            icon={purchase.status === 'completed' ? <CheckCircleIcon /> : purchase.status === 'pending' ? <PendingIcon /> : <CancelIcon />}
                        />
                    </Box>

                    {/* Contact Info */}
                    <Grid container spacing={1} sx={{ mb: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                                <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="body2">
                                    {purchase.supplier?.contact_person || 'Unknown'}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                                <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="body2">
                                    {purchase.supplier?.supplier_phone || purchase.supplier?.phone || 'Unknown'}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Category, Model, SKU */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                        <Chip icon={<CategoryIcon />} label={categoryName} size="small" variant="outlined" />
                        {modelName !== 'Unknown' && (
                            <Chip icon={<SmartphoneIcon />} label={modelName} size="small" variant="outlined" />
                        )}
                        {skuName !== 'Unknown' && (
                            <Chip label={skuName} size="small" color="info" variant="outlined" />
                        )}
                    </Box>

                    {/* Quantity, Unit Price, Subtotal */}
                    <Grid container spacing={2} sx={{ mb: 1.5 }}>
                        <Grid item xs={4}>
                            <Typography variant="caption" color="textSecondary">Quantity</Typography>
                            <Typography variant="body1" fontWeight="bold">{purchase.quantity_ordered}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant="caption" color="textSecondary">Unit Price</Typography>
                            <Typography variant="body2">TSh {parseFloat(purchase.unit_price).toLocaleString()}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant="caption" color="textSecondary">Subtotal</Typography>
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                                TSh {parseFloat(purchase.subtotal).toLocaleString()}
                            </Typography>
                        </Grid>
                    </Grid>

                    {/* Date */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="textSecondary">
                            Date: {formatDate(purchase.created_at)}
                        </Typography>
                        <Button
                            size="small"
                            endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            onClick={() => toggleRowExpand(purchase.purchase_id)}
                        >
                            Details
                        </Button>
                    </Box>

                    {/* Expandable Details */}
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Divider sx={{ my: 1.5 }} />
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <InventoryIcon fontSize="small" /> Additional Details
                        </Typography>
                        <Grid container spacing={1}>
                            <Grid item xs={12}>
                                <Typography variant="caption" color="textSecondary">Supplier Email</Typography>
                                <Typography variant="body2">
                                    <EmailIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                    {purchase.supplier?.email || 'N/A'}
                                </Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="caption" color="textSecondary">Created At</Typography>
                                <Typography variant="body2">{formatDate(purchase.created_at)}</Typography>
                            </Grid>
                            {purchase.notes && (
                                <Grid item xs={12}>
                                    <Typography variant="caption" color="textSecondary">Notes</Typography>
                                    <Typography variant="body2">{purchase.notes}</Typography>
                                </Grid>
                            )}
                        </Grid>
                    </Collapse>
                </CardContent>
            </Card>
        );
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ p: { xs: 1, sm: 2 }, bgcolor: 'background.default', minHeight: '100vh' }}>
                <Paper sx={{ borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden' }}>
                    {/* Header */}
                    <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }} className="no-print">
                        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                            <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                                <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Purchases Report
                            </Typography>
                            <Box>
                                <Tooltip title="Refresh">
                                    <IconButton onClick={loadReport} disabled={loading} sx={{ mr: 1 }}>
                                        <RefreshIcon />
                                    </IconButton>
                                </Tooltip>
                                {data?.purchases && data.purchases.length > 0 && (
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
                                    <MenuItem onClick={exportToPDF}>
                                        <ListItemIcon><PdfIcon color="error" /></ListItemIcon>
                                        <ListItemText>PDF (Print)</ListItemText>
                                    </MenuItem>
                                </Menu>
                            </Box>
                        </Box>

                        {/* Report Type Filters */}
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

                        {/* Status Filter & Load Button */}
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
                            <Typography sx={{ textAlign: 'center', mt: 2 }}>Loading purchases report...</Typography>
                        </Box>
                    ) : data ? (
                        <Box sx={{ p: { xs: 2, sm: 3 } }}>
                            <Typography variant="subtitle1" color="primary" gutterBottom>
                                📅 Period: {data.period}
                            </Typography>

                            {/* Summary Cards - Responsive */}
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={6} sm={6} md={3}>
                                    <Card sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
                                        <CardContent sx={{ py: 1.5 }}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                <Box>
                                                    <Typography color="textSecondary" variant="caption">Total Purchases</Typography>
                                                    <Typography variant="h5" fontWeight="bold">{summaryData.total_purchases || 0}</Typography>
                                                </Box>
                                                <ReceiptIcon sx={{ fontSize: 32, color: 'primary.main', opacity: 0.7 }} />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} sm={6} md={3}>
                                    <Card sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
                                        <CardContent sx={{ py: 1.5 }}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                <Box>
                                                    <Typography color="textSecondary" variant="caption">Total Quantity</Typography>
                                                    <Typography variant="h5" fontWeight="bold" color="info.main">{summaryData.total_quantity || 0}</Typography>
                                                </Box>
                                                <InventoryIcon sx={{ fontSize: 32, color: 'info.main', opacity: 0.7 }} />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} sm={6} md={3}>
                                    <Card sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
                                        <CardContent sx={{ py: 1.5 }}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                <Box>
                                                    <Typography color="textSecondary" variant="caption">Total Amount</Typography>
                                                    <Typography variant="h5" fontWeight="bold" color="success.main">
                                                        TSh {(summaryData.total_amount || 0).toLocaleString()}
                                                    </Typography>
                                                </Box>
                                                <MoneyIcon sx={{ fontSize: 32, color: 'success.main', opacity: 0.7 }} />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} sm={6} md={3}>
                                    <Card sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
                                        <CardContent sx={{ py: 1.5 }}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                <Box>
                                                    <Typography color="textSecondary" variant="caption">Average Order</Typography>
                                                    <Typography variant="h5" fontWeight="bold" color="warning.main">
                                                        TSh {(summaryData.average_order_value || 0).toLocaleString()}
                                                    </Typography>
                                                </Box>
                                                <TrendingUpIcon sx={{ fontSize: 32, color: 'warning.main', opacity: 0.7 }} />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            {/* Search */}
                            <TextField
                                placeholder="🔍 Search by supplier, contact, phone, email, category, model, SKU or status..."
                                size="small"
                                fullWidth
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{ mb: 2 }}
                                InputProps={{
                                    startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>),
                                    endAdornment: searchTerm && (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setSearchTerm('')}>
                                                <CancelIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />

                            {/* Results */}
                            {data.purchases.length > 0 ? (
                                <>
                                    <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                        <Typography variant="subtitle2" fontWeight="bold">
                                            📋 Purchase Orders ({filteredPurchases.length})
                                        </Typography>
                                        {searchTerm && (
                                            <Chip
                                                label={`Found ${filteredPurchases.length} results`}
                                                size="small"
                                                color="info"
                                                onDelete={() => setSearchTerm('')}
                                            />
                                        )}
                                    </Box>

                                    {/* Table View (Desktop) */}
                                    {showTableView ? (
                                        <TableContainer component={Paper} variant="outlined">
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                                                        <TableCell width={40}></TableCell>
                                                        <TableCell><b>Supplier</b></TableCell>
                                                        <TableCell><b>Contact Person</b></TableCell>
                                                        <TableCell><b>Phone</b></TableCell>
                                                        <TableCell><b>Category</b></TableCell>
                                                        <TableCell><b>Model / SKU</b></TableCell>
                                                        <TableCell align="right"><b>Qty</b></TableCell>
                                                        <TableCell align="right"><b>Unit Price</b></TableCell>
                                                        <TableCell align="right"><b>Subtotal</b></TableCell>
                                                        <TableCell><b>Status</b></TableCell>
                                                        <TableCell><b>Date</b></TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {paginatedPurchases.map((purchase) => {
                                                        const isExpanded = expandedRows[purchase.purchase_id];
                                                        const categoryName = purchase.category?.category_name || 'Unknown';
                                                        const modelName = purchase.category?.model || 'Unknown';
                                                        const skuName = purchase.selected_skus || 'Unknown';

                                                        return (
                                                            <React.Fragment key={purchase.purchase_id}>
                                                                <TableRow hover>
                                                                    <TableCell>
                                                                        <IconButton size="small" onClick={() => toggleRowExpand(purchase.purchase_id)}>
                                                                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                                        </IconButton>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Box display="flex" alignItems="center" gap={1}>
                                                                            <SupplierIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                                                            <Typography variant="body2">{purchase.supplier?.supplier_name || 'Unknown'}</Typography>
                                                                        </Box>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Box display="flex" alignItems="center" gap={1}>
                                                                            <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                                            <Typography variant="body2">{purchase.supplier?.contact_person || 'Unknown'}</Typography>
                                                                        </Box>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Box display="flex" alignItems="center" gap={1}>
                                                                            <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                                            <Typography variant="body2">
                                                                                {purchase.supplier?.supplier_phone || purchase.supplier?.phone || 'Unknown'}
                                                                            </Typography>
                                                                        </Box>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip icon={<CategoryIcon />} label={categoryName} size="small" variant="outlined" />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Stack direction="row" spacing={0.5}>
                                                                            {modelName !== 'Unknown' && (
                                                                                <Chip icon={<SmartphoneIcon />} label={modelName} size="small" variant="outlined" />
                                                                            )}
                                                                            {skuName !== 'Unknown' && (
                                                                                <Chip label={skuName} size="small" color="info" variant="outlined" />
                                                                            )}
                                                                        </Stack>
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Typography fontWeight="bold">{purchase.quantity_ordered}</Typography>
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        TSh {parseFloat(purchase.unit_price).toLocaleString()}
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Typography fontWeight="bold" color="success.main">
                                                                            TSh {parseFloat(purchase.subtotal).toLocaleString()}
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip
                                                                            label={purchase.status}
                                                                            size="small"
                                                                            color={statusColors[purchase.status] || 'default'}
                                                                            icon={purchase.status === 'completed' ? <CheckCircleIcon /> : purchase.status === 'pending' ? <PendingIcon /> : <CancelIcon />}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>{formatDate(purchase.created_at)}</TableCell>
                                                                </TableRow>
                                                                <TableRow>
                                                                    <TableCell colSpan={11} sx={{ p: 0 }}>
                                                                        <Collapse in={isExpanded}>
                                                                            <Box sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                                                                                <Typography variant="subtitle2" gutterBottom>
                                                                                    <InventoryIcon sx={{ fontSize: 16, mr: 0.5 }} />
                                                                                    Purchase Details:
                                                                                </Typography>
                                                                                <Grid container spacing={2}>
                                                                                    <Grid item xs={12} sm={6}>
                                                                                        <Typography variant="caption" color="textSecondary">Supplier Email</Typography>
                                                                                        <Typography variant="body2">
                                                                                            <EmailIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                                                                            {purchase.supplier?.email || 'N/A'}
                                                                                        </Typography>
                                                                                    </Grid>
                                                                                    <Grid item xs={12} sm={6}>
                                                                                        <Typography variant="caption" color="textSecondary">Created At</Typography>
                                                                                        <Typography variant="body2">{formatDate(purchase.created_at)}</Typography>
                                                                                    </Grid>
                                                                                    {purchase.notes && (
                                                                                        <Grid item xs={12}>
                                                                                            <Typography variant="caption" color="textSecondary">Notes</Typography>
                                                                                            <Typography variant="body2">{purchase.notes}</Typography>
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
                                    ) : (
                                        // Card View (Mobile/Tablet)
                                        <Box>
                                            {paginatedPurchases.map((purchase) => (
                                                <PurchaseCard key={purchase.purchase_id} purchase={purchase} />
                                            ))}
                                        </Box>
                                    )}

                                    <TablePagination
                                        component="div"
                                        count={filteredPurchases.length}
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
                            ) : (
                                <Box sx={{ p: 3, textAlign: 'center' }}>
                                    <ReceiptIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                                    <Typography color="textSecondary">
                                        {searchTerm ? 'No purchases match your search criteria' : 'No purchases found for the selected period'}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Box sx={{ p: 5, textAlign: 'center' }}>
                            <ReceiptIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                            <Typography color="textSecondary">Select period and click "Load Report" to view purchases</Typography>
                        </Box>
                    )}
                </Paper>
            </Box>
        </LocalizationProvider>
    );
}