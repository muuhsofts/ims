// src/pages/cc-inventory/CcInventoryList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TablePagination, TableRow,
    TextField, Typography, CircularProgress, LinearProgress, Card, CardContent,
    Divider, useMediaQuery, useTheme, Tooltip, FormControl, InputLabel, Select,
    Badge, Stack, Collapse
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Refresh as RefreshIcon, Search as SearchIcon, Visibility as ViewIcon,
    Receipt as ReceiptIcon, Store as StoreIcon, Inventory as InventoryIcon,
    AttachMoney as CashIcon, Pending as PendingIcon, CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon, Delete as DeleteIcon, Schedule as ScheduleIcon,
    Warehouse as WarehouseIcon, Business as BusinessIcon,
    ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { useCcInventory } from '@/hooks/useCcInventory';
import CcInventoryModal from './CcInventoryModal';

const headCells = [
    { id: 'cc', label: 'Collection Center' },
    { id: 'transfer_date', label: 'Transfer Date' },
    { id: 'products', label: 'Products' },
    { id: 'quantity', label: 'Qty' },
    { id: 'status', label: 'Status' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

// Format price helper
const formatPrice = (price) => {
    if (!price && price !== 0) return null;
    return `TSh ${parseFloat(price).toLocaleString()}`;
};

// Helper for product label
const getProductLabel = (product) => {
    const categoryName = product.category_name || product.category?.category_name || 'N/A';
    const model = product.category?.model || 'N/A';
    const sku = product.sku || 'N/A';
    const imei = product.imei || 'N/A';
    return `${categoryName} | ${model} | SKU: ${sku} | IMEI: ${imei}`;
};

// ✅ Get loan prices from product (already has company_name from API)
const getLoanPrices = (product) => {
    if (!product.loan_prices) return [];
    return Array.isArray(product.loan_prices) ? product.loan_prices : [];
};

export default function CcInventoryList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

    const { user, hasPermission } = usePermission();
    const canView = hasPermission('cc_inventory.view') || hasPermission('cc_inventory.view_own');
    const canCreate = hasPermission('cc_inventory.create');
    const canEdit = hasPermission('cc_inventory.edit');
    const canConfirmReceipt = hasPermission('collection_center.confirm_receipt');

    const { data, total, loading, fetchData, confirmReceiptById, deleteInventory } = useCcInventory();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [statusFilter, setStatusFilter] = useState('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingInventory, setEditingInventory] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [selectedInventory, setSelectedInventory] = useState(null);
    const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [inventoryToConfirm, setInventoryToConfirm] = useState(null);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [inventoryToReject, setInventoryToReject] = useState(null);
    const [progressOpen, setProgressOpen] = useState(false);
    const [progressValue, setProgressValue] = useState(0);

    const fetchInventories = useCallback(() => {
        if (!canView) return;
        const params = {
            page: page + 1,
            per_page: rowsPerPage,
            search: search || undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
        };
        fetchData(params);
    }, [page, rowsPerPage, search, statusFilter, canView, fetchData]);

    useEffect(() => {
        fetchInventories();
    }, [fetchInventories]);

    const handleMenuOpen = (event, inv) => {
        setSelectedInventory(inv);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => {
        setActionMenu(null);
        setSelectedInventory(null);
    };

    const handleViewProducts = (products) => {
        setSelectedProducts(products);
        setItemsDialogOpen(true);
        handleMenuClose();
    };

    const handleEdit = () => {
        setEditingInventory(selectedInventory);
        setModalOpen(true);
        handleMenuClose();
    };

    const handleConfirmReceiptClick = (inventory) => {
        setInventoryToConfirm(inventory);
        setConfirmDialogOpen(true);
        handleMenuClose();
    };

    const handleRejectClick = (inventory) => {
        setInventoryToReject(inventory);
        setRejectDialogOpen(true);
        handleMenuClose();
    };

    const handleConfirmReceipt = async () => {
        if (!inventoryToConfirm) return;
        setConfirmDialogOpen(false);
        setProgressOpen(true);
        setProgressValue(0);

        let interval = setInterval(() => {
            setProgressValue(prev => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                return prev + 10;
            });
        }, 100);

        try {
            await confirmReceiptById(inventoryToConfirm.cc_inventory_id);
            clearInterval(interval);
            setProgressValue(100);
            setTimeout(() => {
                setProgressOpen(false);
                showSnackbar({ type: 'success', message: 'Transfer confirmed successfully.' });
                fetchInventories();
                setInventoryToConfirm(null);
            }, 500);
        } catch (err) {
            clearInterval(interval);
            setProgressOpen(false);
            showSnackbar({ type: 'error', message: err.message || 'Failed to confirm transfer' });
            setInventoryToConfirm(null);
        }
    };

    const handleRejectTransfer = async () => {
        if (!inventoryToReject) return;
        setRejectDialogOpen(false);
        setProgressOpen(true);
        setProgressValue(0);

        let interval = setInterval(() => {
            setProgressValue(prev => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                return prev + 10;
            });
        }, 100);

        try {
            await deleteInventory(inventoryToReject.cc_inventory_id);
            clearInterval(interval);
            setProgressValue(100);
            setTimeout(() => {
                setProgressOpen(false);
                showSnackbar({ type: 'success', message: 'Transfer rejected. Products returned to warehouse.' });
                fetchInventories();
                setInventoryToReject(null);
            }, 500);
        } catch (err) {
            clearInterval(interval);
            setProgressOpen(false);
            showSnackbar({ type: 'error', message: err.message || 'Failed to reject transfer' });
            setInventoryToReject(null);
        }
    };

    const handleModalClose = (refresh) => {
        setModalOpen(false);
        setEditingInventory(null);
        if (refresh) fetchInventories();
    };

    if (!canView) {
        return <Typography sx={{ p: 2 }}>You do not have permission to view collection center inventories.</Typography>;
    }

    const rawInventories = Array.isArray(data) ? data : [];
    const inventories = rawInventories.filter(inv => (inv.quantity ?? 0) > 0);

    const isOwnedByUser = (inventory) => inventory?.collection_center?.owner_id === user?.id;

    const getStatusChip = (status) => {
        if (!status || status === 'pending') {
            return <Chip label="Pending" size="small" color="warning" icon={<PendingIcon />} />;
        }
        if (status === 'arrived') {
            return <Chip label="Arrived" size="small" color="success" icon={<CheckCircleIcon />} />;
        }
        if (status === 'rejected') {
            return <Chip label="Rejected" size="small" color="error" icon={<CancelIcon />} />;
        }
        return <Chip label={status} size="small" />;
    };

    // ✅ Product Chip with Loan Prices - using loan_prices from API
    const ProductChip = ({ product }) => {
        const loanPrices = getLoanPrices(product);
        const hasLoanPrices = loanPrices.length > 0;

        const tooltipContent = (
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
        );

        return (
            <Tooltip title={tooltipContent} arrow>
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

    // Card component for mobile
    const InventoryCard = ({ inventory, canEdit, canConfirmReceipt, isOwnedByUser, onEdit, onConfirmReceipt, onViewProducts, onDelete }) => {
        const getStatusChip = (status) => {
            if (!status || status === 'pending') {
                return <Chip label="Pending" size="small" color="warning" icon={<PendingIcon />} />;
            }
            if (status === 'arrived') {
                return <Chip label="Arrived" size="small" color="success" icon={<CheckCircleIcon />} />;
            }
            if (status === 'rejected') {
                return <Chip label="Rejected" size="small" color="error" icon={<CancelIcon />} />;
            }
            return <Chip label={status} size="small" />;
        };

        const canConfirm = canConfirmReceipt && inventory.cc_inventory_status === 'pending' && isOwnedByUser;
        const isPending = inventory.cc_inventory_status === 'pending';
        const isArrived = inventory.cc_inventory_status === 'arrived';
        const isRejected = inventory.cc_inventory_status === 'rejected';

        return (
            <Card sx={{
                mb: 2,
                borderRadius: 2,
                overflow: 'hidden',
                textAlign: 'center',
                borderLeft: isArrived ? '4px solid #4caf50' : isPending ? '4px solid #ff9800' : isRejected ? '4px solid #f44336' : 'none',
                opacity: isRejected ? 0.7 : 1,
            }}>
                <CardContent sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <StoreIcon fontSize="small" color="primary" />
                            <Typography variant="subtitle1" fontWeight="bold">
                                {inventory.collection_center?.cc_name || '—'}
                            </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                #{inventory.cc_inventory_id?.slice(0, 8)}
                            </Typography>
                            {getStatusChip(inventory.cc_inventory_status)}
                        </Box>
                    </Box>
                    <Divider sx={{ my: 1 }} />

                    <Box display="flex" justifyContent="center" alignItems="center" gap={1} mb={1}>
                        <WarehouseIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                            <strong>Source:</strong> {inventory.source_warehouse_id || 'Multiple Warehouses'}
                        </Typography>
                    </Box>

                    <Box display="flex" justifyContent="center" alignItems="center" gap={1} mb={1}>
                        <ScheduleIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                            <strong>Transfer Date:</strong> {new Date(inventory.created_at).toLocaleString()}
                        </Typography>
                    </Box>

                    <Box display="flex" justifyContent="center" alignItems="center" gap={1} mb={1}>
                        <InventoryIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                            <strong>Quantity:</strong> {inventory.quantity ?? 0}
                        </Typography>
                    </Box>

                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                        Products ({inventory.products?.length || 0}):
                    </Typography>
                    <Box sx={{ maxHeight: 150, overflowY: 'auto', bgcolor: 'action.hover', borderRadius: 1, p: 1, mb: 1 }}>
                        {inventory.products && inventory.products.length > 0 ? (
                            inventory.products.map((p) => {
                                const loanPrices = getLoanPrices(p);
                                return (
                                    <Box key={p.product_id} sx={{ py: 0.25, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                        <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                                            {getProductLabel(p)}
                                        </Typography>
                                        {(p.cash_selling_price || loanPrices.length > 0) && (
                                            <Box display="flex" gap={2} sx={{ ml: 1, mt: 0.25, flexWrap: 'wrap' }}>
                                                {p.cash_selling_price && (
                                                    <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <CashIcon fontSize="inherit" sx={{ fontSize: '0.7rem' }} />
                                                        Cash: {formatPrice(p.cash_selling_price)}
                                                    </Typography>
                                                )}
                                                {loanPrices.map((lp, idx) => (
                                                    <Typography key={idx} variant="caption" color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <BusinessIcon fontSize="inherit" sx={{ fontSize: '0.7rem' }} />
                                                        {lp.company_name}: {formatPrice(lp.price)}
                                                    </Typography>
                                                ))}
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })
                        ) : (
                            <Typography variant="caption" color="text.secondary">No products</Typography>
                        )}
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    <Box display="flex" flexDirection="column" gap={1}>
                        {inventory.products && inventory.products.length > 0 && (
                            <Button fullWidth variant="outlined" startIcon={<ViewIcon />} onClick={() => onViewProducts(inventory.products)}>
                                View All Products
                            </Button>
                        )}
                        {canConfirm && (
                            <Button fullWidth variant="contained" color="success" startIcon={<ReceiptIcon />} onClick={() => onConfirmReceipt(inventory)}>
                                Confirm Receipt
                            </Button>
                        )}
                        {isPending && canEdit && (
                            <Button fullWidth variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(inventory)}>
                                Edit Transfer
                            </Button>
                        )}
                        {isPending && canEdit && (
                            <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(inventory)}>
                                Reject Transfer
                            </Button>
                        )}
                        {isArrived && (
                            <Button fullWidth variant="outlined" color="info" startIcon={<CheckCircleIcon />} disabled>
                                Confirmed
                            </Button>
                        )}
                        {isRejected && (
                            <Button fullWidth variant="outlined" color="error" startIcon={<CancelIcon />} disabled>
                                Rejected
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
                            Collection Center Transfers
                        </Typography>
                        {canCreate && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)} fullWidth={isMobile}>
                                New Transfer
                            </Button>
                        )}
                    </Box>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                        <TextField
                            label="Search by center"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                            }}
                            sx={{ flex: 1, minWidth: { xs: '100%', sm: 200 } }}
                        />
                        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Status"
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <MenuItem value="all">All</MenuItem>
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="arrived">Arrived</MenuItem>
                                <MenuItem value="rejected">Rejected</MenuItem>
                            </Select>
                        </FormControl>
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchInventories} fullWidth={isMobile}>
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {showTableView ? (
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table sx={{ minWidth: 900 }}>
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
                                    <TableRow><TableCell colSpan={headCells.length} align="center">No transfers found</TableCell></TableRow>
                                ) : (
                                    inventories.map((inv) => (
                                        <TableRow key={inv.cc_inventory_id} hover>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <StoreIcon fontSize="small" color="primary" />
                                                    {inv.collection_center?.cc_name || '-'}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {new Date(inv.created_at).toLocaleDateString()}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(inv.created_at).toLocaleTimeString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                                    {inv.products && inv.products.length > 0 ? (
                                                        <>
                                                            {inv.products.slice(0, 3).map((p) => (
                                                                <ProductChip key={p.product_id} product={p} />
                                                            ))}
                                                            {inv.products.length > 3 && (
                                                                <Chip
                                                                    label={`+${inv.products.length - 3} more`}
                                                                    size="small"
                                                                    color="primary"
                                                                    variant="outlined"
                                                                />
                                                            )}
                                                            <IconButton size="small" onClick={() => handleViewProducts(inv.products)}>
                                                                <ViewIcon fontSize="small" />
                                                            </IconButton>
                                                        </>
                                                    ) : (
                                                        <Typography variant="caption" color="text.secondary">No products</Typography>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Badge badgeContent={inv.quantity} color={inv.quantity > 0 ? 'primary' : 'default'} showZero>
                                                    <InventoryIcon color="action" />
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{getStatusChip(inv.cc_inventory_status)}</TableCell>
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
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                        ) : inventories.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>No transfers found</Paper>
                        ) : (
                            inventories.map((inv) => (
                                <InventoryCard
                                    key={inv.cc_inventory_id}
                                    inventory={inv}
                                    canEdit={canEdit}
                                    canConfirmReceipt={canConfirmReceipt}
                                    isOwnedByUser={isOwnedByUser(inv)}
                                    onEdit={() => {
                                        setEditingInventory(inv);
                                        setModalOpen(true);
                                    }}
                                    onConfirmReceipt={handleConfirmReceiptClick}
                                    onViewProducts={handleViewProducts}
                                    onDelete={handleRejectClick}
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
                {selectedInventory?.cc_inventory_status === 'pending' && canConfirmReceipt && isOwnedByUser(selectedInventory) && (
                    <MenuItem onClick={() => handleConfirmReceiptClick(selectedInventory)}>
                        <ReceiptIcon sx={{ mr: 1, color: 'success.main' }} /> Confirm Receipt
                    </MenuItem>
                )}
                {selectedInventory?.cc_inventory_status === 'pending' && canEdit && (
                    <MenuItem onClick={handleEdit}>
                        <EditIcon sx={{ mr: 1 }} /> Edit Transfer
                    </MenuItem>
                )}
                {selectedInventory?.cc_inventory_status === 'pending' && canEdit && (
                    <MenuItem onClick={() => handleRejectClick(selectedInventory)}>
                        <DeleteIcon sx={{ mr: 1, color: 'error.main' }} /> Reject Transfer
                    </MenuItem>
                )}
            </Menu>

            <CcInventoryModal open={modalOpen} onClose={handleModalClose} inventory={editingInventory} />

            {/* Confirm Receipt Dialog */}
            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ pb: 1 }}>Confirm Transfer Receipt</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to confirm receipt for transfer from <strong>{inventoryToConfirm?.collection_center?.cc_name}</strong>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        This will mark <strong>{inventoryToConfirm?.quantity || 0}</strong> product(s) as received.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirmReceipt} variant="contained" color="success">
                        <ReceiptIcon sx={{ mr: 1 }} /> Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reject Transfer Dialog */}
            <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ pb: 1 }}>Reject Transfer</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to reject this transfer?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        <strong>{inventoryToReject?.quantity || 0}</strong> product(s) will be returned to the warehouse.
                    </Typography>
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleRejectTransfer} variant="contained" color="error">
                        <DeleteIcon sx={{ mr: 1 }} /> Reject Transfer
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Progress Dialog */}
            <Dialog open={progressOpen} disableEscapeKeyDown fullWidth maxWidth="xs">
                <DialogTitle>Processing...</DialogTitle>
                <DialogContent>
                    <Box sx={{ width: '100%', mt: 2 }}>
                        <LinearProgress variant="determinate" value={progressValue} />
                        <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>{progressValue}%</Typography>
                    </Box>
                </DialogContent>
            </Dialog>

            {/* Products Detail Dialog */}
            <Dialog open={itemsDialogOpen} onClose={() => setItemsDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Products in this Transfer</DialogTitle>
                <DialogContent dividers>
                    {selectedProducts.length === 0 ? (
                        <Typography>No products assigned.</Typography>
                    ) : (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Category / Model</strong></TableCell>
                                    <TableCell><strong>SKU</strong></TableCell>
                                    <TableCell><strong>IMEI</strong></TableCell>
                                    <TableCell><strong>Cash Price</strong></TableCell>
                                    <TableCell><strong>Loan Prices</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedProducts.map((p) => {
                                    const loanPrices = getLoanPrices(p);
                                    return (
                                        <TableRow key={p.product_id}>
                                            <TableCell>
                                                {p.category_name || p.category?.category_name || 'N/A'}<br />
                                                <Typography variant="caption" color="textSecondary">
                                                    {p.category?.model || 'N/A'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{p.sku || 'N/A'}</TableCell>
                                            <TableCell><code style={{ fontSize: '0.75rem' }}>{p.imei}</code></TableCell>
                                            <TableCell>
                                                {p.cash_selling_price ? (
                                                    <Typography color="success.main" variant="body2">
                                                        {formatPrice(p.cash_selling_price)}
                                                    </Typography>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {loanPrices.length > 0 ? (
                                                    <Box>
                                                        {loanPrices.map((lp, idx) => (
                                                            <Typography key={idx} variant="caption" display="block" sx={{ fontSize: '0.7rem' }}>
                                                                {lp.company_name}: {formatPrice(lp.price)}
                                                            </Typography>
                                                        ))}
                                                    </Box>
                                                ) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setItemsDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}