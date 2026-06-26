// src/pages/customers/CustomersList.js
import React, { useState, useEffect } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TableSortLabel, TextField, Typography,
    useMediaQuery, useTheme, Card, CardContent, Divider, CircularProgress
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Refresh as RefreshIcon, Search as SearchIcon,
    Person as PersonIcon, Phone as PhoneIcon, Email as EmailIcon, Badge as NidaIcon
} from '@mui/icons-material';
import { useCustomers } from 'hooks/useCustomers';
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

    const { data, total, loading, fetchData } = useCustomers();
    const { hasPermission } = usePermission();

    const [openModal, setOpenModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('created_at');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const canView = hasPermission('customers.view');
    const canCreate = hasPermission('customers.create');
    const canEdit = hasPermission('customers.edit');

    // Fetch customers on filter/page change
    useEffect(() => {
        fetchData({ page: page + 1, per_page: rowsPerPage, search, status: statusFilter });
    }, [page, rowsPerPage, search, statusFilter, fetchData]);

    const handleSort = (prop) => {
        const isAsc = orderBy === prop && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(prop);
    };

    const openMenu = (e, cust) => { setSelectedCustomer(cust); setAnchorEl(e.currentTarget); };
    const closeMenu = () => { setAnchorEl(null); setSelectedCustomer(null); };

    const handleEdit = () => {
        if (selectedCustomer) {
            setEditingCustomer(selectedCustomer);
            setOpenModal(true);
            closeMenu();
        }
    };

    if (!canView) {
        return <Typography sx={{ p: 2 }}>You do not have permission to view customers.</Typography>;
    }

    const customers = Array.isArray(data) ? data : [];
    const sortedData = [...customers].sort((a, b) => {
        const aVal = a[orderBy] || '', bVal = b[orderBy] || '';
        return order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    // Mobile/tablet card view
    const CustomerCard = ({ customer }) => (
        <Card sx={{ mb: 2, borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="subtitle1" fontWeight="bold">
                        <PersonIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
                        {customer.customer_name}
                    </Typography>
                    <Chip label={customer.status} color={customer.status === 'active' ? 'success' : 'default'} size="small" />
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <PhoneIcon fontSize="small" color="action" />
                    <Typography variant="body2">{customer.msisdn || '—'}</Typography>
                </Box>
                {customer.email && (
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <EmailIcon fontSize="small" color="action" />
                        <Typography variant="body2">{customer.email}</Typography>
                    </Box>
                )}
                {customer.nida && (
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <NidaIcon fontSize="small" color="action" />
                        <Typography variant="body2">{customer.nida}</Typography>
                    </Box>
                )}
                <Typography variant="caption" color="text.secondary">
                    Created: {new Date(customer.created_at).toLocaleDateString()}
                </Typography>
                <Divider sx={{ my: 1 }} />
                {canEdit && (
                    <Box display="flex" justifyContent="flex-end">
                        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => {
                            setEditingCustomer(customer);
                            setOpenModal(true);
                        }}>
                            Edit
                        </Button>
                    </Box>
                )}
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                {/* Header & Filters */}
                <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={2}>
                        <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>Customers</Typography>
                        {canCreate && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingCustomer(null); setOpenModal(true); }}>
                                Add Customer
                            </Button>
                        )}
                    </Box>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                        <TextField
                            size="small"
                            label="Search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            sx={{ minWidth: { xs: '100%', sm: 250 } }}
                        />
                        <TextField
                            select
                            size="small"
                            label="Status"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            sx={{ minWidth: { xs: '100%', sm: 150 } }}
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                        </TextField>
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => fetchData()}>
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {/* Table or Card List */}
                {showTableView ? (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    {headCells.map(cell => (
                                        <TableCell key={cell.id}>
                                            {!cell.disableSort ? (
                                                <TableSortLabel active={orderBy === cell.id} direction={order} onClick={() => handleSort(cell.id)}>
                                                    {cell.label}
                                                </TableSortLabel>
                                            ) : cell.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={30} /></TableCell></TableRow>
                                ) : sortedData.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} align="center">No customers found</TableCell></TableRow>
                                ) : (
                                    sortedData.map(c => (
                                        <TableRow key={c.id} hover>
                                            <TableCell>{c.customer_name}</TableCell>
                                            <TableCell>{c.msisdn || '-'}</TableCell>
                                            <TableCell>{c.email || '-'}</TableCell>
                                            <TableCell>{c.nida || '-'}</TableCell>
                                            <TableCell>
                                                <Chip label={c.status} color={c.status === 'active' ? 'success' : 'default'} size="small" />
                                            </TableCell>
                                            <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                {canEdit && (
                                                    <IconButton size="small" onClick={e => openMenu(e, c)}>
                                                        <MoreVertIcon />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Box sx={{ p: 2 }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                        ) : sortedData.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}><Typography>No customers found</Typography></Paper>
                        ) : (
                            sortedData.map(c => <CustomerCard key={c.id} customer={c} />)
                        )}
                    </Box>
                )}

                {/* Pagination */}
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={total}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    sx={{
                        '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }
                    }}
                />
            </Paper>

            {/* Action Menu (Edit only) */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
                {canEdit && <MenuItem onClick={handleEdit}><EditIcon sx={{ mr: 1 }} /> Edit</MenuItem>}
            </Menu>

            <CustomerFormModal
                open={openModal}
                onClose={(refresh) => { setOpenModal(false); setEditingCustomer(null); if (refresh) fetchData(); }}
                customer={editingCustomer}
            />
        </Box>
    );
}