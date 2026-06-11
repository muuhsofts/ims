import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, Card, CardContent, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Button,
    MenuItem, FormControl, InputLabel, Select, CircularProgress,
    Stack, Menu, ListItemIcon, ListItemText
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Inventory, Person, Receipt, FilterAlt, FileDownload as FileDownloadIcon, PictureAsPdf as PdfIcon, TableChart as ExcelIcon, TextSnippet as CsvIcon } from '@mui/icons-material';
import { useBranchOwnerReports } from 'hooks/useBranchOwnerReports';
import { usePermission } from 'hooks/usePermission';
import { userService } from 'services/user.service';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const getProductDisplayName = (product) => {
    const parts = [];
    if (product.category_name) parts.push(product.category_name);
    if (product.model) parts.push(product.model);
    const sku = Array.isArray(product.sku) ? product.sku.join(', ') : product.sku;
    if (sku) parts.push(`(${sku})`);
    return parts.join(' ') || 'Unknown Product';
};

const formatSku = (sku) => {
    if (!sku) return '-';
    if (Array.isArray(sku)) return sku.join(', ');
    return sku;
};

export default function BranchOwnerStockReport() {
    const { hasPermission } = usePermission();
    const { stockData, agentStockData, loading, fetchBranchStock, fetchAgentStock, fetchAgentProducts } = useBranchOwnerReports();

    const [agents, setAgents] = useState([]);
    const [agentsLoading, setAgentsLoading] = useState(false);
    const [reportType, setReportType] = useState('branch');
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [selectedAgent, setSelectedAgent] = useState('');
    const [stockStatusFilter, setStockStatusFilter] = useState('');
    const [exportAnchorEl, setExportAnchorEl] = useState(null);
    const [allAgentsProducts, setAllAgentsProducts] = useState([]);
    const [allAgentsProductsLoading, setAllAgentsProductsLoading] = useState(false);

    // Load agents
    useEffect(() => {
        const loadAgents = async () => {
            setAgentsLoading(true);
            try {
                const response = await userService.getSalesAgentsDropdown();
                if (response.data?.success) {
                    setAgents(response.data.data || []);
                } else {
                    const allUsers = await userService.getUsers({ role: 'SALES_AGENT' });
                    if (allUsers.data?.success) {
                        setAgents(allUsers.data.data.data || []);
                    }
                }
            } catch (err) {
                console.error('Failed to load agents:', err);
                setAgents([]);
            } finally {
                setAgentsLoading(false);
            }
        };
        loadAgents();
    }, []);

    // Fetch combined products for all agents
    useEffect(() => {
        if (reportType === 'agent' && !selectedAgent && agents.length > 0 && !agentsLoading) {
            const fetchAllAgentsProducts = async () => {
                setAllAgentsProductsLoading(true);
                let allProducts = [];
                for (const agent of agents) {
                    const agentId = agent.id || agent.user_id;
                    const products = await fetchAgentProducts(agentId, fromDate, toDate, stockStatusFilter || null);
                    if (products && products.length > 0) {
                        allProducts = allProducts.concat(products.map(p => ({ ...p, agent_name: agent.name })));
                    }
                }
                setAllAgentsProducts(allProducts);
                setAllAgentsProductsLoading(false);
            };
            fetchAllAgentsProducts();
        } else {
            setAllAgentsProducts([]);
        }
    }, [reportType, selectedAgent, agents, fromDate, toDate, stockStatusFilter, agentsLoading, fetchAgentProducts]);

    // Auto-fetch on filter changes
    useEffect(() => {
        if (reportType === 'branch') {
            fetchBranchStock(fromDate, toDate, stockStatusFilter || null);
        } else if (selectedAgent) {
            fetchAgentStock(fromDate, toDate, selectedAgent, stockStatusFilter || null);
        } else {
            fetchAgentStock(fromDate, toDate, null, stockStatusFilter || null);
        }
    }, [reportType, fromDate, toDate, selectedAgent, stockStatusFilter, fetchBranchStock, fetchAgentStock]);

    // Export data builder (unchanged)
    const getExportData = () => {
        if (reportType === 'branch' && stockData?.products) {
            return stockData.products.map(product => ({
                'Product Name': getProductDisplayName(product),
                'Product ID': product.product_id,
                'IMEI': product.imei || '-',
                'Category': product.category_name,
                'Model': product.model,
                'SKU': formatSku(product.sku),
                'Stock Status': product.stock_status || '-',
                'Quantity': product.quantity,
                'Buying Price (TSh)': product.buying_price,
                'Total Value (TSh)': product.buying_price * product.quantity
            }));
        } else if (reportType === 'agent') {
            if (selectedAgent && agentStockData && agentStockData.products && agentStockData.products.length > 0) {
                const agentName = agentStockData.agent_name || agents.find(a => (a.id || a.user_id) === selectedAgent)?.name || 'Selected Agent';
                return agentStockData.products.map(p => ({
                    'Agent Name': agentName,
                    'Product Name': getProductDisplayName(p),
                    'Product ID': p.product_id,
                    'IMEI': p.imei || '-',
                    'Category': p.category_name,
                    'Model': p.model,
                    'SKU': formatSku(p.sku),
                    'Stock Status': p.stock_status || '-',
                    'Quantity': p.quantity,
                    'Buying Price (TSh)': p.buying_price,
                    'Total Value (TSh)': p.buying_price * p.quantity
                }));
            } else if (!selectedAgent && allAgentsProducts.length > 0) {
                return allAgentsProducts.map(p => ({
                    'Agent Name': p.agent_name,
                    'Product Name': getProductDisplayName(p),
                    'Product ID': p.product_id,
                    'IMEI': p.imei || '-',
                    'Category': p.category_name,
                    'Model': p.model,
                    'SKU': formatSku(p.sku),
                    'Stock Status': p.stock_status || '-',
                    'Quantity': p.quantity,
                    'Buying Price (TSh)': p.buying_price,
                    'Total Value (TSh)': p.buying_price * p.quantity
                }));
            } else {
                const agentsList = agentStockData?.agents || (agentStockData?.agent_id ? [agentStockData] : []);
                return agentsList.map(agent => ({
                    'Agent Name': agent.agent_name,
                    'Email': agent.agent_email,
                    'Phone': agent.agent_phone,
                    'Unique Products': agent.unique_products,
                    'Total Units': agent.total_units,
                    'Total Value (TSh)': agent.total_value,
                    'Last Activity': agent.last_activity ? formatDate(agent.last_activity) : '-'
                }));
            }
        }
        return [];
    };

    const getPeriodText = () => {
        const from = fromDate ? formatDate(fromDate) : 'any';
        const to = toDate ? formatDate(toDate) : 'any';
        if (from === 'any' && to === 'any') return 'All time';
        if (to === 'any') return `From ${from}`;
        if (from === 'any') return `Until ${to}`;
        return `${from} to ${to}`;
    };

    const getFiltersText = () => {
        const filters = [];
        if (stockStatusFilter) filters.push(`Stock Status: ${stockStatusFilter.replace('_', ' ')}`);
        if (reportType === 'agent' && selectedAgent) {
            const agentName = agents.find(a => (a.id || a.user_id) === selectedAgent)?.name;
            if (agentName) filters.push(`Agent: ${agentName}`);
        }
        return filters.join(' | ');
    };

    const exportToExcel = () => {
        try {
            const exportData = getExportData();
            if (exportData.length === 0) {
                toast.warning('No data to export');
                return;
            }
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            let sheetName = reportType === 'branch' ? 'Branch_Stock' : 'Agent_Products';
            if (reportType === 'agent' && !selectedAgent && allAgentsProducts.length > 0) sheetName = 'All_Agents_Products';
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            const fileName = `stock_report_${reportType}_${selectedAgent ? 'agent_' + selectedAgent : 'all'}_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            toast.success('Report exported to Excel successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to export to Excel');
        }
        handleExportClose();
    };

    const exportToCSV = () => {
        try {
            const exportData = getExportData();
            if (exportData.length === 0) {
                toast.warning('No data to export');
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
            link.setAttribute('download', `stock_report_${reportType}_${selectedAgent ? 'agent_' + selectedAgent : 'all'}_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.csv`);
            link.click();
            URL.revokeObjectURL(url);
            toast.success('Report exported to CSV successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to export to CSV');
        }
        handleExportClose();
    };

    // Refined PDF export with proper title, date, and filters
    const exportToPDF = () => {
        try {
            const exportData = getExportData();
            if (exportData.length === 0) {
                toast.warning('No data to export');
                return;
            }

            // Determine title
            let title = reportType === 'branch' ? 'COLLECTION CENTER STOCK REPORT' : 'AGENT STOCK REPORT';
            if (reportType === 'agent' && selectedAgent && agentStockData?.agent_name) {
                title = `AGENT STOCK REPORT - ${agentStockData.agent_name.toUpperCase()}`;
            } else if (reportType === 'agent' && !selectedAgent && allAgentsProducts.length > 0) {
                title = 'ALL AGENTS - COMBINED PRODUCT STOCK';
            }

            const period = getPeriodText();
            const filters = getFiltersText();
            const generatedDate = new Date().toLocaleString();

            const headers = Object.keys(exportData[0]);
            const tableRows = exportData.map(row => `
                <tr>
                    ${headers.map(h => `<td>${row[h] !== undefined && row[h] !== null ? row[h] : ''}</td>`).join('')}
                </tr>
            `).join('');

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Arial, sans-serif;
                            margin: 20px;
                            color: #333;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 25px;
                            border-bottom: 2px solid #4CAF50;
                            padding-bottom: 10px;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 24px;
                            color: #2c3e50;
                        }
                        .info {
                            display: flex;
                            justify-content: space-between;
                            margin: 15px 0;
                            font-size: 12px;
                            background: #f5f5f5;
                            padding: 8px 12px;
                            border-radius: 5px;
                        }
                        .info p {
                            margin: 0;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                            font-size: 11px;
                        }
                        th, td {
                            border: 1px solid #ddd;
                            padding: 8px;
                            text-align: left;
                            vertical-align: top;
                        }
                        th {
                            background-color: #4CAF50;
                            color: white;
                            font-weight: bold;
                        }
                        tr:nth-child(even) {
                            background-color: #f9f9f9;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 30px;
                            font-size: 10px;
                            color: #777;
                            border-top: 1px solid #ddd;
                            padding-top: 10px;
                        }
                        @media print {
                            body {
                                margin: 0;
                                padding: 15px;
                            }
                            .no-print {
                                display: none;
                            }
                            th {
                                background-color: #4CAF50 !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>${title}</h1>
                    </div>
                    <div class="info">
                        <p><strong>Period:</strong> ${period}</p>
                        ${filters ? `<p><strong>Filters:</strong> ${filters}</p>` : ''}
                        <p><strong>Generated:</strong> ${generatedDate}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                ${headers.map(h => `<th>${h}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                    <div class="footer">
                        This report is system-generated. For any queries, contact support.
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate PDF');
        }
        handleExportClose();
    };

    const handleExportClick = (event) => setExportAnchorEl(event.currentTarget);
    const handleExportClose = () => setExportAnchorEl(null);

    if (!hasPermission('branch-owner-reports.stock.view')) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <Typography variant="h4" color="error">Access Denied</Typography>
            </Box>
        );
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Stock Reports (Branch Owner)
                </Typography>

                {/* Filters (unchanged) */}
                <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={2}>
                            <FormControl fullWidth>
                                <InputLabel>Report Type</InputLabel>
                                <Select value={reportType} label="Report Type" onChange={(e) => setReportType(e.target.value)}>
                                    <MenuItem value="branch">📦 Collection Center Stock</MenuItem>
                                    <MenuItem value="agent">👥 Agent Stock</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={2}>
                            <DatePicker label="From Date" value={fromDate} onChange={setFromDate} renderInput={(params) => <TextField {...params} fullWidth />} />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                            <DatePicker label="To Date" value={toDate} onChange={setToDate} renderInput={(params) => <TextField {...params} fullWidth />} />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                            <FormControl fullWidth>
                                <InputLabel>Stock Status</InputLabel>
                                <Select value={stockStatusFilter} label="Stock Status" onChange={(e) => setStockStatusFilter(e.target.value)}>
                                    <MenuItem value="">All</MenuItem>
                                    <MenuItem value="in_stock">In Stock</MenuItem>
                                    <MenuItem value="transferred">Transferred</MenuItem>
                                    <MenuItem value="sold">Sold</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        {reportType === 'agent' && (
                            <Grid item xs={12} sm={2}>
                                <FormControl fullWidth>
                                    <InputLabel>Agent</InputLabel>
                                    <Select value={selectedAgent} label="Agent" onChange={(e) => setSelectedAgent(e.target.value)} disabled={agentsLoading}>
                                        <MenuItem value="">All Agents</MenuItem>
                                        {agents.map(agent => (
                                            <MenuItem key={agent.id || agent.user_id} value={agent.id || agent.user_id}>
                                                {agent.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}
                        <Grid item xs={12} sm={reportType === 'agent' ? 2 : 4}>
                            <Button variant="contained" startIcon={<FilterAlt />} fullWidth onClick={() => {
                                if (reportType === 'branch') fetchBranchStock(fromDate, toDate, stockStatusFilter || null);
                                else fetchAgentStock(fromDate, toDate, selectedAgent, stockStatusFilter || null);
                            }}>
                                Apply Filters
                            </Button>
                        </Grid>
                        {((reportType === 'branch' && stockData?.products?.length > 0) ||
                            (reportType === 'agent' && ((agentStockData?.agents?.length > 0) || (agentStockData?.products && agentStockData.products.length > 0) || allAgentsProducts.length > 0))) && (
                            <Grid item xs={12} sm={1}>
                                <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExportClick}>Export</Button>
                                <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={handleExportClose}>
                                    <MenuItem onClick={exportToExcel}><ListItemIcon><ExcelIcon color="success" /></ListItemIcon><ListItemText>Excel</ListItemText></MenuItem>
                                    <MenuItem onClick={exportToCSV}><ListItemIcon><CsvIcon color="primary" /></ListItemIcon><ListItemText>CSV</ListItemText></MenuItem>
                                    <MenuItem onClick={exportToPDF}><ListItemIcon><PdfIcon color="error" /></ListItemIcon><ListItemText>PDF</ListItemText></MenuItem>
                                </Menu>
                            </Grid>
                        )}
                    </Grid>
                </Paper>

                {loading && (<Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>)}

                {/* Branch Stock Report (unchanged) */}
                {!loading && reportType === 'branch' && stockData && (
                    <>
                        <Grid container spacing={3} sx={{ mb: 4 }}>
                            <Grid item xs={12} sm={4}>
                                <Card sx={{ borderRadius: 3, bgcolor: '#e3f2fd' }}>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="h6">Total Units</Typography>
                                            <Inventory color="primary" />
                                        </Stack>
                                        <Typography variant="h4">{formatNumber(stockData.summary?.total_units)}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Card sx={{ borderRadius: 3, bgcolor: '#e8f5e9' }}>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="h6">Total Value</Typography>
                                            <Receipt color="success" />
                                        </Stack>
                                        <Typography variant="h4">TSh {formatNumber(stockData.summary?.total_value)}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Card sx={{ borderRadius: 3, bgcolor: '#fff3e0' }}>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="h6">Unique Products</Typography>
                                            <Person color="warning" />
                                        </Stack>
                                        <Typography variant="h4">{formatNumber(stockData.summary?.total_unique_products)}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                            <Typography variant="h6" sx={{ p: 2, bgcolor: '#f5f5f5' }}>Product Details</Typography>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Product Name</TableCell>
                                            <TableCell>IMEI</TableCell>
                                            <TableCell>Category</TableCell>
                                            <TableCell>Model</TableCell>
                                            <TableCell>SKU</TableCell>
                                            <TableCell>Stock Status</TableCell>
                                            <TableCell align="right">Quantity</TableCell>
                                            <TableCell align="right">Buying Price (TSh)</TableCell>
                                            <TableCell align="right">Total Value (TSh)</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {stockData.products?.map((product, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{getProductDisplayName(product)}</TableCell>
                                                <TableCell>{product.imei || '-'}</TableCell>
                                                <TableCell>{product.category_name}</TableCell>
                                                <TableCell>{product.model}</TableCell>
                                                <TableCell>{formatSku(product.sku)}</TableCell>
                                                <TableCell>{product.stock_status || '-'}</TableCell>
                                                <TableCell align="right">{product.quantity}</TableCell>
                                                <TableCell align="right">{formatNumber(product.buying_price)}</TableCell>
                                                <TableCell align="right">{formatNumber(product.buying_price * product.quantity)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {(!stockData.products || stockData.products.length === 0) && (
                                            <TableRow><TableCell colSpan={9} align="center">No stock data found</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </>
                )}

                {/* Agent Stock Report (unchanged) */}
                {!loading && reportType === 'agent' && agentStockData && (
                    <>
                        {agentStockData.summary && (
                            <Grid container spacing={3} sx={{ mb: 4 }}>
                                <Grid item xs={12} sm={4}>
                                    <Card sx={{ borderRadius: 3, bgcolor: '#e3f2fd' }}>
                                        <CardContent>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="h6">Total Agents</Typography>
                                                <Person color="primary" />
                                            </Stack>
                                            <Typography variant="h4">{agentStockData.summary.total_agents}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Card sx={{ borderRadius: 3, bgcolor: '#e8f5e9' }}>
                                        <CardContent>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="h6">Total Units</Typography>
                                                <Inventory color="success" />
                                            </Stack>
                                            <Typography variant="h4">{formatNumber(agentStockData.summary.total_units)}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Card sx={{ borderRadius: 3, bgcolor: '#fff3e0' }}>
                                        <CardContent>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="h6">Total Value</Typography>
                                                <Receipt color="warning" />
                                            </Stack>
                                            <Typography variant="h4">TSh {formatNumber(agentStockData.summary.total_value)}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        )}

                        {!selectedAgent && agentStockData.agents && (
                            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <Typography variant="h6" sx={{ p: 2, bgcolor: '#f5f5f5' }}>Agent Stock Breakdown</Typography>
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Agent Name</TableCell>
                                                <TableCell>Email / Phone</TableCell>
                                                <TableCell align="right">Unique Products</TableCell>
                                                <TableCell align="right">Total Units</TableCell>
                                                <TableCell align="right">Total Value (TSh)</TableCell>
                                                <TableCell>Last Activity</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {agentStockData.agents.map(agent => (
                                                <TableRow key={agent.agent_id}>
                                                    <TableCell>{agent.agent_name}</TableCell>
                                                    <TableCell>{agent.agent_email} / {agent.agent_phone}</TableCell>
                                                    <TableCell align="right">{agent.unique_products}</TableCell>
                                                    <TableCell align="right">{agent.total_units}</TableCell>
                                                    <TableCell align="right">{formatNumber(agent.total_value)}</TableCell>
                                                    <TableCell>{agent.last_activity ? new Date(agent.last_activity).toLocaleDateString() : '-'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        )}

                        {selectedAgent && agentStockData && agentStockData.products && agentStockData.products.length > 0 && (
                            <Paper sx={{ borderRadius: 3, overflow: 'hidden', mt: 3 }}>
                                <Typography variant="h6" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                                    Products Held by {agentStockData.agent_name || 'Selected Agent'}
                                </Typography>
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Product Name</TableCell>
                                                <TableCell>IMEI</TableCell>
                                                <TableCell>Category</TableCell>
                                                <TableCell>Model</TableCell>
                                                <TableCell>SKU</TableCell>
                                                <TableCell>Stock Status</TableCell>
                                                <TableCell align="right">Quantity</TableCell>
                                                <TableCell align="right">Buying Price (TSh)</TableCell>
                                                <TableCell align="right">Total Value (TSh)</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {agentStockData.products.map((product, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell>{getProductDisplayName(product)}</TableCell>
                                                    <TableCell>{product.imei || '-'}</TableCell>
                                                    <TableCell>{product.category_name}</TableCell>
                                                    <TableCell>{product.model}</TableCell>
                                                    <TableCell>{formatSku(product.sku)}</TableCell>
                                                    <TableCell>{product.stock_status || '-'}</TableCell>
                                                    <TableCell align="right">{product.quantity}</TableCell>
                                                    <TableCell align="right">{formatNumber(product.buying_price)}</TableCell>
                                                    <TableCell align="right">{formatNumber(product.buying_price * product.quantity)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        )}

                        {!selectedAgent && allAgentsProducts.length > 0 && !allAgentsProductsLoading && (
                            <Paper sx={{ borderRadius: 3, overflow: 'hidden', mt: 3 }}>
                                <Typography variant="h6" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                                    Combined Products Across All Agents
                                </Typography>
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Agent</TableCell>
                                                <TableCell>Product Name</TableCell>
                                                <TableCell>IMEI</TableCell>
                                                <TableCell>Category</TableCell>
                                                <TableCell>Model</TableCell>
                                                <TableCell>SKU</TableCell>
                                                <TableCell>Stock Status</TableCell>
                                                <TableCell align="right">Quantity</TableCell>
                                                <TableCell align="right">Buying Price (TSh)</TableCell>
                                                <TableCell align="right">Total Value (TSh)</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {allAgentsProducts.map((product, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell>{product.agent_name}</TableCell>
                                                    <TableCell>{getProductDisplayName(product)}</TableCell>
                                                    <TableCell>{product.imei || '-'}</TableCell>
                                                    <TableCell>{product.category_name}</TableCell>
                                                    <TableCell>{product.model}</TableCell>
                                                    <TableCell>{formatSku(product.sku)}</TableCell>
                                                    <TableCell>{product.stock_status || '-'}</TableCell>
                                                    <TableCell align="right">{product.quantity}</TableCell>
                                                    <TableCell align="right">{formatNumber(product.buying_price)}</TableCell>
                                                    <TableCell align="right">{formatNumber(product.buying_price * product.quantity)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        )}

                        {!selectedAgent && allAgentsProductsLoading && (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <CircularProgress size={30} />
                            </Box>
                        )}

                        {selectedAgent && agentStockData && !agentStockData.products && (
                            <Paper sx={{ p: 3, mt: 3, textAlign: 'center' }}>
                                <Typography>No product details available for this agent.</Typography>
                            </Paper>
                        )}
                        {!selectedAgent && !allAgentsProductsLoading && allAgentsProducts.length === 0 && (
                            <Paper sx={{ p: 3, mt: 3, textAlign: 'center' }}>
                                <Typography>No products found across any agent.</Typography>
                            </Paper>
                        )}
                    </>
                )}
            </Box>
        </LocalizationProvider>
    );
}