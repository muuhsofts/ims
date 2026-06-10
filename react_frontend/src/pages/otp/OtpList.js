// src/pages/otp/OtpList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TablePagination, TableRow, TextField,
    Typography, FormControl, InputLabel, Select, MenuItem, Grid, Card,
    CardContent, CircularProgress, Tooltip
} from '@mui/material';
import {
    Refresh as RefreshIcon, Search as SearchIcon, DeleteSweep as CleanupIcon,
    CheckCircle as UsedIcon, Cancel as UnusedIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { otpService } from 'services/otp.service';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';

const headCells = [
    { id: 'email', label: 'Email' },
    { id: 'type', label: 'Type' },
    { id: 'otp', label: 'OTP' },
    { id: 'is_used', label: 'Used' },
    { id: 'expires_at', label: 'Expires At' },
    { id: 'created_at', label: 'Created At' },
    { id: 'ip_address', label: 'IP' },
];

export default function OtpList() {
    const { hasPermission } = usePermission();
    const canView = hasPermission('otp.view');
    const canCleanup = hasPermission('otp.cleanup');

    const [otps, setOtps] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);

    const [email, setEmail] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [usedFilter, setUsedFilter] = useState('all');
    const [expiredFilter, setExpiredFilter] = useState(false);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });

    const fetchOtps = useCallback(async () => {
        if (!canView) return;
        setLoading(true);
        try {
            const params = {
                page: page + 1,
                per_page: rowsPerPage,
                email: email || undefined,
                type: typeFilter !== 'all' ? typeFilter : undefined,
                is_used: usedFilter !== 'all' ? usedFilter === 'true' : undefined,
                expired: expiredFilter ? 'true' : undefined,
                start_date: startDate ? startDate.toISOString().split('T')[0] : undefined,
                end_date: endDate ? endDate.toISOString().split('T')[0] : undefined,
            };
            const response = await otpService.getOtps(params);

            if (response.data?.success) {
                // ✅ Correct extraction for your API structure
                const pagination = response.data.data?.data;   // the inner pagination object
                const recordsArray = pagination?.data ?? [];   // the actual OTP records array
                const totalCount = pagination?.total ?? 0;
                const statsObj = response.data.data?.stats ?? null;

                setOtps(recordsArray);
                setTotal(totalCount);
                setStats(statsObj);
            } else {
                setOtps([]);
                setTotal(0);
                setStats(null);
            }
        } catch (error) {
            console.error(error);
            showSnackbar({ type: 'error', message: 'Failed to load OTP records' });
            setOtps([]);
            setTotal(0);
            setStats(null);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, email, typeFilter, usedFilter, expiredFilter, startDate, endDate, canView]);

    useEffect(() => {
        fetchOtps();
    }, [fetchOtps]);

    const handleCleanupExpired = () => {
        setConfirmDialog({
            open: true,
            title: 'Cleanup Expired OTPs',
            message: 'This will permanently delete all expired and unused OTP records. Are you sure?',
            action: async () => {
                try {
                    const response = await otpService.cleanup();
                    if (response.data?.success) {
                        showSnackbar({ type: 'success', message: response.data.message });
                        fetchOtps();
                    } else {
                        throw new Error(response.data?.message || 'Cleanup failed');
                    }
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message });
                }
            }
        });
    };

    const handleCleanupUsed = () => {
        setConfirmDialog({
            open: true,
            title: 'Cleanup Used OTPs',
            message: 'This will permanently delete used OTP records older than 30 days. Are you sure?',
            action: async () => {
                try {
                    const response = await otpService.cleanupUsed();
                    if (response.data?.success) {
                        showSnackbar({ type: 'success', message: response.data.message });
                        fetchOtps();
                    } else {
                        throw new Error(response.data?.message || 'Cleanup failed');
                    }
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message });
                }
            }
        });
    };

    const handleConfirm = async () => {
        if (!confirmDialog.action) return;
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
            await confirmDialog.action();
        } catch (err) {
            showSnackbar({ type: 'error', message: 'Action failed' });
        }
    };

    if (!canView) {
        return <Typography>You do not have permission to view OTP records.</Typography>;
    }

    const typeOptions = [
        { value: 'all', label: 'All Types' },
        { value: 'registration', label: 'Registration' },
        { value: 'password_reset', label: 'Password Reset' },
        { value: 'email_verification', label: 'Email Verification' },
        { value: 'login', label: 'Login' },
    ];

    const usedOptions = [
        { value: 'all', label: 'All' },
        { value: 'true', label: 'Used' },
        { value: 'false', label: 'Unused' },
    ];

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ width: '100%', p: 0, m: 0 }}>
                <Paper sx={{ width: '100%', borderRadius: 1, overflow: 'hidden', boxShadow: 1 }}>
                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h5" gutterBottom>OTP Management</Typography>

                        {stats && (
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                <Grid item xs={6} md={2.4}>
                                    <Card variant="outlined"><CardContent sx={{ py: 1 }}>
                                        <Typography variant="body2" color="textSecondary">Total OTPs</Typography>
                                        <Typography variant="h5">{stats.total ?? 0}</Typography>
                                    </CardContent></Card>
                                </Grid>
                                <Grid item xs={6} md={2.4}>
                                    <Card variant="outlined"><CardContent sx={{ py: 1 }}>
                                        <Typography variant="body2" color="textSecondary">Used</Typography>
                                        <Typography variant="h5" sx={{ color: 'success.main' }}>{stats.used ?? 0}</Typography>
                                    </CardContent></Card>
                                </Grid>
                                <Grid item xs={6} md={2.4}>
                                    <Card variant="outlined"><CardContent sx={{ py: 1 }}>
                                        <Typography variant="body2" color="textSecondary">Unused</Typography>
                                        <Typography variant="h5" sx={{ color: 'warning.main' }}>{stats.unused ?? 0}</Typography>
                                    </CardContent></Card>
                                </Grid>
                                <Grid item xs={6} md={2.4}>
                                    <Card variant="outlined"><CardContent sx={{ py: 1 }}>
                                        <Typography variant="body2" color="textSecondary">Expired</Typography>
                                        <Typography variant="h5" sx={{ color: 'error.main' }}>{stats.expired ?? 0}</Typography>
                                    </CardContent></Card>
                                </Grid>
                                <Grid item xs={12} md={2.4}>
                                    <Card variant="outlined"><CardContent sx={{ py: 1 }}>
                                        <Typography variant="body2" color="textSecondary">By Type</Typography>
                                        <Typography variant="caption" component="div">
                                            {stats.by_type?.map(t => `${t.type}: ${t.count}`).join(', ') || 'N/A'}
                                        </Typography>
                                    </CardContent></Card>
                                </Grid>
                            </Grid>
                        )}

                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={12} md={2}>
                                <TextField fullWidth size="small" label="Email" value={email}
                                           onChange={(e) => setEmail(e.target.value)}
                                           InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Type</InputLabel>
                                    <Select value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value)}>
                                        {typeOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Used Status</InputLabel>
                                    <Select value={usedFilter} label="Used Status" onChange={(e) => setUsedFilter(e.target.value)}>
                                        {usedOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Expired Only</InputLabel>
                                    <Select value={expiredFilter} label="Expired Only" onChange={(e) => setExpiredFilter(e.target.value === 'true')}>
                                        <MenuItem value="false">All</MenuItem>
                                        <MenuItem value="true">Expired Only</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={1.5}>
                                <DatePicker label="Start Date" value={startDate} onChange={setStartDate}
                                            slotProps={{ textField: { size: 'small', fullWidth: true } }} />
                            </Grid>
                            <Grid item xs={12} md={1.5}>
                                <DatePicker label="End Date" value={endDate} onChange={setEndDate}
                                            slotProps={{ textField: { size: 'small', fullWidth: true } }} />
                            </Grid>
                            <Grid item xs={12} md={1}>
                                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchOtps} fullWidth>Refresh</Button>
                            </Grid>
                        </Grid>

                        {canCleanup && (
                            <Box display="flex" gap={1} justifyContent="flex-end" mb={2}>
                                <Tooltip title="Delete expired & unused OTPs">
                                    <Button variant="contained" color="warning" startIcon={<CleanupIcon />} onClick={handleCleanupExpired}>Cleanup Expired</Button>
                                </Tooltip>
                                <Tooltip title="Delete used OTPs older than 30 days">
                                    <Button variant="contained" color="error" startIcon={<CleanupIcon />} onClick={handleCleanupUsed}>Cleanup Used</Button>
                                </Tooltip>
                            </Box>
                        )}
                    </Box>

                    <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                        <Table sx={{ width: '100%', minWidth: 800 }}>
                            <TableHead>
                                <TableRow>
                                    {headCells.map((cell) => <TableCell key={cell.id}>{cell.label}</TableCell>)}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={headCells.length} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                                ) : otps.length === 0 ? (
                                    <TableRow><TableCell colSpan={headCells.length} align="center">No OTP records found</TableCell></TableRow>
                                ) : (
                                    otps.map((otp) => (
                                        <TableRow key={otp.id} hover>
                                            <TableCell>{otp.email}</TableCell>
                                            <TableCell><Chip label={otp.type} size="small" /></TableCell>
                                            <TableCell><code>{otp.otp}</code></TableCell>
                                            <TableCell>
                                                {otp.is_used ? (
                                                    <Chip icon={<UsedIcon />} label="Used" color="success" size="small" />
                                                ) : (
                                                    <Chip icon={<UnusedIcon />} label="Unused" color="default" size="small" />
                                                )}
                                            </TableCell>
                                            <TableCell>{new Date(otp.expires_at).toLocaleString()}</TableCell>
                                            <TableCell>{new Date(otp.created_at).toLocaleString()}</TableCell>
                                            <TableCell>{otp.ip_address || '-'}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25, 50, 100]}
                            component="div"
                            count={total}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={(e, newPage) => setPage(newPage)}
                            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        />
                    </Box>
                </Paper>

                <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
                    <DialogTitle>{confirmDialog.title}</DialogTitle>
                    <DialogContent>{confirmDialog.message}</DialogContent>
                    <DialogActions>
                        <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                        <Button onClick={handleConfirm} color="error" variant="contained">Confirm</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </LocalizationProvider>
    );
}