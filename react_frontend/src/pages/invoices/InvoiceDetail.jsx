// src/pages/invoices/InvoiceDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInvoices } from 'context/InvoiceContext';
import {
    Card, CardContent, Typography, Button, Box, Chip, Divider,
    CircularProgress, Paper, useMediaQuery, useTheme, Stack
} from '@mui/material';
import { Download, ArrowBack, Receipt, Person, Phone, AttachMoney, Payment, DateRange, Info } from '@mui/icons-material';
import { toast } from 'react-toastify';

export default function InvoiceDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { data: invoicesData, fetchOne, downloadInvoice } = useInvoices();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchOne(id);
    }, [id]);

    useEffect(() => {
        if (invoicesData && invoicesData.data && !Array.isArray(invoicesData.data)) {
            setInvoice(invoicesData.data);
            setLoading(false);
        } else if (invoicesData && !invoicesData.data) {
            setLoading(false);
        }
    }, [invoicesData]);

    const handleDownload = async () => {
        if (!invoice) return;
        try {
            await downloadInvoice(id, `invoice_${invoice.receipt_number}.pdf`);
            toast.success('Download started');
        } catch (err) {
            toast.error('Download failed');
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (!invoice) {
        return (
            <Box textAlign="center" mt={4}>
                <Typography variant="h6">Invoice not found</Typography>
                <Button variant="contained" onClick={() => navigate('/app/invoices')} sx={{ mt: 2 }}>
                    Back to Invoices
                </Button>
            </Box>
        );
    }

    // Helper for detail rows
    const DetailRow = ({ icon, label, value }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, flexWrap: 'wrap' }}>
            {icon}
            <Typography variant="body1" sx={{ fontWeight: 500, minWidth: 110 }}>
                {label}:
            </Typography>
            <Typography variant="body1" sx={{ wordBreak: 'break-word', flex: 1 }}>
                {value || '—'}
            </Typography>
        </Box>
    );

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate('/app/invoices')}
                sx={{ mb: 2, borderRadius: 2 }}
                variant="outlined"
                size={isMobile ? "small" : "medium"}
            >
                Back
            </Button>

            <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    {/* Header: title + download button */}
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 2,
                        mb: 2
                    }}>
                        <Typography variant="h5" component="h1" fontWeight="bold">
                            <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Invoice #{invoice.receipt_number}
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<Download />}
                            onClick={handleDownload}
                            size={isMobile ? "small" : "medium"}
                            sx={{ borderRadius: 2, alignSelf: { xs: 'stretch', sm: 'auto' } }}
                        >
                            Download PDF
                        </Button>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Stack spacing={1.5}>
                        <DetailRow
                            icon={<Person color="action" fontSize="small" />}
                            label="Customer"
                            value={invoice.customer_name}
                        />
                        <DetailRow
                            icon={<Phone color="action" fontSize="small" />}
                            label="Phone"
                            value={invoice.customer_phone}
                        />
                        <DetailRow
                            icon={<AttachMoney color="action" fontSize="small" />}
                            label="Total Amount"
                            value={`TSh ${invoice.total_amount?.toLocaleString()}`}
                        />
                        <DetailRow
                            icon={<Payment color="action" fontSize="small" />}
                            label="Payment Method"
                            value={invoice.payment_method}
                        />
                        <DetailRow
                            icon={<Chip size="small" />}
                            label="Status"
                            value={
                                <Chip
                                    label={invoice.payment_status}
                                    color={invoice.payment_status === 'paid' ? 'success' : 'warning'}
                                    size="small"
                                />
                            }
                        />
                        <DetailRow
                            icon={<DateRange color="action" fontSize="small" />}
                            label="Date"
                            value={new Date(invoice.created_at).toLocaleString()}
                        />
                        {invoice.created_by && (
                            <DetailRow
                                icon={<Info color="action" fontSize="small" />}
                                label="Created By"
                                value={invoice.creator?.name || 'Unknown'}
                            />
                        )}
                        {invoice.order_id && (
                            <DetailRow
                                icon={<Receipt color="action" fontSize="small" />}
                                label="Sale ID"
                                value={invoice.order_id}
                            />
                        )}
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}