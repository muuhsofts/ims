// src/hooks/useInvoice.js
import { useState, useEffect } from 'react';
import { invoiceService } from 'services/invoice.service';
import { showSnackbar } from 'utils/snackbar';

export const useInvoice = (id) => {
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchInvoice = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await invoiceService.getInvoice(id);
            setInvoice(res.data.data);
        } catch (err) {
            showSnackbar({ type: 'error', message: 'Failed to load invoice' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoice();
    }, [id]);

    return { invoice, loading, refetch: fetchInvoice };
};