// src/pages/customers/CustomersList.js
import React, { useState, useEffect } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TableSortLabel, TextField, Typography, Switch, FormControlLabel
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Delete as DeleteIcon, Restore as RestoreIcon, DeleteSweep as DeleteSweepIcon,
    Refresh as RefreshIcon, Search as SearchIcon
} from '@mui/icons-material';
import { useCustomers } from 'hooks/useCustomers';
import { customerService } from 'services/customer.service';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';
import CustomerFormModal from './CustomerFormModal';

const headCells = [
    { id: 'customer_name', label: 'Name' },
    { id: 'msisdn', label: 'Phone' },
    { id: 'email', label: 'Email' },
    { id: 'nida', label: 'NIDA' },
    { id: 'status', label: 'Status' },
    { id: 'created_at', label: 'Created' },
    { id: 'actions', label: '', disableSort: true },
];

export default function CustomersList() {
    const { data, total, loading, fetchData, remove, restore } = useCustomers();
    const { hasPermission } = usePermission();

    const [showDeleted, setShowDeleted] = useState(false);
    const [deletedCustomers, setDeletedCustomers] = useState([]);
    const [trashedTotal, setTrashedTotal] = useState(0);
    const [loadingDeleted, setLoadingDeleted] = useState(false);

    const [openModal, setOpenModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [confirm, setConfirm] = useState({ open: false, title: '', message: '', action: null });

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('created_at');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const canView = hasPermission('customers.view');
    const canCreate = hasPermission('customers.create');
    const canEdit = hasPermission('customers.edit');
    const canDelete = hasPermission('customers.delete');
    const canRestore = hasPermission('customers.restore');

    // Fetch active customers
    useEffect(() => {
        if (!showDeleted) {
            fetchData({ page: page + 1, per_page: rowsPerPage, search, status: statusFilter });
        }
    }, [page, rowsPerPage, search, statusFilter, showDeleted, fetchData]);

    // Fetch deleted customers
    useEffect(() => {
        if (showDeleted) fetchDeleted();
    }, [showDeleted, page, rowsPerPage, search]);

    const fetchDeleted = async () => {
        setLoadingDeleted(true);
        try {
            const response = await customerService.getCustomers({ trashed: true, page: page + 1, per_page: rowsPerPage, search });
            const rawData = response.data?.data?.data || [];
            // Map customer_id to id
            const mapped = rawData.map(c => ({ id: c.customer_id, ...c }));
            setDeletedCustomers(mapped);
            setTrashedTotal(response.data?.data?.total || 0);
        } catch (err) {
            showSnackbar({ type: 'error', message: 'Failed to load deleted customers' });
            setDeletedCustomers([]);
            setTrashedTotal(0);
        } finally {
            setLoadingDeleted(false);
        }
    };

    const handleRestore = async (id) => {
        await restore(id);
        showSnackbar({ type: 'success', message: 'Restored' });
        if (showDeleted) fetchDeleted(); else fetchData();
    };

    const handleSoftDelete = async (id) => {
        await remove(id);
        showSnackbar({ type: 'success', message: 'Customer moved to trash' });
        fetchData();
    };

    const handleForceDelete = async (id) => {
        // For permanent delete you'd need a separate endpoint – this just soft deletes again
        showSnackbar({ type: 'error', message: 'Permanent delete not implemented' });
    };

    const handleSort = (prop) => {
        const isAsc = orderBy === prop && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(prop);
    };

    const openMenu = (e, cust) => { setSelectedCustomer(cust); setAnchorEl(e.currentTarget); };
    const closeMenu = () => { setAnchorEl(null); setSelectedCustomer(null); };

    const openConfirm = (title, message, action) => setConfirm({ open: true, title, message, action });

    const handleAction = (type) => {
        if (!selectedCustomer) return;
        closeMenu();
        if (showDeleted) {
            if (type === 'restore') openConfirm('Restore', `Restore ${selectedCustomer.customer_name}?`, () => handleRestore(selectedCustomer.id));
            if (type === 'force_delete') openConfirm('Permanent Delete', `Permanently delete ${selectedCustomer.customer_name}?`, () => handleForceDelete(selectedCustomer.id));
            return;
        }
        if (type === 'edit') { setEditingCustomer(selectedCustomer); setOpenModal(true); }
        if (type === 'delete') openConfirm('Soft Delete', `Move ${selectedCustomer.customer_name} to trash?`, () => handleSoftDelete(selectedCustomer.id));
    };

    const handleConfirm = async () => {
        if (!confirm.action) return;
        setConfirm(prev => ({ ...prev, open: false }));
        try {
            await confirm.action();
            showSnackbar({ type: 'success', message: 'Done' });
        } catch {
            showSnackbar({ type: 'error', message: 'Action failed' });
        }
    };

    if (!canView) return <Typography>No permission</Typography>;

    const currentData = showDeleted ? deletedCustomers : data;
    const isLoading = showDeleted ? loadingDeleted : loading;
    const totalCount = showDeleted ? trashedTotal : total;

    const sortedData = [...currentData].sort((a, b) => {
        const aVal = a[orderBy] || '', bVal = b[orderBy] || '';
        return order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    return (
        <Box sx={{ p: 2 }}>
            <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5">Customers</Typography>
                        <Box display="flex" gap={2} alignItems="center">
                            <FormControlLabel
                                control={<Switch checked={showDeleted} onChange={() => { setShowDeleted(v => !v); setPage(0); }} />}
                                label="Show Deleted"
                            />
                            {canCreate && !showDeleted && (
                                <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingCustomer(null); setOpenModal(true); }}>
                                    Add Customer
                                </Button>
                            )}
                        </Box>
                    </Box>
                    <Box display="flex" gap={2}>
                        <TextField
                            size="small"
                            label="Search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            sx={{ minWidth: 250 }}
                        />
                        {!showDeleted && (
                            <TextField
                                select
                                size="small"
                                label="Status"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                sx={{ minWidth: 150 }}
                            >
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                            </TextField>
                        )}
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => showDeleted ? fetchDeleted() : fetchData()}>
                            Refresh
                        </Button>
                    </Box>
                </Box>

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {headCells.map(cell => (
                                    <TableCell key={cell.id}>
                                        {!cell.disableSort && !showDeleted ? (
                                            <TableSortLabel active={orderBy === cell.id} direction={order} onClick={() => handleSort(cell.id)}>
                                                {cell.label}
                                            </TableSortLabel>
                                        ) : cell.label}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7} align="center">Loading…</TableCell></TableRow>
                            ) : sortedData.length === 0 ? (
                                <TableRow><TableCell colSpan={7} align="center">No customers</TableCell></TableRow>
                            ) : (
                                sortedData.map(c => (
                                    <TableRow key={c.id} hover>
                                        <TableCell>{c.customer_name}</TableCell>
                                        <TableCell>{c.msisdn || '-'}</TableCell>
                                        <TableCell>{c.email || '-'}</TableCell>
                                        <TableCell>{c.nida || '-'}</TableCell>
                                        <TableCell>
                                            {showDeleted ? (
                                                <Chip label="Deleted" color="error" size="small" />
                                            ) : (
                                                <Chip label={c.status} color={c.status === 'active' ? 'success' : 'default'} size="small" />
                                            )}
                                        </TableCell>
                                        <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <IconButton size="small" onClick={e => openMenu(e, c)}><MoreVertIcon /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={totalCount}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                />
            </Paper>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
                {showDeleted ? [
                    canRestore && <MenuItem key="restore" onClick={() => handleAction('restore')}><RestoreIcon sx={{ mr: 1 }} /> Restore</MenuItem>,
                    canDelete && <MenuItem key="force" onClick={() => handleAction('force_delete')} sx={{ color: 'error.main' }}><DeleteSweepIcon sx={{ mr: 1 }} /> Permanent Delete</MenuItem>
                ] : [
                    canEdit && <MenuItem key="edit" onClick={() => handleAction('edit')}><EditIcon sx={{ mr: 1 }} /> Edit</MenuItem>,
                    canDelete && <MenuItem key="delete" onClick={() => handleAction('delete')} sx={{ color: 'error.main' }}><DeleteIcon sx={{ mr: 1 }} /> Delete (Soft)</MenuItem>
                ]}
            </Menu>

            <CustomerFormModal
                open={openModal}
                onClose={(refresh) => { setOpenModal(false); setEditingCustomer(null); if (refresh) fetchData(); }}
                customer={editingCustomer}
            />

            <Dialog open={confirm.open} onClose={() => setConfirm(prev => ({ ...prev, open: false }))}>
                <DialogTitle>{confirm.title}</DialogTitle>
                <DialogContent>{confirm.message}</DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirm(prev => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button onClick={handleConfirm} color="error" variant="contained">Confirm</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}