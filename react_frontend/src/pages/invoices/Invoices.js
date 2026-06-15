// src/pages/invoices/Invoices.js
import React, { useState, useEffect } from 'react';
import { useInvoices } from 'context/InvoiceContext';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Button, IconButton, TextField, MenuItem, Grid,
    CircularProgress, Paper, Chip, Card, CardContent, Divider,
    Pagination, useMediaQuery, useTheme, Stack, InputAdornment
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
    Download, Visibility, Refresh, Search as SearchIcon,
    Receipt, Person, Phone, AttachMoney, Payment, DateRange
} from '@mui/icons-material';
import { toast } from 'react-toastify';

export default function Invoices() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

    const { data, loading, fetchAll, downloadInvoice } = useInvoices();
    const navigate = useNavigate();

    // Local state
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');

    // Fetch invoices when filters/pagination change
    useEffect(() => {
        fetchAll({
            page: page + 1,
            per_page: pageSize,
            payment_status: filterStatus || undefined,
            search: search || undefined,
        });
    }, [page, pageSize, filterStatus, search]);

    const handleDownload = async (id, receiptNumber) => {
        try {
            await downloadInvoice(id, `invoice_${receiptNumber}.pdf`);
            toast.success('Download started');
        } catch (err) {
            toast.error('Download failed');
        }
    };

    const handleRefresh = () => {
        fetchAll({
            page: page + 1,
            per_page: pageSize,
            payment_status: filterStatus || undefined,
            search: search || undefined,
        });
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            setPage(0);
        }
    };

    // Columns for desktop DataGrid
    const columns = [
        { field: 'receipt_number', headerName: 'Invoice #', width: 180 },
        { field: 'customer_name', headerName: 'Customer', width: 200 },
        { field: 'customer_phone', headerName: 'Phone', width: 150 },
        {
            field: 'total_amount',
            headerName: 'Amount',
            width: 120,
            type: 'number',
            renderCell: (params) => `TSh ${params.value?.toLocaleString()}`,
        },
        { field: 'payment_method', headerName: 'Payment', width: 130 },
        {
            field: 'payment_status',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={params.value}
                    color={params.value === 'paid' ? 'success' : 'warning'}
                    size="small"
                />
            ),
        },
        {
            field: 'created_at',
            headerName: 'Date',
            width: 180,
            renderCell: (params) => new Date(params.value).toLocaleDateString(),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            renderCell: (params) => (
                <Box>
                    <IconButton
                        size="small"
                        onClick={() => navigate(`/app/invoices/${params.row.receipt_id}`)}
                    >
                        <Visibility fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => handleDownload(params.row.receipt_id, params.row.receipt_number)}
                    >
                        <Download fontSize="small" />
                    </IconButton>
                </Box>
            ),
        },
    ];

    // Card component for mobile/tablet list
    const InvoiceCard = ({ invoice }) => (
        <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="subtitle1" fontWeight="bold">
                        <Receipt sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                        #{invoice.receipt_number}
                    </Typography>
                    <Chip
                        label={invoice.payment_status}
                        color={invoice.payment_status === 'paid' ? 'success' : 'warning'}
                        size="small"
                    />
                </Box>

                <Divider sx={{ my: 1 }} />

                <Stack spacing={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Person fontSize="small" color="action" />
                        <Typography variant="body2">{invoice.customer_name}</Typography>
                    </Box>
                    {invoice.customer_phone && (
                        <Box display="flex" alignItems="center" gap={1}>
                            <Phone fontSize="small" color="action" />
                            <Typography variant="body2">{invoice.customer_phone}</Typography>
                        </Box>
                    )}
                    <Box display="flex" alignItems="center" gap={1}>
                        <AttachMoney fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight="bold">
                            TSh {invoice.total_amount?.toLocaleString()}
                        </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Payment fontSize="small" color="action" />
                        <Typography variant="body2">{invoice.payment_method}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <DateRange fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                            {new Date(invoice.created_at).toLocaleDateString()}
                        </Typography>
                    </Box>
                </Stack>

                <Divider sx={{ my: 1.5 }} />

                <Box display="flex" justifyContent="flex-end" gap={1}>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => navigate(`/app/invoices/${invoice.receipt_id}`)}
                    >
                        View
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={() => handleDownload(invoice.receipt_id, invoice.receipt_number)}
                    >
                        PDF
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );

    const totalRecords = data?.meta?.total || 0;
    const rows = data?.data || [];

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
                <Typography variant="h4" component="h1" fontWeight="bold" sx={{ fontSize: { xs: '1.75rem', sm: '2rem' } }}>
                    Invoices
                </Typography>
                <Button
                    startIcon={<Refresh />}
                    onClick={handleRefresh}
                    variant="outlined"
                    size={isMobile ? "small" : "medium"}
                    sx={{ borderRadius: 2 }}
                >
                    Refresh
                </Button>
            </Box>

            {/* Filters */}
            <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 2 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={8}>
                        <TextField
                            fullWidth
                            label="Search by customer or invoice #"
                            variant="outlined"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField
                            fullWidth
                            select
                            label="Payment Status"
                            variant="outlined"
                            size="small"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="paid">Paid</MenuItem>
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="failed">Failed</MenuItem>
                        </TextField>
                    </Grid>
                </Grid>
            </Paper>

            {/* Loading State */}
            {loading && (
                <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                </Box>
            )}

            {/* Data Display */}
            {!loading && rows.length === 0 && (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No invoices found.</Typography>
                </Paper>
            )}

            {!loading && rows.length > 0 && (
                <>
                    {/* Desktop: DataGrid */}
                    {showTableView ? (
                        <Paper sx={{ borderRadius: 2, overflow: 'hidden', width: '100%' }}>
                            <DataGrid
                                rows={rows}
                                columns={columns}
                                getRowId={(row) => row.receipt_id}
                                loading={loading}
                                page={page}
                                pageSize={pageSize}
                                onPageChange={(newPage) => setPage(newPage)}
                                onPageSizeChange={(newSize) => setPageSize(newSize)}
                                rowsPerPageOptions={[10, 25, 50]}
                                rowCount={totalRecords}
                                paginationMode="server"
                                autoHeight
                                disableSelectionOnClick
                                sx={{
                                    '& .MuiDataGrid-cell': {
                                        fontSize: { xs: '0.8rem', sm: '0.875rem' }
                                    }
                                }}
                            />
                        </Paper>
                    ) : (
                        // Mobile/Tablet: Card List
                        <>
                            {rows.map((invoice) => (
                                <InvoiceCard key={invoice.receipt_id} invoice={invoice} />
                            ))}
                            {/* Pagination (MUI Pagination for card view) */}
                            <Box display="flex" justifyContent="center" mt={3}>
                                <Pagination
                                    count={Math.ceil(totalRecords / pageSize)}
                                    page={page + 1}
                                    onChange={(e, newPage) => setPage(newPage - 1)}
                                    color="primary"
                                    size={isMobile ? "small" : "medium"}
                                    showFirstButton
                                    showLastButton
                                />
                            </Box>
                        </>
                    )}
                </>
            )}
        </Box>
    );
}