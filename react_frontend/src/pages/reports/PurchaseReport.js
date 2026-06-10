// src/pages/reports/PurchasesReport.js
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tooltip,
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
    Category as CategoryIcon,
    Inventory as InventoryIcon,
    FileDownload as FileDownloadIcon,
    PictureAsPdf as PdfIcon,
    TableChart as ExcelIcon,
    TextSnippet as CsvIcon,
    Visibility as VisibilityIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Person as PersonIcon,
    Close as CloseIcon
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

const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
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
    const { hasPermission } = usePermission();
    const canView = hasPermission('reports.purchases.view');

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [exportAnchorEl, setExportAnchorEl] = useState(null);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    
    const [reportType, setReportType] = useState('daily');
    const [statusFilter, setStatusFilter] = useState('completed');
    
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
            'Phone': purchase.supplier?.phone || 'Unknown',
            'Email': purchase.supplier?.email || 'Unknown',
            'Category': purchase.category?.category_name || 'Unknown',
            'Model': purchase.category?.model || 'Unknown',
            'SKU': purchase.category?.sku || 'Unknown',
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
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            .header { text-align: center; margin-bottom: 30px; }
                            .summary { margin-bottom: 20px; padding: 15px; background: #f5f5f5; display: flex; justify-content: space-around; flex-wrap: wrap; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10px; }
                            th { background-color: #4CAF50; color: white; }
                            .footer { text-align: center; margin-top: 30px; font-size: 10px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Purchases Report</h1>
                            <p>Period: ${data?.period} | Generated: ${dayjs().format('DD/MM/YYYY HH:mm:ss')}</p>
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
                                    <th>Model</th>
                                    <th>SKU</th>
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
                                        <td>${purchase.supplier?.phone || 'Unknown'}</td>
                                        <td>${purchase.category?.category_name || 'Unknown'}</td>
                                        <td>${purchase.category?.model || 'Unknown'}</td>
                                        <td>${purchase.category?.sku || 'Unknown'}</td>
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
            return { from_date: formatDateForAPI(dateRange.startDate), to_date: formatDateForAPI(dateRange.endDate) };
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
                
                // Process by_supplier to include contact_person and phone
                const processedBySupplier = (reportData.summary?.by_supplier || []).map(supplier => {
                    const supplierData = reportData.purchases?.find(p => p.supplier_id === supplier.supplier_id)?.supplier;
                    return {
                        ...supplier,
                        contact_person: supplierData?.contact_person || 'Unknown',
                        phone: supplierData?.phone || 'Unknown',
                        email: supplierData?.email || 'Unknown'
                    };
                });
                
                // Process by_category to include model and sku
                const processedByCategory = (reportData.summary?.by_category || []).map(category => {
                    const categoryData = reportData.purchases?.find(p => p.category_id === category.category_id)?.category;
                    return {
                        ...category,
                        model: categoryData?.model || 'Unknown',
                        sku: categoryData?.sku || 'Unknown'
                    };
                });
                
                setData({
                    period: getPeriodDisplay(),
                    filter: reportData.filter || {},
                    summary: {
                        ...reportData.summary,
                        by_supplier: processedBySupplier,
                        by_category: processedByCategory
                    },
                    purchases: reportData.purchases || []
                });
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

    const filterPurchases = () => {
        if (!data?.purchases) return [];
        if (!searchTerm) return data.purchases;
        const term = searchTerm.toLowerCase();
        return data.purchases.filter(purchase =>
            (purchase.supplier?.supplier_name || '').toLowerCase().includes(term) ||
            (purchase.supplier?.contact_person || '').toLowerCase().includes(term) ||
            (purchase.supplier?.phone || '').includes(term) ||
            (purchase.supplier?.email || '').toLowerCase().includes(term) ||
            (purchase.category?.category_name || '').toLowerCase().includes(term) ||
            (purchase.category?.model || '').toLowerCase().includes(term) ||
            (purchase.category?.sku || '').toLowerCase().includes(term) ||
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
    const summaryData = data?.summary || { total_purchases: 0, total_quantity: 0, total_amount: 0, average_order_value: 0 };
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ p: 2 }}>
                <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    {/* Header */}
                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                            <Typography variant="h5" fontWeight="bold">Purchases Report</Typography>
                            {data?.purchases && data.purchases.length > 0 && (
                                <Button variant="contained" color="primary" startIcon={<FileDownloadIcon />} onClick={handleExportClick}>
                                    Export
                                </Button>
                            )}
                            <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={handleExportClose}>
                                <MenuItem onClick={exportToExcel}><ListItemIcon><ExcelIcon color="success" /></ListItemIcon><ListItemText>Excel</ListItemText></MenuItem>
                                <MenuItem onClick={exportToCSV}><ListItemIcon><CsvIcon color="primary" /></ListItemIcon><ListItemText>CSV</ListItemText></MenuItem>
                                <MenuItem onClick={exportToPDF}><ListItemIcon><PdfIcon color="error" /></ListItemIcon><ListItemText>PDF</ListItemText></MenuItem>
                            </Menu>
                        </Box>
                        
                        <Box sx={{ mb: 2, mt: 2 }}>
                            <ToggleButtonGroup value={reportType} exclusive onChange={handleReportTypeChange} size="small">
                                <ToggleButton value="daily"><CalendarIcon sx={{ mr: 0.5 }} /> Daily</ToggleButton>
                                <ToggleButton value="weekly"><CalendarIcon sx={{ mr: 0.5 }} /> Weekly</ToggleButton>
                                <ToggleButton value="monthly"><CalendarIcon sx={{ mr: 0.5 }} /> Monthly</ToggleButton>
                                <ToggleButton value="yearly"><TrendingUpIcon sx={{ mr: 0.5 }} /> Yearly</ToggleButton>
                                <ToggleButton value="range"><DateRangeIcon sx={{ mr: 0.5 }} /> Custom</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                        
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            {reportType === 'daily' && (
                                <Grid item xs={12}>
                                    <DatePicker label="Select Date" value={selectedDate} onChange={setSelectedDate} format="DD/MM/YYYY" slotProps={{ textField: { size: 'small', fullWidth: true } }} />
                                </Grid>
                            )}
                            {reportType === 'weekly' && (
                                <Grid item xs={12}>
                                    <DatePicker label="Any day in week" value={selectedDate} onChange={setSelectedDate} format="DD/MM/YYYY" slotProps={{ textField: { size: 'small', fullWidth: true } }} />
                                </Grid>
                            )}
                            {reportType === 'monthly' && (
                                <>
                                    <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>Year</InputLabel><Select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>{years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}</Select></FormControl></Grid>
                                    <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>Month</InputLabel><Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>{months.map((m, i) => <MenuItem key={m} value={i+1}>{m}</MenuItem>)}</Select></FormControl></Grid>
                                </>
                            )}
                            {reportType === 'yearly' && (
                                <Grid item xs={12}><FormControl fullWidth size="small"><InputLabel>Year</InputLabel><Select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>{years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}</Select></FormControl></Grid>
                            )}
                            {reportType === 'range' && (
                                <>
                                    <Grid item xs={6}><DatePicker label="Start Date" value={dateRange.startDate} onChange={(newValue) => setDateRange({ ...dateRange, startDate: newValue })} format="DD/MM/YYYY" slotProps={{ textField: { size: 'small', fullWidth: true } }} /></Grid>
                                    <Grid item xs={6}><DatePicker label="End Date" value={dateRange.endDate} onChange={(newValue) => setDateRange({ ...dateRange, endDate: newValue })} format="DD/MM/YYYY" slotProps={{ textField: { size: 'small', fullWidth: true } }} /></Grid>
                                </>
                            )}
                        </Grid>
                        
                        <FormControl size="small" fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Status</InputLabel>
                            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <MenuItem value="all">All Status</MenuItem>
                                <MenuItem value="completed">Completed</MenuItem>
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="cancelled">Cancelled</MenuItem>
                            </Select>
                        </FormControl>
                        
                        <Button variant="contained" startIcon={<RefreshIcon />} onClick={loadReport} disabled={loading} fullWidth>
                            Load Report
                        </Button>
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
                    ) : data ? (
                        <Box sx={{ p: 2 }}>
                            <Typography variant="subtitle1" color="primary" gutterBottom>📅 Period: {data.period}</Typography>
                            
                            {/* Summary Cards */}
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card><CardContent><Box display="flex" alignItems="center" justifyContent="space-between"><Box><Typography color="textSecondary" variant="caption">Total Purchases</Typography><Typography variant="h4" fontWeight="bold">{summaryData.total_purchases || 0}</Typography></Box><ReceiptIcon sx={{ fontSize: 40, color: 'primary.main' }} /></Box></CardContent></Card>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card><CardContent><Box display="flex" alignItems="center" justifyContent="space-between"><Box><Typography color="textSecondary" variant="caption">Total Quantity</Typography><Typography variant="h4" fontWeight="bold" color="info.main">{summaryData.total_quantity || 0}</Typography></Box><InventoryIcon sx={{ fontSize: 40, color: 'info.main' }} /></Box></CardContent></Card>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card><CardContent><Box display="flex" alignItems="center" justifyContent="space-between"><Box><Typography color="textSecondary" variant="caption">Total Amount</Typography><Typography variant="h4" fontWeight="bold" color="success.main">TSh {(summaryData.total_amount || 0).toLocaleString()}</Typography></Box><MoneyIcon sx={{ fontSize: 40, color: 'success.main' }} /></Box></CardContent></Card>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card><CardContent><Box display="flex" alignItems="center" justifyContent="space-between"><Box><Typography color="textSecondary" variant="caption">Average Order</Typography><Typography variant="h4" fontWeight="bold" color="warning.main">TSh {(summaryData.average_order_value || 0).toLocaleString()}</Typography></Box><TrendingUpIcon sx={{ fontSize: 40, color: 'warning.main' }} /></Box></CardContent></Card>
                                </Grid>
                            </Grid>

                            {/* By Supplier Section */}
                            {summaryData.by_supplier?.length > 0 && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>🏢 By Supplier</Typography>
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'action.hover' }}>
                                                    <TableCell><b>Supplier Name</b></TableCell>
                                                    <TableCell><b>Contact Person</b></TableCell>
                                                    <TableCell><b>Phone</b></TableCell>
                                                    <TableCell><b>Email</b></TableCell>
                                                    <TableCell align="right"><b>Purchases</b></TableCell>
                                                    <TableCell align="right"><b>Quantity</b></TableCell>
                                                    <TableCell align="right"><b>Amount (TSh)</b></TableCell>
                                                    <TableCell align="right"><b>%</b></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {summaryData.by_supplier.map((supplier, idx) => (
                                                    <TableRow key={idx} hover>
                                                        <TableCell><SupplierIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />{supplier.supplier_name}</TableCell>
                                                        <TableCell><PersonIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />{supplier.contact_person}</TableCell>
                                                        <TableCell><PhoneIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />{supplier.phone}</TableCell>
                                                        <TableCell><EmailIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />{supplier.email}</TableCell>
                                                        <TableCell align="right">{supplier.purchase_count}</TableCell>
                                                        <TableCell align="right">{supplier.quantity}</TableCell>
                                                        <TableCell align="right"><Typography fontWeight="bold" color="success.main">TSh {supplier.amount.toLocaleString()}</Typography></TableCell>
                                                        <TableCell align="right"><Chip label={`${supplier.percentage}%`} size="small" color="primary" /></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}

                            {/* By Category Section */}
                            {summaryData.by_category?.length > 0 && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>📁 By Category</Typography>
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'action.hover' }}>
                                                    <TableCell><b>Category Name</b></TableCell>
                                                    <TableCell><b>Model</b></TableCell>
                                                    <TableCell><b>SKU</b></TableCell>
                                                    <TableCell align="right"><b>Purchases</b></TableCell>
                                                    <TableCell align="right"><b>Quantity</b></TableCell>
                                                    <TableCell align="right"><b>Amount (TSh)</b></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {summaryData.by_category.map((category, idx) => (
                                                    <TableRow key={idx} hover>
                                                        <TableCell><CategoryIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />{category.category_name}</TableCell>
                                                        <TableCell><strong>{category.model}</strong></TableCell>
                                                        <TableCell><Chip label={category.sku} size="small" variant="outlined" /></TableCell>
                                                        <TableCell align="right">{category.purchase_count}</TableCell>
                                                        <TableCell align="right">{category.quantity}</TableCell>
                                                        <TableCell align="right"><Typography fontWeight="bold" color="success.main">TSh {category.amount.toLocaleString()}</Typography></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}

                            {/* Search */}
                            <TextField 
                                placeholder="🔍 Search by supplier name, contact person, phone, email, category, model, SKU or status..." 
                                size="small" 
                                fullWidth 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                sx={{ mb: 2 }} 
                                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }} 
                            />

                            {/* Purchases Table - NO ACTIONS COLUMN */}
                            {data.purchases.length > 0 ? (
                                <>
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>📋 Purchase Orders ({filteredPurchases.length})</Typography>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'action.hover' }}>
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
                                                {paginatedPurchases.map((purchase) => (
                                                    <TableRow key={purchase.purchase_id} hover>
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
                                                                <Typography variant="body2">{purchase.supplier?.phone || 'Unknown'}</Typography>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip label={purchase.category?.category_name || 'Unknown'} size="small" variant="outlined" />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box>
                                                                <Typography variant="body2" fontWeight="bold">{purchase.category?.model || 'Unknown'}</Typography>
                                                                <Typography variant="caption" color="textSecondary">SKU: {purchase.category?.sku || 'Unknown'}</Typography>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell align="right"><Typography fontWeight="bold">{purchase.quantity_ordered}</Typography></TableCell>
                                                        <TableCell align="right">TSh {parseFloat(purchase.unit_price).toLocaleString()}</TableCell>
                                                        <TableCell align="right"><Typography fontWeight="bold" color="success.main">TSh {parseFloat(purchase.subtotal).toLocaleString()}</Typography></TableCell>
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
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <TablePagination 
                                        component="div" 
                                        count={filteredPurchases.length} 
                                        page={page} 
                                        onPageChange={(e, p) => setPage(p)} 
                                        rowsPerPage={rowsPerPage} 
                                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} 
                                        rowsPerPageOptions={[5, 10, 25, 50]} 
                                    />
                                </>
                            ) : (
                                <Box sx={{ p: 3, textAlign: 'center' }}><Typography color="textSecondary">No purchases found for the selected period</Typography></Box>
                            )}
                        </Box>
                    ) : (
                        <Box sx={{ p: 5, textAlign: 'center' }}><Typography color="textSecondary">Select period and click "Load Report"</Typography></Box>
                    )}
                </Paper>
            </Box>
        </LocalizationProvider>
    );
}