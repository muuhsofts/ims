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

// =========================================================================
// TABLE HEADERS
// =========================================================================

const headCells = [
    { id: 'customer_name', label: 'Name' },
    { id: 'msisdn', label: 'Phone' },
    { id: 'email', label: 'Email' },
    { id: 'nida', label: 'NIDA' },
    { id: 'status', label: 'Status' },
    { id: 'created_at', label: 'Created' },
    { id: 'actions', label: 'Action', disableSort: true }, // ✅ Added "Action" label
];

// =========================================================================
// MAIN COMPONENT
// =========================================================================

export default function CustomersList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

    const { data, total, loading, fetchData } = useCustomers();
    const { hasPermission } = usePermission();

    // =====================================================================
    // STATE
    // =====================================================================

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

    // =====================================================================
    // PERMISSIONS
    // =====================================================================

    const canView = hasPermission('customers.view');
    const canCreate = hasPermission('customers.create');
    const canEdit = hasPermission('customers.edit');

    // =====================================================================
    // EFFECTS
    // =====================================================================

    // Fetch customers on filter/page change
    useEffect(() => {
        fetchData({
            page: page + 1,
            per_page: rowsPerPage,
            search,
            status: statusFilter
        });
    }, [page, rowsPerPage, search, statusFilter, fetchData]);

    // =====================================================================
    // HANDLERS
    // =====================================================================

    const handleSort = (prop) => {
        const isAsc = orderBy === prop && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(prop);
    };

    const openMenu = (e, cust) => {
        setSelectedCustomer(cust);
        setAnchorEl(e.currentTarget);
    };

    const closeMenu = () => {
        setAnchorEl(null);
        setSelectedCustomer(null);
    };

    const handleEdit = () => {
        if (selectedCustomer) {
            setEditingCustomer(selectedCustomer);
            setOpenModal(true);
            closeMenu();
        }
    };

    const handleModalClose = (refresh) => {
        setOpenModal(false);
        setEditingCustomer(null);
        if (refresh) fetchData();
    };

    // =====================================================================
    // PERMISSION GUARD
    // =====================================================================

    if (!canView) {
        return (
            <Box sx={{ p: 2 }}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="error">
                        You do not have permission to view customers.
                    </Typography>
                </Paper>
            </Box>
        );
    }

    // =====================================================================
    // DATA PROCESSING
    // =====================================================================

    const customers = Array.isArray(data) ? data : [];
    const sortedData = [...customers].sort((a, b) => {
        const aVal = a[orderBy] || '';
        const bVal = b[orderBy] || '';
        return order === 'asc'
            ? (aVal > bVal ? 1 : -1)
            : (aVal < bVal ? 1 : -1);
    });

    // =====================================================================
    // MOBILE CARD COMPONENT
    // =====================================================================

    const CustomerCard = ({ customer }) => {
        const getStatusColor = (status) => {
            switch (status) {
                case 'active': return 'success';
                case 'inactive': return 'default';
                default: return 'default';
            }
        };

        return (
            <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                            <PersonIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
                            {customer.customer_name}
                        </Typography>
                        <Chip
                            label={customer.status}
                            color={getStatusColor(customer.status)}
                            size="small"
                        />
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
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={() => {
                                    setEditingCustomer(customer);
                                    setOpenModal(true);
                                }}
                            >
                                Edit
                            </Button>
                        </Box>
                    )}
                </CardContent>
            </Card>
        );
    };

    // =====================================================================
    // RENDER
    // =====================================================================

    return (
        <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 }, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden', boxShadow: 1 }}>

                {/* ─── HEADER & FILTERS ─── */}
                <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={2}>
                        <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                            Customers
                        </Typography>
                        {canCreate && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => {
                                    setEditingCustomer(null);
                                    setOpenModal(true);
                                }}
                                size={isMobile ? "small" : "medium"}
                                sx={{ borderRadius: 2 }}
                            >
                                Add Customer
                            </Button>
                        )}
                    </Box>

                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                        <TextField
                            size="small"
                            label="Search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                )
                            }}
                            sx={{ minWidth: { xs: '100%', sm: 250 }, flexGrow: { xs: 1, sm: 0 } }}
                        />
                        <TextField
                            select
                            size="small"
                            label="Status"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            sx={{ minWidth: { xs: '100%', sm: 150 } }}
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                        </TextField>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={() => fetchData()}
                            size={isMobile ? "small" : "medium"}
                        >
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {/* ─── TABLE VIEW ─── */}
                {showTableView ? (
                    <TableContainer>
                        <Table sx={{ minWidth: 750 }}>
                            <TableHead>
                                <TableRow>
                                    {headCells.map((cell) => (
                                        <TableCell key={cell.id} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                            {!cell.disableSort ? (
                                                <TableSortLabel
                                                    active={orderBy === cell.id}
                                                    direction={order}
                                                    onClick={() => handleSort(cell.id)}
                                                >
                                                    {cell.label}
                                                </TableSortLabel>
                                            ) : cell.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={headCells.length} align="center">
                                            <CircularProgress size={32} sx={{ my: 3 }} />
                                        </TableCell>
                                    </TableRow>
                                ) : sortedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={headCells.length} align="center">
                                            <Typography sx={{ py: 3 }} color="text.secondary">
                                                No customers found
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedData.map((customer) => (
                                        <TableRow key={customer.id} hover>
                                            <TableCell>{customer.customer_name}</TableCell>
                                            <TableCell>{customer.msisdn || '-'}</TableCell>
                                            <TableCell>{customer.email || '-'}</TableCell>
                                            <TableCell>{customer.nida || '-'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={customer.status}
                                                    color={customer.status === 'active' ? 'success' : 'default'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {new Date(customer.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                {canEdit && (
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => openMenu(e, customer)}
                                                    >
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
                    /* ─── CARD VIEW (Mobile/Tablet) ─── */
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}>
                                <CircularProgress />
                            </Box>
                        ) : sortedData.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>
                                <Typography color="text.secondary">No customers found</Typography>
                            </Paper>
                        ) : (
                            sortedData.map((customer) => (
                                <CustomerCard key={customer.id} customer={customer} />
                            ))
                        )}
                    </Box>
                )}

                {/* ─── PAGINATION ─── */}
                <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={total}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        sx={{
                            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            },
                            '.MuiTablePagination-actions': {
                                ml: { xs: 0, sm: 1 }
                            }
                        }}
                    />
                </Box>
            </Paper>

            {/* ─── ACTION MENU ─── */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={closeMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                {canEdit && (
                    <MenuItem onClick={handleEdit}>
                        <EditIcon sx={{ mr: 1, fontSize: 20 }} /> Edit
                    </MenuItem>
                )}
            </Menu>

            {/* ─── CUSTOMER FORM MODAL ─── */}
            <CustomerFormModal
                open={openModal}
                onClose={handleModalClose}
                customer={editingCustomer}
            />
        </Box>
    );
}