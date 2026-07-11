// src/pages/products/ProductList.js - WITH TOOLTIP
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField,
    Typography, CircularProgress, Switch, FormControlLabel, Card, CardContent,
    Divider, useMediaQuery, useTheme, Tooltip, Collapse
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Refresh as RefreshIcon, Search as SearchIcon, Restore as RestoreIcon,
    Block as BlockIcon, CheckCircle as CheckCircleIcon,
    AttachMoney as CashIcon, ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon, Business as BusinessIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { useProducts } from '@/hooks/useProducts';
import ProductModal from './ProductModal';
import api from 'services/api';

const headCells = [
    { id: 'product_details', label: 'Product Details' },
    { id: 'sku', label: 'SKU' },
    { id: 'imei', label: 'IMEI' },
    { id: 'buying_price', label: 'Buying Price (TSh)' },
    { id: 'cash_selling_price', label: 'Cash Selling Price (TSh)' },
    { id: 'loan_selling_price', label: 'Company Loan Prices' },
    { id: 'status', label: 'Status' },
    { id: 'stock_status', label: 'Stock Status' },
    { id: 'created_at', label: 'Created At' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

export default function ProductList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('lg'));

    const { hasPermission } = usePermission();
    const canView = hasPermission('products.view');
    const canCreate = hasPermission('products.create');
    const canEdit = hasPermission('products.edit');
    const canRestore = hasPermission('products.restore');
    const canChangeStatus = hasPermission('products.change_status');

    const { data, total, loading, fetchData, restore, changeStatus } = useProducts();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [showDeleted, setShowDeleted] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [expandedLoanPrices, setExpandedLoanPrices] = useState({});
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });
    const [companyNames, setCompanyNames] = useState({});

    const fetchProducts = useCallback(() => {
        if (!canView) return;
        const params = {
            page: page + 1,
            per_page: rowsPerPage,
            search: search || undefined,
            trashed: showDeleted ? true : undefined,
        };
        fetchData(params);
    }, [page, rowsPerPage, search, showDeleted, canView, fetchData]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const products = Array.isArray(data) ? data : [];

    const fetchCompanyNames = useCallback(async (companyIds) => {
        const uniqueIds = [...new Set(companyIds.filter(id => id && !companyNames[id]))];
        if (uniqueIds.length === 0) return;

        try {
            const res = await api.get('/v18/companies/dropdown');
            if (res.data?.success) {
                const companies = res.data.data || [];
                const nameMap = {};
                companies.forEach(company => {
                    nameMap[company.id] = company.label || company.company_name || company.id;
                });
                setCompanyNames(prev => ({ ...prev, ...nameMap }));
            }
        } catch (err) {
            console.error('Failed to fetch company names:', err);
        }
    }, [companyNames]);

    useEffect(() => {
        if (!products || products.length === 0) return;

        const allCompanyIds = [];
        products.forEach(product => {
            if (product.loan_selling_price) {
                const prices = typeof product.loan_selling_price === 'string'
                    ? JSON.parse(product.loan_selling_price)
                    : product.loan_selling_price;
                if (Array.isArray(prices)) {
                    prices.forEach(p => {
                        if (p.company_id) allCompanyIds.push(p.company_id);
                    });
                }
            }
        });

        if (allCompanyIds.length > 0) {
            fetchCompanyNames(allCompanyIds);
        }
    }, [products, fetchCompanyNames]);

    const handleMenuOpen = (event, product) => {
        setSelectedProduct(product);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => {
        setActionMenu(null);
        setSelectedProduct(null);
    };

    const handleEdit = () => {
        setEditingProduct(selectedProduct);
        setModalOpen(true);
        handleMenuClose();
    };

    const handleRestore = () => {
        setConfirmDialog({
            open: true,
            title: 'Restore Product',
            message: `Are you sure you want to restore product with IMEI "${selectedProduct?.imei}"?`,
            action: async () => {
                try {
                    await restore(selectedProduct.product_id);
                    showSnackbar({ type: 'success', message: 'Product restored successfully' });
                    fetchProducts();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Restore failed' });
                }
            }
        });
        handleMenuClose();
    };

    const handleToggleStatus = () => {
        if (!selectedProduct) return;
        const newStatus = selectedProduct.status === 'active' ? 'inactive' : 'active';
        setConfirmDialog({
            open: true,
            title: `${newStatus === 'active' ? 'Activate' : 'Deactivate'} Product`,
            message: `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} product with IMEI "${selectedProduct.imei}"?`,
            action: async () => {
                try {
                    await changeStatus(selectedProduct.product_id, newStatus);
                    showSnackbar({ type: 'success', message: `Product ${newStatus}d successfully` });
                    fetchProducts();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Status change failed' });
                }
            }
        });
        handleMenuClose();
    };

    const handleModalClose = (refresh) => {
        setModalOpen(false);
        setEditingProduct(null);
        if (refresh) fetchProducts();
    };

    const handleConfirm = async () => {
        if (!confirmDialog.action) return;
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        try {
            await confirmDialog.action();
        } catch {
            // error already handled
        }
    };

    const toggleLoanPrices = (productId) => {
        setExpandedLoanPrices(prev => ({
            ...prev,
            [productId]: !prev[productId]
        }));
    };

    if (!canView) {
        return <Typography sx={{ p: 2 }}>You do not have permission to view products.</Typography>;
    }

    const getStatusChip = (status) => {
        switch (status) {
            case 'active': return <Chip label="Active" color="success" size="small" />;
            case 'inactive': return <Chip label="Inactive" color="default" size="small" />;
            case 'sold': return <Chip label="Sold" color="error" size="small" />;
            case 'damaged': return <Chip label="Damaged" color="warning" size="small" />;
            default: return <Chip label={status} size="small" />;
        }
    };

    const getStockStatusChip = (stockStatus) => {
        switch (stockStatus) {
            case 'in_stock': return <Chip label="In Stock" color="success" size="small" />;
            case 'transferred': return <Chip label="Transferred" color="info" size="small" />;
            case 'received': return <Chip label="Received" color="primary" size="small" />;
            default: return <Chip label={stockStatus} size="small" />;
        }
    };

    const getProductDetails = (product) => {
        const categoryName = product.category_name || product.category?.category_name || 'N/A';
        const model = product.category?.model || 'N/A';
        return `Category: ${categoryName} | Model: ${model}`;
    };

    const formatPrice = (price) => {
        if (!price && price !== 0) return '-';
        return `TSh ${parseFloat(price).toLocaleString()}`;
    };

    const getLoanPricesArray = (product) => {
        if (!product) return [];

        const loanPrices = product.loan_selling_price;
        if (!loanPrices) return [];

        if (Array.isArray(loanPrices)) {
            return loanPrices;
        }

        if (typeof loanPrices === 'string') {
            try {
                const parsed = JSON.parse(loanPrices);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.error('Failed to parse loan_selling_price:', e);
                return [];
            }
        }

        if (typeof loanPrices === 'object') {
            const values = Object.values(loanPrices);
            if (values.length > 0 && values.every(v => typeof v === 'object')) {
                return values;
            }
            return [];
        }

        return [];
    };

    const getCompanyName = (companyId) => {
        return companyNames[companyId] || companyId;
    };

    // ✅ Get all loan prices as a formatted string for tooltip
    const getLoanPricesTooltip = (product) => {
        const prices = getLoanPricesArray(product);
        if (prices.length === 0) return 'No loan prices';

        return prices.map(lp => `${getCompanyName(lp?.company_id)}: TSh ${parseFloat(lp?.price || 0).toLocaleString()}`).join('\n');
    };

    // ✅ Loan Prices Cell Component with Tooltip
    const LoanPricesCell = ({ product }) => {
        const loanPrices = getLoanPricesArray(product);
        const isExpanded = expandedLoanPrices[product?.product_id] || false;
        const displayCount = 2;

        const pricesArray = Array.isArray(loanPrices) ? loanPrices : [];

        if (pricesArray.length === 0) {
            return (
                <Tooltip title="No loan prices set for this product" arrow placement="top">
                    <Typography variant="caption" color="text.secondary">No loan prices</Typography>
                </Tooltip>
            );
        }

        const visiblePrices = isExpanded ? pricesArray : pricesArray.slice(0, displayCount);
        const hasMore = pricesArray.length > displayCount;
        const tooltipText = getLoanPricesTooltip(product);

        return (
            <Tooltip
                title={tooltipText}
                arrow
                placement="top"
                PopperProps={{
                    sx: {
                        '& .MuiTooltip-tooltip': {
                            whiteSpace: 'pre-line',
                            maxWidth: 300,
                            fontSize: '0.75rem',
                            backgroundColor: 'rgba(0, 0, 0, 0.87)',
                        }
                    }
                }}
            >
                <Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                        <BusinessIcon fontSize="small" color="primary" />
                        <Typography variant="caption" fontWeight="bold">
                            {pricesArray.length} company{pricesArray.length > 1 ? 'ies' : ''}
                        </Typography>
                        <IconButton size="small" onClick={() => toggleLoanPrices(product.product_id)}>
                            {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </IconButton>
                    </Box>
                    <Collapse in={isExpanded || pricesArray.length <= displayCount}>
                        <Box sx={{ mt: 0.5 }}>
                            {visiblePrices.map((lp, idx) => (
                                <Typography key={idx} variant="caption" display="block" sx={{ fontSize: '0.7rem' }}>
                                    {getCompanyName(lp?.company_id)}: {formatPrice(lp?.price)}
                                </Typography>
                            ))}
                            {hasMore && !isExpanded && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                    +{pricesArray.length - displayCount} more
                                </Typography>
                            )}
                        </Box>
                    </Collapse>
                </Box>
            </Tooltip>
        );
    };

    // ✅ ProductCard with Tooltip
    const ProductCard = ({ product, onEdit, onRestore, onToggleStatus }) => {
        const isDeleted = !!product?.deleted_at;
        const loanPrices = getLoanPricesArray(product);
        const isExpanded = expandedLoanPrices[product?.product_id] || false;

        const pricesArray = Array.isArray(loanPrices) ? loanPrices : [];
        const tooltipText = getLoanPricesTooltip(product);

        return (
            <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', textAlign: 'center' }}>
                <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        {getProductDetails(product)}
                    </Typography>
                    <Divider sx={{ my: 1 }} />

                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2"><strong>SKU:</strong> {product?.sku || '-'}</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}><strong>IMEI:</strong> {product?.imei}</Typography>
                    </Box>

                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={0.5}>
                        <Typography variant="body2"><strong>Buying:</strong> {formatPrice(product?.buying_price)}</Typography>
                        <Typography variant="body2" sx={{ color: 'success.main' }}>
                            <strong>Cash:</strong> {formatPrice(product?.cash_selling_price)}
                        </Typography>
                    </Box>

                    {pricesArray.length > 0 && (
                        <Tooltip
                            title={tooltipText}
                            arrow
                            placement="top"
                            PopperProps={{
                                sx: {
                                    '& .MuiTooltip-tooltip': {
                                        whiteSpace: 'pre-line',
                                        maxWidth: 300,
                                        fontSize: '0.75rem',
                                        backgroundColor: 'rgba(0, 0, 0, 0.87)',
                                    }
                                }
                            }}
                        >
                            <Box sx={{ mt: 1, mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Typography variant="caption" fontWeight="bold">
                                        <BusinessIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                                        Company Loan Prices ({pricesArray.length})
                                    </Typography>
                                    <IconButton size="small" onClick={() => toggleLoanPrices(product.product_id)}>
                                        {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                    </IconButton>
                                </Box>
                                <Collapse in={isExpanded}>
                                    {pricesArray.map((lp, idx) => (
                                        <Typography key={idx} variant="caption" display="block" sx={{ fontSize: '0.7rem' }}>
                                            {getCompanyName(lp?.company_id)}: {formatPrice(lp?.price)}
                                        </Typography>
                                    ))}
                                </Collapse>
                                {!isExpanded && pricesArray.length > 2 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                        +{pricesArray.length - 2} more
                                    </Typography>
                                )}
                            </Box>
                        </Tooltip>
                    )}

                    <Box display="flex" justifyContent="center" gap={1} mb={1}>
                        {getStatusChip(product?.status)}
                        {getStockStatusChip(product?.stock_status)}
                    </Box>

                    <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                        Created: {product?.created_at ? new Date(product.created_at).toLocaleString() : 'N/A'}
                    </Typography>

                    <Divider sx={{ my: 1.5 }} />

                    <Box display="flex" flexDirection="column" gap={1}>
                        {!isDeleted && canEdit && (
                            <Button fullWidth variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(product)}>
                                Edit
                            </Button>
                        )}
                        {!isDeleted && canChangeStatus && (
                            <Button
                                fullWidth
                                variant="outlined"
                                color={product?.status === 'active' ? 'warning' : 'success'}
                                startIcon={product?.status === 'active' ? <BlockIcon /> : <CheckCircleIcon />}
                                onClick={() => onToggleStatus(product)}
                            >
                                {product?.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Button>
                        )}
                        {isDeleted && canRestore && (
                            <Button fullWidth variant="outlined" color="success" startIcon={<RestoreIcon />} onClick={() => onRestore(product)}>
                                Restore
                            </Button>
                        )}
                    </Box>
                </CardContent>
            </Card>
        );
    };

    return (
        <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 }, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden', boxShadow: 1 }}>
                <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={2}>
                        <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                            Products
                        </Typography>
                        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={showDeleted}
                                        onChange={(e) => setShowDeleted(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Show Deleted"
                            />
                            {canCreate && !showDeleted && (
                                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)} fullWidth={isMobile}>
                                    New Product
                                </Button>
                            )}
                        </Box>
                    </Box>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                        <TextField
                            label="Search by IMEI, SKU or category"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                            }}
                            sx={{ flex: 1, minWidth: { xs: '100%', sm: 250 } }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchProducts} fullWidth={isMobile}>
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {showTableView ? (
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table sx={{ minWidth: 1300 }}>
                            <TableHead>
                                <TableRow>
                                    {headCells.map((cell) => (
                                        <TableCell key={cell.id}>{cell.label}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={headCells.length} align="center"><CircularProgress size={32} sx={{ my: 3 }} /></TableCell></TableRow>
                                ) : products.length === 0 ? (
                                    <TableRow><TableCell colSpan={headCells.length} align="center">No products found</TableCell></TableRow>
                                ) : (
                                    products.map((product) => (
                                        <TableRow key={product.product_id} hover>
                                            <TableCell>{getProductDetails(product)}</TableCell>
                                            <TableCell>{product.sku || '-'}</TableCell>
                                            <TableCell><code style={{ fontSize: '0.82rem' }}>{product.imei}</code></TableCell>
                                            <TableCell>{formatPrice(product.buying_price)}</TableCell>
                                            <TableCell>
                                                {product.cash_selling_price ? (
                                                    <Tooltip title="Cash Price">
                                                        <Box display="flex" alignItems="center" gap={0.5}>
                                                            <CashIcon fontSize="small" color="success" />
                                                            {formatPrice(product.cash_selling_price)}
                                                        </Box>
                                                    </Tooltip>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <LoanPricesCell product={product} />
                                            </TableCell>
                                            <TableCell>{getStatusChip(product.status)}</TableCell>
                                            <TableCell>{getStockStatusChip(product.stock_status)}</TableCell>
                                            <TableCell>{new Date(product.created_at).toLocaleString()}</TableCell>
                                            <TableCell>
                                                <IconButton size="small" onClick={(e) => handleMenuOpen(e, product)}>
                                                    <MoreVertIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                        ) : products.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>No products found</Paper>
                        ) : (
                            products.map((product) => (
                                <ProductCard
                                    key={product.product_id}
                                    product={product}
                                    onEdit={() => {
                                        setEditingProduct(product);
                                        setModalOpen(true);
                                    }}
                                    onRestore={() => {
                                        setSelectedProduct(product);
                                        handleRestore();
                                    }}
                                    onToggleStatus={() => {
                                        setSelectedProduct(product);
                                        handleToggleStatus();
                                    }}
                                />
                            ))
                        )}
                    </Box>
                )}

                <Box sx={{ borderTop: 1, borderColor: 'divider', py: { xs: 1, sm: 0 } }}>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={total}
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

            <Menu anchorEl={actionMenu} open={Boolean(actionMenu)} onClose={handleMenuClose}>
                {selectedProduct && !selectedProduct.deleted_at && canEdit && (
                    <MenuItem onClick={handleEdit}><EditIcon sx={{ mr: 1 }} /> Edit</MenuItem>
                )}
                {selectedProduct && !selectedProduct.deleted_at && canChangeStatus && (
                    <MenuItem onClick={handleToggleStatus}>
                        {selectedProduct.status === 'active' ? (
                            <><BlockIcon sx={{ mr: 1, color: 'warning.main' }} /> Deactivate</>
                        ) : (
                            <><CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} /> Activate</>
                        )}
                    </MenuItem>
                )}
                {selectedProduct && selectedProduct.deleted_at && canRestore && (
                    <MenuItem onClick={handleRestore}><RestoreIcon sx={{ mr: 1, color: 'success.main' }} /> Restore</MenuItem>
                )}
            </Menu>

            <ProductModal open={modalOpen} onClose={handleModalClose} product={editingProduct} />

            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))} fullWidth maxWidth="xs">
                <DialogTitle sx={{ pb: 1 }}>{confirmDialog.title}</DialogTitle>
                <DialogContent><Typography>{confirmDialog.message}</Typography></DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button onClick={handleConfirm} color="error" variant="contained">Confirm</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}