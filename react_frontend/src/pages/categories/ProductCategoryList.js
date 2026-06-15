// src/pages/categories/ProductCategoryList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography, CircularProgress, Card, CardContent,
    Divider, useMediaQuery, useTheme
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Delete as DeleteIcon, Block as BlockIcon, CheckCircle as CheckCircleIcon,
    Refresh as RefreshIcon, Search as SearchIcon, Category as CategoryIcon,
    ModelTraining as ModelIcon, Sell as SkuIcon, CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import { useProductCategories } from '@/hooks/useProductCategories';
import { productCategoryService } from 'services/product-category.service';
import ProductCategoryModal from './ProductCategoryModal';

const headCells = [
    { id: 'category_name', label: 'Category Name' },
    { id: 'model', label: 'Model' },
    { id: 'skus', label: 'SKUs' },
    { id: 'status', label: 'Status' },
    { id: 'created_at', label: 'Created At' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

export default function ProductCategoryList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

    const { hasPermission } = usePermission();
    const canView = hasPermission('categories.view');
    const canCreate = hasPermission('categories.create');
    const canEdit = hasPermission('categories.edit');
    const canDelete = hasPermission('categories.delete');
    const canToggleStatus = hasPermission('categories.edit');

    const { data, total, loading, fetchData, remove } = useProductCategories();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });

    const fetchCategories = useCallback(() => {
        if (!canView) return;
        const params = {
            page: page + 1,
            per_page: rowsPerPage,
            search: search || undefined,
        };
        fetchData(params);
    }, [page, rowsPerPage, search, canView, fetchData]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleMenuOpen = (event, category) => {
        setSelectedCategory(category);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => {
        setActionMenu(null);
        setSelectedCategory(null);
    };

    const handleEdit = () => {
        setEditingCategory(selectedCategory);
        setModalOpen(true);
        handleMenuClose();
    };

    const handleDelete = () => {
        setConfirmDialog({
            open: true,
            title: 'Delete Category',
            message: `Are you sure you want to delete "${selectedCategory?.category_name}"?`,
            action: async () => {
                try {
                    await remove(selectedCategory.category_id);
                    showSnackbar({ type: 'success', message: 'Category deleted successfully' });
                    fetchCategories();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Delete failed' });
                }
            }
        });
        handleMenuClose();
    };

    const handleToggleStatus = () => {
        if (!selectedCategory) return;
        const newStatus = selectedCategory.status === 'active' ? 'inactive' : 'active';
        setConfirmDialog({
            open: true,
            title: `${newStatus === 'active' ? 'Activate' : 'Deactivate'} Category`,
            message: `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} "${selectedCategory.category_name}"?`,
            action: async () => {
                try {
                    await productCategoryService.toggleCategoryStatus(selectedCategory.category_id);
                    showSnackbar({ type: 'success', message: `Category ${newStatus}d successfully` });
                    fetchCategories();
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message || 'Toggle status failed' });
                }
            }
        });
        handleMenuClose();
    };

    const handleModalClose = (refresh) => {
        setModalOpen(false);
        setEditingCategory(null);
        if (refresh) fetchCategories();
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
        return <Typography sx={{ p: 2 }}>You do not have permission to view product categories.</Typography>;
    }

    const categories = Array.isArray(data) ? data : [];

    // Card component for mobile/tablet view
    const CategoryCard = ({ category, canEdit, canToggleStatus, canDelete, onEdit, onDelete, onToggleStatus }) => {
        return (
            <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <CardContent sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <CategoryIcon fontSize="small" color="primary" />
                            <Typography variant="subtitle1" fontWeight="bold">
                                {category.category_name}
                            </Typography>
                        </Box>
                        <Chip
                            label={category.status}
                            color={category.status === 'active' ? 'success' : 'default'}
                            size="small"
                        />
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    {category.model && (
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <ModelIcon fontSize="small" color="action" />
                            <Typography variant="body2"><strong>Model:</strong> {category.model}</Typography>
                        </Box>
                    )}

                    <Box display="flex" alignItems="flex-start" gap={1} mb={1}>
                        <SkuIcon fontSize="small" color="action" sx={{ mt: 0.2 }} />
                        <Box flex={1}>
                            <Typography variant="body2" fontWeight="bold">SKUs:</Typography>
                            <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                                {category.sku && category.sku.length > 0 ? (
                                    category.sku.map((sku, idx) => (
                                        <Chip key={idx} label={sku} size="small" variant="outlined" />
                                    ))
                                ) : (
                                    <Typography variant="caption">No SKUs</Typography>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                            Created: {new Date(category.created_at).toLocaleString()}
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    <Box display="flex" flexDirection="column" gap={1}>
                        {canEdit && (
                            <Button fullWidth variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(category)}>
                                Edit
                            </Button>
                        )}
                        {canToggleStatus && (
                            <Button
                                fullWidth
                                variant="outlined"
                                color={category.status === 'active' ? 'warning' : 'success'}
                                startIcon={category.status === 'active' ? <BlockIcon /> : <CheckCircleIcon />}
                                onClick={() => onToggleStatus(category)}
                            >
                                {category.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Button>
                        )}
                        {canDelete && (
                            <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(category)}>
                                Delete
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
                            Product Categories
                        </Typography>
                        {canCreate && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingCategory(null); setModalOpen(true); }} fullWidth={isMobile}>
                                New Category
                            </Button>
                        )}
                    </Box>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                        <TextField
                            label="Search by name, model or SKU"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            sx={{ flex: 1, minWidth: { xs: '100%', sm: 250 } }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchCategories} fullWidth={isMobile}>
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {/* Table or Card View */}
                {showTableView ? (
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
                                ) : categories.length === 0 ? (
                                    <TableRow><TableCell colSpan={headCells.length} align="center">No categories found</TableCell></TableRow>
                                ) : (
                                    categories.map((category) => (
                                        <TableRow key={category.category_id} hover>
                                            <TableCell>{category.category_name}</TableCell>
                                            <TableCell>{category.model || '-'}</TableCell>
                                            <TableCell>
                                                {category.sku && category.sku.length > 0 ? (
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                        {category.sku.map((skuItem, idx) => (
                                                            <Chip key={idx} label={skuItem} size="small" variant="outlined" />
                                                        ))}
                                                    </Box>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={category.status}
                                                    color={category.status === 'active' ? 'success' : 'default'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>{new Date(category.created_at).toLocaleString()}</TableCell>
                                            <TableCell>
                                                <IconButton size="small" onClick={(e) => handleMenuOpen(e, category)}>
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
                        ) : categories.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>No categories found</Paper>
                        ) : (
                            categories.map((category) => (
                                <CategoryCard
                                    key={category.category_id}
                                    category={category}
                                    canEdit={canEdit}
                                    canToggleStatus={canToggleStatus}
                                    canDelete={canDelete}
                                    onEdit={(cat) => { setEditingCategory(cat); setModalOpen(true); }}
                                    onDelete={(cat) => { setSelectedCategory(cat); handleDelete(); }}
                                    onToggleStatus={(cat) => { setSelectedCategory(cat); handleToggleStatus(); }}
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
                        sx={{
                            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }
                        }}
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
                {canToggleStatus && selectedCategory && (
                    <MenuItem onClick={handleToggleStatus}>
                        {selectedCategory.status === 'active' ? (
                            <><BlockIcon sx={{ mr: 1, color: 'warning.main' }} /> Deactivate</>
                        ) : (
                            <><CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} /> Activate</>
                        )}
                    </MenuItem>
                )}
                {canDelete && (
                    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                        <DeleteIcon sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                )}
            </Menu>

            <ProductCategoryModal open={modalOpen} onClose={handleModalClose} category={editingCategory} />

            {/* Confirm Dialog */}
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