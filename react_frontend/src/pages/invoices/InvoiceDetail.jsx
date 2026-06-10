import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInvoices } from 'context/InvoiceContext';
import { Card, CardContent, Typography, Button, Box, Chip, Divider, CircularProgress } from '@mui/material';
import { Download, ArrowBack } from '@mui/icons-material';
import { toast } from 'react-toastify';

export default function InvoiceDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: invoicesData, fetchOne, downloadInvoice } = useInvoices();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchOne(id);
        }
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

    return (
        <Box>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/app/invoices')} sx={{ mb: 2 }}>
                Back
            </Button>
            <Card>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap">
                        <Typography variant="h5">Invoice #{invoice.receipt_number}</Typography>
                        <Button variant="contained" startIcon={<Download />} onClick={handleDownload}>
                            Download PDF
                        </Button>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body1" gutterBottom>
                        <strong>Customer:</strong> {invoice.customer_name}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                        <strong>Phone:</strong> {invoice.customer_phone || 'N/A'}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                        <strong>Total Amount:</strong> ${invoice.total_amount?.toFixed(2)}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                        <strong>Payment Method:</strong> {invoice.payment_method}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                        <strong>Status:</strong> <Chip label={invoice.payment_status} color={invoice.payment_status === 'paid' ? 'success' : 'warning'} size="small" />
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                        <strong>Date:</strong> {new Date(invoice.created_at).toLocaleString()}
                    </Typography>
                    {invoice.created_by && (
                        <Typography variant="body1" gutterBottom>
                            <strong>Created By:</strong> {invoice.creator?.name || 'Unknown'}
                        </Typography>
                    )}
                    {invoice.order_id && (
                        <Typography variant="body1" gutterBottom>
                            <strong>Sale ID:</strong> {invoice.order_id}
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}