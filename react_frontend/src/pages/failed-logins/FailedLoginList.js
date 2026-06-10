// src/pages/failed-logins/FailedLoginList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TablePagination, TableRow, TextField,
    Typography, FormControl, InputLabel, Select, MenuItem, Grid, Card,
    CardContent, CircularProgress, Tooltip
} from '@mui/material';
import {
    Refresh as RefreshIcon, Search as SearchIcon, DeleteSweep as ClearIcon,
    Block as BlockIcon, LockOpen as UnblockIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { failedLoginService } from 'services/failed-login.service';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';

const headCells = [
    { id: 'ip_address', label: 'IP Address' },
    { id: 'email', label: 'Email' },
    { id: 'attempt_count', label: 'Attempts' },
    { id: 'last_attempt_at', label: 'Last Attempt' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

export default function FailedLoginList() {
    const { hasPermission } = usePermission();
    const canView = hasPermission('failed_logins.view');
    const canClear = hasPermission('failed_logins.clear');
    const canBlock = hasPermission('failed_logins.block');
    const canUnblock = hasPermission('failed_logins.unblock');

    const [records, setRecords] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);

    const [email, setEmail] = useState('');
    const [ip, setIp] = useState('');
    const [blockedFilter, setBlockedFilter] = useState('all');
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

    const fetchRecords = useCallback(async () => {
        if (!canView) return;
        setLoading(true);
        try {
            const params = {
                page: page + 1,
                per_page: rowsPerPage,
                email: email || undefined,
                ip: ip || undefined,
                is_blocked: blockedFilter !== 'all' ? blockedFilter === 'true' : undefined,
                from_date: startDate ? startDate.toISOString().split('T')[0] : undefined,
                to_date: endDate ? endDate.toISOString().split('T')[0] : undefined,
            };
            const response = await failedLoginService.getFailedLogins(params);

            if (response.data?.success) {
                // ✅ Correct extraction for your API structure
                const pagination = response.data.data?.data;   // the inner pagination object
                const recordsArray = pagination?.data ?? [];   // the actual array of records
                const totalCount = pagination?.total ?? 0;
                const statsObj = response.data.data?.stats ?? null;

                setRecords(recordsArray);
                setTotal(totalCount);
                setStats(statsObj);
            } else {
                setRecords([]);
                setTotal(0);
                setStats(null);
            }
        } catch (error) {
            console.error(error);
            showSnackbar({ type: 'error', message: 'Failed to load records' });
            setRecords([]);
            setTotal(0);
            setStats(null);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, email, ip, blockedFilter, startDate, endDate, canView]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const handleClearAll = () => {
        setConfirmDialog({
            open: true,
            title: 'Clear All Failed Login Records',
            message: 'This will permanently delete all failed login records. Are you sure?',
            action: async () => {
                try {
                    const response = await failedLoginService.clear();
                    if (response.data?.success) {
                        showSnackbar({ type: 'success', message: response.data.message });
                        fetchRecords();
                    } else {
                        throw new Error(response.data?.message || 'Clear failed');
                    }
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message });
                }
            }
        });
    };

    const handleBlockIp = (ipAddress) => {
        setConfirmDialog({
            open: true,
            title: 'Block IP Address',
            message: `Are you sure you want to block IP ${ipAddress}?`,
            action: async () => {
                try {
                    const response = await failedLoginService.block(ipAddress);
                    if (response.data?.success) {
                        showSnackbar({ type: 'success', message: `IP ${ipAddress} blocked` });
                        fetchRecords();
                    } else {
                        throw new Error(response.data?.message || 'Block failed');
                    }
                } catch (err) {
                    showSnackbar({ type: 'error', message: err.message });
                }
            }
        });
    };

    const handleUnblockIp = (ipAddress) => {
        setConfirmDialog({
            open: true,
            title: 'Unblock IP Address',
            message: `Are you sure you want to unblock IP ${ipAddress}?`,
            action: async () => {
                try {
                    const response = await failedLoginService.unblock(ipAddress);
                    if (response.data?.success) {
                        showSnackbar({ type: 'success', message: `IP ${ipAddress} unblocked` });
                        fetchRecords();
                    } else {
                        throw new Error(response.data?.message || 'Unblock failed');
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
        return <Typography sx={{ p: 2 }}>You do not have permission to view failed login records.</Typography>;
    }

    const blockedOptions = [
        { value: 'all', label: 'All' },
        { value: 'true', label: 'Blocked' },
        { value: 'false', label: 'Not Blocked' },
    ];

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ width: '100%', p: 0, m: 0 }}>
                <Paper sx={{ width: '100%', borderRadius: 1, overflow: 'hidden', boxShadow: 1 }}>
                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h5" gutterBottom>Failed Login Attempts</Typography>

                        {stats && (
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                <Grid item xs={6} md={3}>
                                    <Card variant="outlined"><CardContent sx={{ py: 1 }}>
                                        <Typography variant="body2" color="textSecondary">Total Records</Typography>
                                        <Typography variant="h5">{stats.total_records ?? 0}</Typography>
                                    </CardContent></Card>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Card variant="outlined"><CardContent sx={{ py: 1 }}>
                                        <Typography variant="body2" color="textSecondary">Unique Emails</Typography>
                                        <Typography variant="h5">{stats.unique_emails ?? 0}</Typography>
                                    </CardContent></Card>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Card variant="outlined"><CardContent sx={{ py: 1 }}>
                                        <Typography variant="body2" color="textSecondary">Unique IPs</Typography>
                                        <Typography variant="h5">{stats.unique_ips ?? 0}</Typography>
                                    </CardContent></Card>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Card variant="outlined"><CardContent sx={{ py: 1 }}>
                                        <Typography variant="body2" color="textSecondary">Blocked IPs</Typography>
                                        <Typography variant="h5">{stats.blocked_ips ?? 0}</Typography>
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
                                <TextField fullWidth size="small" label="IP Address" value={ip}
                                           onChange={(e) => setIp(e.target.value)} />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Blocked Status</InputLabel>
                                    <Select value={blockedFilter} label="Blocked Status" onChange={(e) => setBlockedFilter(e.target.value)}>
                                        {blockedOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
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
                                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchRecords} fullWidth>Refresh</Button>
                            </Grid>
                        </Grid>

                        {canClear && (
                            <Box display="flex" justifyContent="flex-end" mb={2}>
                                <Button variant="contained" color="error" startIcon={<ClearIcon />} onClick={handleClearAll}>Clear All Records</Button>
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
                                ) : records.length === 0 ? (
                                    <TableRow><TableCell colSpan={headCells.length} align="center">No failed login records found</TableCell></TableRow>
                                ) : (
                                    records.map((record) => (
                                        <TableRow key={record.id} hover>
                                            <TableCell>{record.ip_address}</TableCell>
                                            <TableCell>{record.email}</TableCell>
                                            <TableCell>{record.attempt_count}</TableCell>
                                            <TableCell>{record.last_attempt_at ? new Date(record.last_attempt_at).toLocaleString() : '-'}</TableCell>
                                            <TableCell>
                                                {canBlock && (
                                                    <Tooltip title="Block IP">
                                                        <IconButton size="small" onClick={() => handleBlockIp(record.ip_address)}>
                                                            <BlockIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {canUnblock && (
                                                    <Tooltip title="Unblock IP">
                                                        <IconButton size="small" onClick={() => handleUnblockIp(record.ip_address)}>
                                                            <UnblockIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
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