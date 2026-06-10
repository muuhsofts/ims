import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Box, Typography, CircularProgress
} from '@mui/material';
import { Html5Qrcode } from 'html5-qrcode';
import { showSnackbar } from 'utils/snackbar';

const SCANNER_ID = 'transfer-scan-scanner';

export default function BarcodeScannerDialog({ open, onClose, onScan, title = 'Scan Product IMEI' }) {
    const [scanning, setScanning] = useState(false);
    const [processing, setProcessing] = useState(false);
    const html5QrRef = useRef(null);
    const mountedRef = useRef(true);

    const destroyScanner = useCallback(async () => {
        if (!html5QrRef.current) return;
        try {
            const state = html5QrRef.current.getState();
            if (state === 2 || state === 3) await html5QrRef.current.stop();
            html5QrRef.current.clear();
        } catch (err) {
            console.warn('Scanner destroy error', err);
        }
        html5QrRef.current = null;
        if (mountedRef.current) setScanning(false);
    }, []);

    const startScanner = useCallback(async () => {
        const container = document.getElementById(SCANNER_ID);
        if (!container) {
            showSnackbar({ type: 'error', message: 'Scanner container not ready' });
            return;
        }

        if (html5QrRef.current) await destroyScanner();

        const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
        html5QrRef.current = scanner;

        try {
            await scanner.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 280, height: 180 }, aspectRatio: 1.5 },
                async (decodedText) => {
                    if (processing) return;
                    setProcessing(true);
                    const imei = decodedText.trim();
                    try {
                        await onScan(imei);
                        // After successful scan, restart scanner for next scan
                        await scanner.stop();
                        await startScanner();
                    } catch (err) {
                        // error already handled by onScan
                    } finally {
                        setProcessing(false);
                    }
                },
                (error) => {
                    // silent ignore (no QR found)
                }
            );
            if (mountedRef.current) setScanning(true);
        } catch (err) {
            console.error('Scanner start error', err);
            showSnackbar({ type: 'error', message: 'Could not access camera' });
            if (mountedRef.current) setScanning(false);
        }
    }, [destroyScanner, onScan, processing]);

    const stopScanner = useCallback(async () => {
        await destroyScanner();
        if (mountedRef.current) setScanning(false);
    }, [destroyScanner]);

    // Close dialog handler
    const handleClose = () => {
        stopScanner();
        onClose();
    };

    // Auto-start when dialog opens
    useEffect(() => {
        mountedRef.current = true;
        if (open) {
            setTimeout(() => startScanner(), 100);
        } else {
            stopScanner();
        }
        return () => {
            mountedRef.current = false;
            stopScanner();
        };
    }, [open, startScanner, stopScanner]);

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    {scanning ? (
                        <>
                            <div id={SCANNER_ID} style={{ width: '100%', maxWidth: 380, borderRadius: 8, overflow: 'hidden' }} />
                            <Typography variant="caption" color="text.secondary" align="center">
                                Position the IMEI barcode/QR in front of the camera. It will be scanned automatically.
                            </Typography>
                            {processing && <CircularProgress size={24} />}
                        </>
                    ) : (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <CircularProgress />
                            <Typography sx={{ mt: 2 }}>Initializing camera...</Typography>
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="secondary">Close Scanner</Button>
            </DialogActions>
        </Dialog>
    );
}