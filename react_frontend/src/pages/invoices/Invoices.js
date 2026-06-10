import React, { useState, useEffect } from 'react';
import { useInvoices } from 'context/InvoiceContext';
import { DataGrid } from '@mui/x-data-grid';
import { Button, IconButton, Box, Typography, Chip, TextField, MenuItem, Grid } from '@mui/material';
import { Download, Visibility, Refresh } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function Invoices() {
    const { data, loading, fetchAll, downloadInvoice } = useInvoices();
    const navigate = useNavigate();

    // Local state for pagination & filters
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');

    // Fetch invoices when pagination/filters change
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

    const columns = [
        { field: 'receipt_number', headerName: 'Invoice #', width: 180 },
        { field: 'customer_name', headerName: 'Customer', width: 200 },
        { field: 'customer_phone', headerName: 'Phone', width: 150 },
        {
            field: 'total_amount',
            headerName: 'Amount',
            width: 120,
            type: 'number',
            renderCell: (params) => `$${params.value?.toFixed(2)}`,
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
                    <IconButton onClick={() => navigate(`/app/invoices/${params.row.receipt_id}`)}>
                        <Visibility />
                    </IconButton>
                    <IconButton
                        onClick={() =>
                            handleDownload(params.row.receipt_id, params.row.receipt_number)
                        }
                    >
                        <Download />
                    </IconButton>
                </Box>
            ),
        },
    ];

    return (
        <Box sx={{ height: 600, width: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h4">Invoices</Typography>
                <Button startIcon={<Refresh />} onClick={handleRefresh} variant="outlined">
                    Refresh
                </Button>
            </Box>

            {/* Filters */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6} md={4}>
                    <TextField
                        fullWidth
                        label="Search by customer or invoice #"
                        variant="outlined"
                        size="small"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
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

            <DataGrid
                rows={data?.data || []}
                columns={columns}
                getRowId={(row) => row.receipt_id}
                loading={loading}
                page={page}
                pageSize={pageSize}
                onPageChange={(newPage) => setPage(newPage)}
                onPageSizeChange={(newSize) => setPageSize(newSize)}
                rowsPerPageOptions={[10, 25, 50]}
                rowCount={data?.meta?.total || 0}
                paginationMode="server"
            />
        </Box>
    );
}