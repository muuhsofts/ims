// src/pages/products/ProductList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography, CircularProgress, Switch, FormControlLabel
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Delete as DeleteIcon, Refresh as RefreshIcon, Search as SearchIcon,
    Restore as RestoreIcon, Block as BlockIcon, CheckCircle as CheckCircleIcon,
    DeleteSweep as ForceDeleteIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { useProducts } from '@/hooks/useProducts';
import ProductModal from './ProductModal';

const headCells = [
    { id: 'product_details', label: 'Product Details' },
    { id: 'sku', label: 'SKU' },
    { id: 'imei', label: 'IMEI' },
    { id: 'buying_price', label: 'Buying Price (TSh)' },
    { id: 'selling_price', label: 'Selling Price (TSh)' },
    { id: 'status', label: 'Status' },
    { id: 'stock_status', label: 'Stock Status' },
    { id: 'created_at', label: 'Created At' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

export default function ProductList() {
    const { hasPermission } = usePermission();
    const canView = hasPermission('products.view');
    const canCreate = hasPermission('products.create');
    const canEdit = hasPermission('products.edit');
    const canDelete = hasPermission('products.delete');
    const canRestore = hasPermission('products.restore');
    const canForceDelete = hasPermission('products.force_delete');
    const canChangeStatus = hasPermission('products.change_status');

    const { data, total, loading, fetchData, remove, restore, forceDelete, changeStatus } = useProducts();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [showDeleted, setShowDeleted] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });

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

    const handleDelete = () => {
        setConfirmDialog({
            open: true,
            title: 'Delete Product',
            message: `Are you sure you want to delete product with IMEI "${selectedProduct?.imei}"? (Soft delete)`,
            action: async () => {
                try {
                    await remove(selectedProduct.product_id);
                    showSnackbar({ type: 'success', message: 'Product deleted successfully' });
                    fetchProducts();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Delete failed' });
                }
            }
        });
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

    const handleForceDelete = () => {
        setConfirmDialog({
            open: true,
            title: 'Permanently Delete Product',
            message: `Are you sure you want to permanently delete product with IMEI "${selectedProduct?.imei}"? This cannot be undone.`,
            action: async () => {
                try {
                    await forceDelete(selectedProduct.product_id);
                    showSnackbar({ type: 'success', message: 'Product permanently deleted' });
                    fetchProducts();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Force delete failed' });
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

    if (!canView) {
        return <Typography sx={{ p: 2 }}>You do not have permission to view products.</Typography>;
    }

    const products = Array.isArray(data) ? data : [];

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

    return (
        <Box sx={{ width: '100%', p: 0, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: 1, overflow: 'hidden', boxShadow: 1 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5">Products</Typography>
                        <Box display="flex" alignItems="center" gap={2}>
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
                                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>
                                    New Product
                                </Button>
                            )}
                        </Box>
                    </Box>
                    <Box display="flex" gap={2} flexWrap="wrap">
                        <TextField
                            label="Search by IMEI, SKU or category"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            sx={{ minWidth: 250 }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchProducts}>
                            Refresh
                        </Button>
                    </Box>
                </Box>

                <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table sx={{ minWidth: 1000 }}>
                        <TableHead>
                            <TableRow>
                                {headCells.map((cell) => (
                                    <TableCell key={cell.id}>{cell.label}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={headCells.length} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                            ) : products.length === 0 ? (
                                <TableRow><TableCell colSpan={headCells.length} align="center">No products found</TableCell></TableRow>
                            ) : (
                                products.map((product) => (
                                    <TableRow key={product.product_id} hover>
                                        <TableCell>{getProductDetails(product)}</TableCell>
                                        <TableCell>{product.sku || '-'}</TableCell>
                                        <TableCell><code>{product.imei}</code></TableCell>
                                        <TableCell>TSh {parseFloat(product.buying_price).toLocaleString()}</TableCell>
                                        <TableCell>TSh {parseFloat(product.selling_price).toLocaleString()}</TableCell>
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

                <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
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
                    />
                </Box>
            </Paper>

            <Menu anchorEl={actionMenu} open={Boolean(actionMenu)} onClose={handleMenuClose}>
                {selectedProduct && !selectedProduct.deleted_at && canEdit && (
                    <MenuItem onClick={handleEdit}>
                        <EditIcon sx={{ mr: 1 }} /> Edit
                    </MenuItem>
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
                    <MenuItem onClick={handleRestore}>
                        <RestoreIcon sx={{ mr: 1, color: 'success.main' }} /> Restore
                    </MenuItem>
                )}
                {selectedProduct && selectedProduct.deleted_at && canForceDelete && (
                    <MenuItem onClick={handleForceDelete} sx={{ color: 'error.main' }}>
                        <ForceDeleteIcon sx={{ mr: 1 }} /> Permanently Delete
                    </MenuItem>
                )}
                {selectedProduct && !selectedProduct.deleted_at && canDelete && (
                    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                        <DeleteIcon sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                )}
            </Menu>

            <ProductModal open={modalOpen} onClose={handleModalClose} product={editingProduct} />

            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>
                <DialogTitle>{confirmDialog.title}</DialogTitle>
                <DialogContent>{confirmDialog.message}</DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button onClick={handleConfirm} color="error" variant="contained">Confirm</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}