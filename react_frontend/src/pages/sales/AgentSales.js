import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    Paper, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TextField, Typography, CircularProgress, MenuItem,
    Autocomplete, Stack, IconButton, Tooltip, InputAdornment, Tabs, Tab,
    TablePagination, Grid, Card, CardContent, Divider, useMediaQuery, useTheme,
    Switch, FormControlLabel, Select, FormControl, InputLabel
} from '@mui/material';
import { Refresh as RefreshIcon, Sell as SellIcon, Search as SearchIcon, Print as PrintIcon, Phone as PhoneIcon, Person as PersonIcon, Receipt as ReceiptIcon, Discount as DiscountIcon, Business as CompanyIcon } from '@mui/icons-material';
import { useAgentSales } from 'hooks/useAgentSales';
import { useCustomers } from 'hooks/useCustomers';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { agentSalesService } from 'services/agent-sales.service';

// Custom hook for sales history (handles unauthorized access)
const useSalesHistory = () => {
    const [sales, setSales] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [unauthorized, setUnauthorized] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const fetchSales = useCallback(async () => {
        setLoading(true);
        setUnauthorized(false);
        try {
            const response = await agentSalesService.getMySales({
                page: page + 1,
                per_page: rowsPerPage
            });
            if (response.data?.success) {
                setSales(response.data.data.data || []);
                setTotal(response.data.data.total || 0);
            } else {
                setSales([]);
                setTotal(0);
                if (response.data?.message === 'Only sales agents can view their sales') {
                    setUnauthorized(true);
                } else {
                    showSnackbar({ type: 'error', message: response.data?.message || 'Failed to load sales history' });
                }
            }
        } catch (err) {
            console.error(err);
            if (err.response?.data?.message === 'Only sales agents can view their sales') {
                setUnauthorized(true);
            } else {
                showSnackbar({ type: 'error', message: 'Failed to load sales history' });
            }
            setSales([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    return { sales, total, loading, unauthorized, page, setPage, rowsPerPage, setRowsPerPage, fetchSales };
};

const headCellsSales = [
    { id: 'created_at', label: 'Date' },
    { id: 'customer', label: 'Customer' },
    { id: 'product', label: 'Product' },
    { id: 'total_amount', label: 'Amount' },
    { id: 'payment_method', label: 'Payment' },
    { id: 'company', label: 'Company' },
    { id: 'status', label: 'Status' },
    { id: 'receipt', label: 'Invoice' },
];

const formatPrice = (price) => {
    if (price === null || price === undefined || isNaN(price)) return '—';
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(price);
};

const safeValue = (val) => (val ? val : 'N/A');

// Print receipt (unchanged)
const printReceipt = (receipt, sale) => {
    if (!receipt) {
        showSnackbar({ type: 'error', message: 'No receipt found for this sale.' });
        return;
    }

    const printWindow = window.open('', '_blank', 'width=600,height=600');
    printWindow.document.write(`
        <html>
        <head>
            <title>Invoice ${receipt.receipt_number}</title>
            <style>
                body { font-family: monospace; margin: 20px; }
                .receipt { max-width: 300px; margin: auto; border: 1px solid #ccc; padding: 16px; border-radius: 8px; }
                .header { text-align: center; border-bottom: 1px dashed #ccc; margin-bottom: 12px; }
                .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
                .total { font-weight: bold; border-top: 1px solid #ccc; margin-top: 12px; padding-top: 8px; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                @media print {
                    body { margin: 0; padding: 0; }
                    .receipt { box-shadow: none; border: none; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h3>INVOICE</h3>
                    <p>${receipt.receipt_number}</p>
                    <p>Date: ${new Date(receipt.created_at).toLocaleString()}</p>
                </div>
                <div class="row"><strong>Customer:</strong> <span>${receipt.customer_name}</span></div>
                <div class="row"><strong>Phone:</strong> <span>${receipt.customer_phone || '—'}</span></div>
                <div class="row"><strong>Product:</strong> <span>${sale.product?.product_name || sale.product_id}</span></div>
                <div class="row"><strong>IMEI:</strong> <span>${sale.product?.imei || '—'}</span></div>
                <div class="row"><strong>Amount:</strong> <span>${formatPrice(receipt.total_amount)}</span></div>
                <div class="row"><strong>Payment:</strong> <span>${receipt.payment_method}</span></div>
                ${sale.company_name ? `<div class="row"><strong>Company:</strong> <span>${sale.company_name}</span></div>` : ''}
                <div class="row"><strong>Status:</strong> <span>${receipt.payment_status}</span></div>
                ${sale.notes ? `<div class="row"><strong>Notes:</strong> <span>${sale.notes}</span></div>` : ''}
                <div class="total row"><strong>TOTAL PAID:</strong> <span>${formatPrice(receipt.total_amount)}</span></div>
                <div class="footer">
                    Thank you for your business!
                </div>
            </div>
            <div class="no-print" style="text-align:center; margin-top:20px;">
                <button onclick="window.print();">Print</button>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
};

export default function AgentSales() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const showTable = useMediaQuery(theme.breakpoints.up('md'));

    const { stock, loadingStock, fetchStock, createSale, saleLoading } = useAgentSales();
    const { data: customers, loading: customersLoading, fetchMyCustomers } = useCustomers();
    const { hasPermission } = usePermission();
    const { sales, total, loading: salesLoading, unauthorized, page: salesPage, setPage: setSalesPage, rowsPerPage: salesRowsPerPage, setRowsPerPage: setSalesRowsPerPage, fetchSales } = useSalesHistory();

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [saleForm, setSaleForm] = useState({
        customer_id: '',
        payment_method: 'cash',
        total_amount: 0,
        notes: '',
        company_id: '', // for loan
    });
    const [applyDiscount, setApplyDiscount] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [productFilter, setProductFilter] = useState('');
    const [tabValue, setTabValue] = useState(0);

    const canSell = hasPermission('agent.sale.create');

    useEffect(() => {
        fetchStock();
    }, [fetchStock]);

    useEffect(() => {
        if (openDialog) {
            fetchMyCustomers({ search: customerSearch, per_page: 20 });
        }
    }, [openDialog, customerSearch, fetchMyCustomers]);

    // Update total_amount when payment method changes, company changes, or product changes
    useEffect(() => {
        if (selectedProduct) {
            let price = 0;
            if (saleForm.payment_method === 'cash') {
                price = selectedProduct.cash_selling_price || 0;
            } else if (saleForm.payment_method === 'loan') {
                // Find selected company price
                const loanPrices = selectedProduct.loan_prices || [];
                const selected = loanPrices.find(lp => lp.company_id === saleForm.company_id);
                if (selected) {
                    price = selected.price || 0;
                } else if (loanPrices.length > 0) {
                    // Default to first if none selected
                    price = loanPrices[0].price || 0;
                }
            }
            if (!applyDiscount) {
                setSaleForm(prev => ({ ...prev, total_amount: price }));
            } else {
                if (!saleForm.total_amount || saleForm.total_amount === 0) {
                    setSaleForm(prev => ({ ...prev, total_amount: price }));
                }
            }
        }
    }, [saleForm.payment_method, saleForm.company_id, selectedProduct, applyDiscount]);

    const filteredStock = stock.filter(item => {
        if (!productFilter) return true;
        const searchLower = productFilter.toLowerCase();
        return (
            (item.product_name && item.product_name.toLowerCase().includes(searchLower)) ||
            (item.imei && item.imei.toLowerCase().includes(searchLower)) ||
            (item.color && item.color.toLowerCase().includes(searchLower)) ||
            (item.category_name && item.category_name.toLowerCase().includes(searchLower)) ||
            (item.model && item.model.toLowerCase().includes(searchLower)) ||
            (item.sku && item.sku.toLowerCase().includes(searchLower))
        );
    });

    const handleOpenDialog = (product) => {
        setSelectedProduct(product);
        // Default to cash price if available, else first loan price, else 0
        let defaultPrice = product.cash_selling_price || 0;
        let defaultCompany = '';
        if (!defaultPrice && product.loan_prices && product.loan_prices.length > 0) {
            defaultPrice = product.loan_prices[0].price || 0;
            defaultCompany = product.loan_prices[0].company_id || '';
        }
        setSaleForm({
            customer_id: '',
            payment_method: 'cash',
            total_amount: defaultPrice,
            notes: '',
            company_id: defaultCompany,
        });
        setApplyDiscount(false);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedProduct(null);
        setSaleForm({
            customer_id: '',
            payment_method: 'cash',
            total_amount: 0,
            notes: '',
            company_id: '',
        });
        setApplyDiscount(false);
        setCustomerSearch('');
    };

    const handleSaleFormChange = (e) => {
        setSaleForm({ ...saleForm, [e.target.name]: e.target.value });
    };

    const handleCustomerSelect = (event, value) => {
        setSaleForm({ ...saleForm, customer_id: value?.customer_id || '' });
    };

    const handleToggleDiscount = (event) => {
        const checked = event.target.checked;
        setApplyDiscount(checked);
        if (checked) {
            setSaleForm(prev => ({ ...prev, payment_method: 'cash' }));
            if (selectedProduct) {
                const cashPrice = selectedProduct.cash_selling_price || 0;
                setSaleForm(prev => ({ ...prev, total_amount: cashPrice }));
            }
        } else {
            // Revert to standard price based on payment method
            if (selectedProduct) {
                let price = 0;
                if (saleForm.payment_method === 'cash') {
                    price = selectedProduct.cash_selling_price || 0;
                } else if (saleForm.payment_method === 'loan') {
                    const loanPrices = selectedProduct.loan_prices || [];
                    const selected = loanPrices.find(lp => lp.company_id === saleForm.company_id);
                    price = selected ? selected.price : (loanPrices.length > 0 ? loanPrices[0].price : 0);
                }
                setSaleForm(prev => ({ ...prev, total_amount: price }));
            }
        }
    };

    const handleSubmitSale = async () => {
        if (!saleForm.customer_id) {
            showSnackbar({ type: 'error', message: 'Please select a customer' });
            return;
        }
        if (!selectedProduct) return;

        const payload = {
            product_id: selectedProduct.product_id,
            customer_id: saleForm.customer_id,
            payment_method: saleForm.payment_method,
            notes: saleForm.notes,
        };

        // If loan, include company_id
        if (saleForm.payment_method === 'loan') {
            if (!saleForm.company_id) {
                showSnackbar({ type: 'error', message: 'Please select a loan company' });
                return;
            }
            payload.company_id = saleForm.company_id;
        }

        // If discount is applied, send the total_amount
        if (applyDiscount) {
            const cashPrice = selectedProduct.cash_selling_price || 0;
            if (parseFloat(saleForm.total_amount) > cashPrice) {
                showSnackbar({ type: 'error', message: 'Discount price cannot exceed the standard cash selling price.' });
                return;
            }
            payload.total_amount = parseFloat(saleForm.total_amount);
        }

        try {
            await createSale(payload);
            handleCloseDialog();
            if (tabValue === 1) fetchSales();
            showSnackbar({ type: 'success', message: 'Sale completed and receipt generated!' });
        } catch (err) {
            // error already handled by hook
        }
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        if (newValue === 1) fetchSales();
    };

    const isPaymentMethodAvailable = (method) => {
        if (!selectedProduct) return false;
        if (method === 'cash') return selectedProduct.cash_selling_price !== null && selectedProduct.cash_selling_price !== undefined;
        if (method === 'loan') {
            const loanPrices = selectedProduct.loan_prices || [];
            return loanPrices.length > 0;
        }
        return false;
    };

    if (!canSell) {
        return <Typography sx={{ p: 2 }}>You do not have permission to sell products.</Typography>;
    }

    // Product Card for mobile/tablet POS view (shows loan options)
    const ProductCard = ({ item }) => {
        const loanPrices = item.loan_prices || [];
        return (
            <Card sx={{ mb: 2, borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="subtitle1" fontWeight="bold">{item.product_name || '—'}</Typography>
                        <Chip label={`Qty: ${item.available_quantity}`} color="success" size="small" />
                    </Box>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', my: 0.5 }}>IMEI: {item.imei || '—'}</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={1}>
                        <Grid item xs={6}><Typography variant="caption" color="text.secondary">Category</Typography><Typography variant="body2">{safeValue(item.category_name)}</Typography></Grid>
                        <Grid item xs={6}><Typography variant="caption" color="text.secondary">Model</Typography><Typography variant="body2">{safeValue(item.model)}</Typography></Grid>
                        <Grid item xs={6}><Typography variant="caption" color="text.secondary">SKU</Typography><Typography variant="body2">{safeValue(item.sku)}</Typography></Grid>
                        <Grid item xs={6}><Typography variant="caption" color="text.secondary">Cash Price</Typography><Typography variant="body2" fontWeight="bold">{formatPrice(item.cash_selling_price)}</Typography></Grid>
                        <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">Loan Options</Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                {loanPrices.map((lp, idx) => (
                                    <Chip key={idx} label={`${lp.company_name}: ${formatPrice(lp.price)}`} size="small" variant="outlined" />
                                ))}
                                {loanPrices.length === 0 && <Typography variant="body2" color="text.secondary">No loan options</Typography>}
                            </Stack>
                        </Grid>
                    </Grid>
                    <Box mt={1}>
                        <Button fullWidth variant="contained" startIcon={<SellIcon />} onClick={() => handleOpenDialog(item)} size="small">
                            Sale
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        );
    };

    // Sale Card for mobile/tablet Sales History (shows company if loan)
    const SaleCard = ({ sale }) => {
        const companyName = sale.payment_method === 'loan' && sale.company_name ? sale.company_name : null;
        return (
            <Card sx={{ mb: 2, borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="caption" color="text.secondary">{new Date(sale.created_at).toLocaleString()}</Typography>
                        <Chip label={sale.status} color={sale.status === 'completed' ? 'success' : 'default'} size="small" />
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="body2"><strong>{sale.customer?.customer_name || '—'}</strong></Typography>
                    </Box>
                    {sale.customer?.msisdn && (
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <PhoneIcon fontSize="small" color="action" />
                            <Typography variant="body2">{sale.customer.msisdn}</Typography>
                        </Box>
                    )}
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <ReceiptIcon fontSize="small" color="action" />
                        <Typography variant="body2">{sale.product?.product_name || '—'}</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mb: 1 }}>IMEI: {sale.product?.imei || '—'}</Typography>
                    {companyName && (
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <CompanyIcon fontSize="small" color="action" />
                            <Typography variant="body2">{companyName}</Typography>
                        </Box>
                    )}
                    <Divider sx={{ my: 1 }} />
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="caption" color="text.secondary">Amount</Typography>
                            <Typography variant="body2" fontWeight="bold">{formatPrice(sale.total_amount)}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Payment</Typography>
                            <Chip label={sale.payment_method} size="small" />
                        </Box>
                        {sale.receipt ? (
                            <IconButton size="small" onClick={() => printReceipt(sale.receipt, sale)}>
                                <PrintIcon />
                            </IconButton>
                        ) : (
                            <Typography variant="caption" color="text.secondary">No receipt</Typography>
                        )}
                    </Box>
                </CardContent>
            </Card>
        );
    };

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }} variant="fullWidth">
                    <Tab label="Point of Sale" />
                    <Tab label="Sales History" />
                </Tabs>

                {/* POS Tab */}
                {tabValue === 0 && (
                    <Box>
                        <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}>
                            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={2}>
                                <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>Point of Sale</Typography>
                                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchStock} disabled={loadingStock} fullWidth={isMobile}>
                                    Refresh Stock
                                </Button>
                            </Box>
                            <TextField
                                size="small"
                                placeholder="Filter by name, IMEI, colour, category, model or SKU..."
                                value={productFilter}
                                onChange={(e) => setProductFilter(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                                fullWidth
                            />
                        </Box>

                        {showTable ? (
                            // Desktop Table View
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Product Name</TableCell>
                                            <TableCell>IMEI</TableCell>
                                            <TableCell>Category</TableCell>
                                            <TableCell>Model</TableCell>
                                            <TableCell>SKU</TableCell>
                                            <TableCell>Cash Price</TableCell>
                                            <TableCell>Loan Options</TableCell>
                                            <TableCell align="center">Qty</TableCell>
                                            <TableCell align="center">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loadingStock ? (
                                            <TableRow><TableCell colSpan={9} align="center"><CircularProgress size={28} /></TableCell></TableRow>
                                        ) : filteredStock.length === 0 ? (
                                            <TableRow><TableCell colSpan={9} align="center">
                                                {productFilter ? 'No products match your filter.' : 'No available stock. Please ask admin to assign products.'}
                                            </TableCell></TableRow>
                                        ) : (
                                            filteredStock.map((item, idx) => {
                                                const loanPrices = item.loan_prices || [];
                                                return (
                                                    <TableRow key={idx} hover>
                                                        <TableCell><Typography variant="body2" fontWeight={500}>{item.product_name || '—'}</Typography></TableCell>
                                                        <TableCell><Typography variant="body2" fontFamily="monospace">{item.imei || '—'}</Typography></TableCell>
                                                        <TableCell>{safeValue(item.category_name)}</TableCell>
                                                        <TableCell>{safeValue(item.model)}</TableCell>
                                                        <TableCell>{safeValue(item.sku)}</TableCell>
                                                        <TableCell>{formatPrice(item.cash_selling_price)}</TableCell>
                                                        <TableCell>
                                                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                                {loanPrices.map((lp, i) => (
                                                                    <Chip key={i} label={`${lp.company_name}: ${formatPrice(lp.price)}`} size="small" variant="outlined" />
                                                                ))}
                                                                {loanPrices.length === 0 && <Typography variant="caption">—</Typography>}
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell align="center"><Chip label={item.available_quantity} color="success" size="small" /></TableCell>
                                                        <TableCell align="center">
                                                            <Tooltip title="Sell this product">
                                                                <IconButton color="primary" onClick={() => handleOpenDialog(item)}>
                                                                    <SellIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            // Mobile/Tablet Card View
                            <Box sx={{ p: 2 }}>
                                {loadingStock ? (
                                    <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                                ) : filteredStock.length === 0 ? (
                                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                                        <Typography>{productFilter ? 'No products match your filter.' : 'No available stock. Please ask admin to assign products.'}</Typography>
                                    </Paper>
                                ) : (
                                    filteredStock.map((item, idx) => <ProductCard key={idx} item={item} />)
                                )}
                            </Box>
                        )}
                    </Box>
                )}

                {/* Sales History Tab */}
                {tabValue === 1 && (
                    <Box>
                        <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                            <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>Sales History</Typography>
                            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchSales} disabled={salesLoading} fullWidth={isMobile}>
                                Refresh
                            </Button>
                        </Box>

                        {showTable ? (
                            // Desktop Table View
                            <>
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                {headCellsSales.map(cell => <TableCell key={cell.id}>{cell.label}</TableCell>)}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {salesLoading ? (
                                                <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={28} /></TableCell></TableRow>
                                            ) : unauthorized ? (
                                                <TableRow><TableCell colSpan={8} align="center"><Typography color="error">You are not authorized to view sales history. Only sales agents can access this page.</Typography></TableCell></TableRow>
                                            ) : sales.length === 0 ? (
                                                <TableRow><TableCell colSpan={8} align="center">No sales found</TableCell></TableRow>
                                            ) : (
                                                sales.map((sale) => {
                                                    const companyName = sale.payment_method === 'loan' && sale.company_name ? sale.company_name : '—';
                                                    return (
                                                        <TableRow key={sale.sale_id || sale.id} hover>
                                                            <TableCell>{new Date(sale.created_at).toLocaleString()}</TableCell>
                                                            <TableCell>
                                                                {sale.customer?.customer_name || '—'}<br />
                                                                <small>{sale.customer?.msisdn || ''}</small>
                                                            </TableCell>
                                                            <TableCell>
                                                                {sale.product?.product_name || '—'}<br />
                                                                <small>IMEI: {sale.product?.imei || '—'}</small>
                                                            </TableCell>
                                                            <TableCell>{formatPrice(sale.total_amount)}</TableCell>
                                                            <TableCell><Chip label={sale.payment_method} size="small" /></TableCell>
                                                            <TableCell>{companyName}</TableCell>
                                                            <TableCell><Chip label={sale.status} color={sale.status === 'completed' ? 'success' : 'default'} size="small" /></TableCell>
                                                            <TableCell>
                                                                {sale.receipt ? (
                                                                    <Tooltip title="Print Receipt">
                                                                        <IconButton size="small" onClick={() => printReceipt(sale.receipt, sale)}>
                                                                            <PrintIcon />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                ) : (
                                                                    <Typography variant="caption" color="text.secondary">No receipt</Typography>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                {!unauthorized && (
                                    <TablePagination
                                        rowsPerPageOptions={[5, 10, 25]}
                                        component="div"
                                        count={total}
                                        rowsPerPage={salesRowsPerPage}
                                        page={salesPage}
                                        onPageChange={(e, p) => setSalesPage(p)}
                                        onRowsPerPageChange={(e) => { setSalesRowsPerPage(parseInt(e.target.value, 10)); setSalesPage(0); }}
                                    />
                                )}
                            </>
                        ) : (
                            // Mobile/Tablet Card View
                            <Box sx={{ p: 2 }}>
                                {salesLoading ? (
                                    <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                                ) : unauthorized ? (
                                    <Paper sx={{ p: 3, textAlign: 'center' }}><Typography color="error">You are not authorized to view sales history. Only sales agents can access this page.</Typography></Paper>
                                ) : sales.length === 0 ? (
                                    <Paper sx={{ p: 3, textAlign: 'center' }}><Typography>No sales found</Typography></Paper>
                                ) : (
                                    <>
                                        {sales.map((sale) => <SaleCard key={sale.sale_id || sale.id} sale={sale} />)}
                                        <Box display="flex" justifyContent="center" mt={2}>
                                            <TablePagination
                                                rowsPerPageOptions={[5, 10, 25]}
                                                component="div"
                                                count={total}
                                                rowsPerPage={salesRowsPerPage}
                                                page={salesPage}
                                                onPageChange={(e, p) => setSalesPage(p)}
                                                onRowsPerPageChange={(e) => { setSalesRowsPerPage(parseInt(e.target.value, 10)); setSalesPage(0); }}
                                                labelRowsPerPage="Rows:"
                                                sx={{
                                                    '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                                                        fontSize: '0.8rem'
                                                    }
                                                }}
                                            />
                                        </Box>
                                    </>
                                )}
                            </Box>
                        )}
                    </Box>
                )}
            </Paper>

            {/* Sale Dialog with company selector for loan */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Complete Sale</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {selectedProduct && (
                            <>
                                <Typography variant="subtitle2">Product Details</Typography>
                                <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
                                    <Typography variant="body2"><strong>Product:</strong> {selectedProduct.product_name || '—'}</Typography>
                                    <Typography variant="body2"><strong>SKU:</strong> {safeValue(selectedProduct.sku)}</Typography>
                                    <Typography variant="body2"><strong>IMEI:</strong> {selectedProduct.imei || '—'}</Typography>
                                    <Typography variant="body2"><strong>Category:</strong> {safeValue(selectedProduct.category_name)}</Typography>
                                    <Typography variant="body2"><strong>Model:</strong> {safeValue(selectedProduct.model)}</Typography>
                                    <Typography variant="body2"><strong>Cash Price:</strong> {formatPrice(selectedProduct.cash_selling_price)}</Typography>
                                    <Typography variant="body2"><strong>Loan Options:</strong></Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        {(selectedProduct.loan_prices || []).map((lp, idx) => (
                                            <Chip key={idx} label={`${lp.company_name}: ${formatPrice(lp.price)}`} size="small" variant="outlined" />
                                        ))}
                                    </Stack>
                                </Box>
                            </>
                        )}

                        <Autocomplete
                            options={customers}
                            getOptionLabel={(option) => `${option.customer_name} (${option.msisdn || option.email || 'no phone'})`}
                            loading={customersLoading}
                            onInputChange={(e, val) => setCustomerSearch(val)}
                            onChange={handleCustomerSelect}
                            renderInput={(params) => <TextField {...params} label="Customer" placeholder="Search by name, phone or email" fullWidth required />}
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={applyDiscount}
                                    onChange={handleToggleDiscount}
                                    color="primary"
                                />
                            }
                            label={<Box display="flex" alignItems="center"><DiscountIcon sx={{ mr: 1 }} /> Apply Discount</Box>}
                        />

                        <TextField
                            select
                            label="Payment Method"
                            name="payment_method"
                            value={saleForm.payment_method}
                            onChange={handleSaleFormChange}
                            fullWidth
                            disabled={applyDiscount}
                            helperText={applyDiscount ? 'Discount sales must be cash payments' : ''}
                        >
                            <MenuItem value="cash" disabled={!isPaymentMethodAvailable('cash')}>
                                Cash {!isPaymentMethodAvailable('cash') && '(price not set)'}
                            </MenuItem>
                            <MenuItem value="loan" disabled={!isPaymentMethodAvailable('loan') || applyDiscount}>
                                Loan {(!isPaymentMethodAvailable('loan') || applyDiscount) && (applyDiscount ? '(not allowed with discount)' : '(no loan options)')}
                            </MenuItem>
                        </TextField>

                        {saleForm.payment_method === 'loan' && (
                            <FormControl fullWidth>
                                <InputLabel>Loan Company</InputLabel>
                                <Select
                                    name="company_id"
                                    value={saleForm.company_id}
                                    onChange={handleSaleFormChange}
                                    label="Loan Company"
                                >
                                    {(selectedProduct?.loan_prices || []).map((lp) => (
                                        <MenuItem key={lp.company_id} value={lp.company_id}>
                                            {lp.company_name} - {formatPrice(lp.price)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        <TextField
                            label="Total Amount (TZS)"
                            name="total_amount"
                            type="number"
                            value={saleForm.total_amount}
                            onChange={handleSaleFormChange}
                            fullWidth
                            required
                            disabled={!applyDiscount}
                            InputProps={{
                                readOnly: !applyDiscount,
                            }}
                            helperText={applyDiscount ? 'Enter discounted price (must be ≤ cash price)' : 'Amount is auto-calculated based on payment method and company.'}
                        />

                        <TextField
                            label="Notes (optional)"
                            name="notes"
                            multiline
                            rows={2}
                            value={saleForm.notes}
                            onChange={handleSaleFormChange}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button
                        onClick={handleSubmitSale}
                        variant="contained"
                        disabled={saleLoading || !isPaymentMethodAvailable(saleForm.payment_method)}
                    >
                        {saleLoading ? <CircularProgress size={24} /> : 'Confirm Sale'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}