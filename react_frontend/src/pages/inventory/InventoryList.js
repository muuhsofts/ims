// src/pages/inventory/InventoryList.js
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, Menu, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography, CircularProgress, Card, CardContent, Divider, useMediaQuery, useTheme, Tooltip, Collapse } from '@mui/material';
import { Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon, Refresh as RefreshIcon, Search as SearchIcon, Warehouse as WarehouseIcon, Inventory as InventoryIcon, Person as PersonIcon, AttachMoney as CashIcon, Business as BusinessIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { useInventory } from '@/hooks/useInventory';
import InventoryModal from './InventoryModal';
import api from 'services/api';

const headCells = [
    { id: 'warehouse', label: 'Warehouse' },
    { id: 'products', label: 'Products' },
    { id: 'quantity', label: 'Quantity' },
    { id: 'created_by', label: 'Created By' },
    { id: 'created_at', label: 'Created At' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

// Helper for product label - WITHOUT prices to avoid duplication
const getProductLabel = (product) => {
    const categoryName = product.category_name || product.category?.category_name || 'N/A';
    const model = product.category?.model || 'N/A';
    const sku = product.sku || 'N/A';
    const imei = product.imei || 'N/A';
    return `${categoryName} | ${model} | SKU: ${sku} | IMEI: ${imei}`;
};

// Format price helper
const formatPrice = (price) => {
    if (!price && price !== 0) return null;
    return `TSh ${parseFloat(price).toLocaleString()}`;
};

// ✅ Get loan prices array from product
const getLoanPricesArray = (product) => {
    if (!product.loan_selling_price) return [];
    const prices = typeof product.loan_selling_price === 'string'
        ? JSON.parse(product.loan_selling_price)
        : product.loan_selling_price;
    return Array.isArray(prices) ? prices : [];
};

export default function InventoryList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

    const { hasPermission } = usePermission();
    const canView = hasPermission('inventory.view');
    const canCreate = hasPermission('inventory.create');
    const canEdit = hasPermission('inventory.edit');

    const { data, total, loading, fetchData } = useInventory();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingInventory, setEditingInventory] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [selectedInventory, setSelectedInventory] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });
    // ✅ State for company names cache
    const [companyNames, setCompanyNames] = useState({});

    const fetchInventory = useCallback(() => {
        if (!canView) return;
        const params = {
            page: page + 1,
            per_page: rowsPerPage,
            search: search || undefined,
        };
        fetchData(params);
    }, [page, rowsPerPage, search, canView, fetchData]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    // ✅ Fetch company names for all unique company IDs in loan prices
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

    // ✅ Extract all company IDs from inventory products and fetch names
    useEffect(() => {
        if (!data || data.length === 0) return;

        const allCompanyIds = [];
        data.forEach(inventory => {
            if (inventory.products && inventory.products.length > 0) {
                inventory.products.forEach(product => {
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
            }
        });

        if (allCompanyIds.length > 0) {
            fetchCompanyNames(allCompanyIds);
        }
    }, [data, fetchCompanyNames]);

    const handleMenuOpen = (event, inventory) => {
        setSelectedInventory(inventory);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => {
        setActionMenu(null);
        setSelectedInventory(null);
    };

    const handleEdit = () => {
        setEditingInventory(selectedInventory);
        setModalOpen(true);
        handleMenuClose();
    };

    const handleModalClose = (refresh) => {
        setModalOpen(false);
        setEditingInventory(null);
        if (refresh) fetchInventory();
    };

    const handleConfirm = async () => {
        if (!confirmDialog.action) return;
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
            await confirmDialog.action();
        } catch {
            // error already handled
        }
    };

    // Card-specific handlers
    const handleCardEdit = (inventory) => {
        setEditingInventory(inventory);
        setModalOpen(true);
    };

    // ✅ Get company name from cache
    const getCompanyName = (companyId) => {
        return companyNames[companyId] || companyId;
    };

    // ✅ Get loan prices with company names
    const getLoanPricesWithNames = (product) => {
        const prices = getLoanPricesArray(product);
        return prices.map(p => ({
            ...p,
            company_name: getCompanyName(p.company_id)
        }));
    };

    if (!canView) {
        return <Typography sx={{ p: 2 }}>You do not have permission to view inventory.</Typography>;
    }

    const inventories = Array.isArray(data) ? data : [];

    // ✅ Product Chip with Loan Prices - using company names
    const ProductChip = ({ product }) => {
        const loanPrices = getLoanPricesWithNames(product);
        const hasLoanPrices = loanPrices.length > 0;

        return (
            <Tooltip
                title={
                    <Box sx={{ p: 1, maxWidth: 300 }}>
                        <Typography variant="caption" display="block" fontWeight="bold">
                            {getProductLabel(product)}
                        </Typography>
                        {product.cash_selling_price && (
                            <Typography variant="caption" display="block" color="success.main">
                                Cash: {formatPrice(product.cash_selling_price)}
                            </Typography>
                        )}
                        {hasLoanPrices && (
                            <>
                                <Typography variant="caption" display="block" fontWeight="bold" sx={{ mt: 0.5 }}>
                                    Loan Prices:
                                </Typography>
                                {loanPrices.map((lp, idx) => (
                                    <Typography key={idx} variant="caption" display="block" sx={{ fontSize: '0.7rem' }}>
                                        • {lp.company_name}: {formatPrice(lp.price)}
                                    </Typography>
                                ))}
                            </>
                        )}
                    </Box>
                }
                arrow
            >
                <Chip
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <span>{getProductLabel(product)}</span>
                            {hasLoanPrices && (
                                <BusinessIcon fontSize="small" sx={{ fontSize: '0.7rem', color: 'primary.main' }} />
                            )}
                        </Box>
                    }
                    size="small"
                    sx={{
                        m: 0.3,
                        maxWidth: '100%',
                        height: 'auto',
                        whiteSpace: 'normal',
                        cursor: 'pointer',
                        '& .MuiChip-label': {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            flexWrap: 'wrap'
                        }
                    }}
                />
            </Tooltip>
        );
    };

    // ✅ Card component for mobile/tablet view with company names
    const InventoryCard = ({ inventory, canEdit, onEdit }) => {
        const [expanded, setExpanded] = useState(false);

        return (
            <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <CardContent sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <WarehouseIcon fontSize="small" color="primary" />
                            <Typography variant="subtitle1" fontWeight="bold">
                                {inventory.warehouse?.name || '—'}
                            </Typography>
                        </Box>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(inventory); }}>
                            <MoreVertIcon />
                        </IconButton>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <InventoryIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                            <strong>Quantity:</strong> {inventory.quantity ?? 0}
                        </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                        Products ({inventory.products?.length || 0}):
                    </Typography>
                    <Box sx={{ maxHeight: expanded ? 'none' : 120, overflowY: 'auto', bgcolor: 'action.hover', borderRadius: 1, p: 1, mb: 1 }}>
                        {inventory.products && inventory.products.length > 0 ? (
                            inventory.products.map((p, idx) => {
                                const loanPrices = getLoanPricesWithNames(p);
                                return (
                                    <Box key={p.product_id} sx={{ py: 0.25 }}>
                                        <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                                            {getProductLabel(p)}
                                        </Typography>
                                        {/* Show prices with loan prices and company names */}
                                        <Box display="flex" gap={2} sx={{ ml: 1, mt: 0.25, flexWrap: 'wrap' }}>
                                            {p.cash_selling_price && (
                                                <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <CashIcon fontSize="inherit" sx={{ fontSize: '0.7rem' }} />
                                                    Cash: {formatPrice(p.cash_selling_price)}
                                                </Typography>
                                            )}
                                            {/* ✅ Company Loan Prices with company names */}
                                            {loanPrices.map((lp, idx) => (
                                                <Typography key={idx} variant="caption" color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <BusinessIcon fontSize="inherit" sx={{ fontSize: '0.7rem' }} />
                                                    {lp.company_name}: {formatPrice(lp.price)}
                                                </Typography>
                                            ))}
                                        </Box>
                                    </Box>
                                );
                            })
                        ) : (
                            <Typography variant="caption">No products</Typography>
                        )}
                    </Box>
                    {inventory.products?.length > 3 && (
                        <Button size="small" onClick={() => setExpanded(!expanded)} sx={{ mb: 1 }}>
                            {expanded ? 'Show Less' : 'Show More'}
                        </Button>
                    )}
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                            <strong>Created By:</strong> {inventory.created_by_user?.name || '-'}
                        </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Created: {new Date(inventory.created_at).toLocaleString()}
                    </Typography>
                    <Divider sx={{ my: 1.5 }} />
                    <Box display="flex" justifyContent="flex-end" gap={1}>
                        {canEdit && (
                            <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(inventory)}>
                                Edit
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
                {/* Header & Filters */}
                <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={2}>
                        <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                            Inventory Records
                        </Typography>
                        {canCreate && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)} fullWidth={isMobile}>
                                Add Inventory
                            </Button>
                        )}
                    </Box>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                        <TextField
                            label="Search by warehouse"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                            }}
                            sx={{ flex: 1, minWidth: { xs: '100%', sm: 250 } }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchInventory} fullWidth={isMobile}>
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {/* Table or Card View */}
                {showTableView ? (
                    // Desktop Table View
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table sx={{ minWidth: 800 }}>
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
                                ) : inventories.length === 0 ? (
                                    <TableRow><TableCell colSpan={headCells.length} align="center">No inventory records found</TableCell></TableRow>
                                ) : (
                                    inventories.map((inv) => (
                                        <TableRow key={inv.inventory_id} hover>
                                            <TableCell>{inv.warehouse?.name || '-'}</TableCell>
                                            <TableCell>
                                                {inv.products && inv.products.length > 0 ? (
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                                                        {inv.products.map(p => (
                                                            <ProductChip key={p.product_id} product={p} />
                                                        ))}
                                                    </Box>
                                                ) : (
                                                    <Typography variant="caption">No products</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>{inv.quantity ?? 0}</TableCell>
                                            <TableCell>{inv.created_by_user?.name || '-'}</TableCell>
                                            <TableCell>{new Date(inv.created_at).toLocaleString()}</TableCell>
                                            <TableCell>
                                                <IconButton size="small" onClick={(e) => handleMenuOpen(e, inv)}>
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
                    // Mobile/Tablet Card View
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                        ) : inventories.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>No inventory records found</Paper>
                        ) : (
                            inventories.map((inv) => (
                                <InventoryCard
                                    key={inv.inventory_id}
                                    inventory={inv}
                                    canEdit={canEdit}
                                    onEdit={handleCardEdit}
                                />
                            ))
                        )}
                    </Box>
                )}

                {/* Pagination */}
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

            {/* Action Menu (only for table view) */}
            <Menu anchorEl={actionMenu} open={Boolean(actionMenu)} onClose={handleMenuClose}>
                {canEdit && (
                    <MenuItem onClick={handleEdit}>
                        <EditIcon sx={{ mr: 1 }} /> Edit
                    </MenuItem>
                )}
            </Menu>

            <InventoryModal open={modalOpen} onClose={handleModalClose} inventory={editingInventory} />

            {/* Confirm Dialog (kept for future use if needed) */}
            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))} fullWidth maxWidth="xs">
                <DialogTitle sx={{ pb: 1 }}>{confirmDialog.title}</DialogTitle>
                <DialogContent><Typography>{confirmDialog.message}</Typography></DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button onClick={handleConfirm} color="error" variant="contained">Confirm</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}