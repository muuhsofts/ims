// src/pages/failed-logins/FailedLoginList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TablePagination, TableRow, TextField,
    Typography, FormControl, InputLabel, Select, MenuItem, Grid, Card,
    CardContent, CircularProgress, Tooltip, Chip, useTheme, useMediaQuery,
    Divider
} from '@mui/material';
import {
    Refresh as RefreshIcon, Search as SearchIcon, DeleteSweep as ClearIcon,
    Block as BlockIcon, LockOpen as UnblockIcon, Email as EmailIcon,
    Public as IpIcon, AccessTime as TimeIcon, Lock as LockIcon
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md')); // Show table on medium screens and up

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
                const pagination = response.data.data?.data;
                const recordsArray = pagination?.data ?? [];
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
        return (
            <Box sx={{ p: 2 }}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="error">You do not have permission to view failed login records.</Typography>
                </Paper>
            </Box>
        );
    }

    const blockedOptions = [
        { value: 'all', label: 'All' },
        { value: 'true', label: 'Blocked' },
        { value: 'false', label: 'Not Blocked' },
    ];

    // Render record as card for mobile/tablet view
    const RecordCard = ({ record }) => (
        <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IpIcon fontSize="small" color="action" />
                        <Typography variant="body1" fontWeight="medium" fontFamily="monospace">
                            {record.ip_address}
                        </Typography>
                    </Box>
                    {record.is_blocked && (
                        <Chip label="Blocked" size="small" color="error" icon={<LockIcon />} />
                    )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <EmailIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                        {record.email}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Chip
                        label={`${record.attempt_count} attempt${record.attempt_count !== 1 ? 's' : ''}`}
                        size="small"
                        color={record.attempt_count > 5 ? "warning" : "default"}
                        variant="outlined"
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TimeIcon fontSize="small" color="action" sx={{ fontSize: 14 }} />
                        <Typography variant="caption" color="text.secondary">
                            {record.last_attempt_at ? new Date(record.last_attempt_at).toLocaleString() : '-'}
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ my: 1.5 }} />

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    {canBlock && !record.is_blocked && (
                        <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            startIcon={<BlockIcon />}
                            onClick={() => handleBlockIp(record.ip_address)}
                            sx={{ borderRadius: 2 }}
                        >
                            Block IP
                        </Button>
                    )}
                    {canUnblock && record.is_blocked && (
                        <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<UnblockIcon />}
                            onClick={() => handleUnblockIp(record.ip_address)}
                            sx={{ borderRadius: 2 }}
                        >
                            Unblock
                        </Button>
                    )}
                    {(!canBlock && !canUnblock) && (
                        <Typography variant="caption" color="text.secondary">No actions available</Typography>
                    )}
                </Box>
            </CardContent>
        </Card>
    );

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ width: '100%', p: { xs: 1, sm: 2 }, m: 0 }}>
                <Paper sx={{ width: '100%', borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden', boxShadow: { xs: 0, sm: 1 } }}>
                    {/* Header and Stats */}
                    <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h5" fontWeight="600" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                            Failed Login Attempts
                        </Typography>

                        {/* Stats Cards - Responsive Grid */}
                        {stats && (
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={6} sm={6} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                        <CardContent sx={{ py: 1.5, px: 2 }}>
                                            <Typography variant="body2" color="textSecondary">Total Records</Typography>
                                            <Typography variant="h5" fontWeight="bold">{stats.total_records ?? 0}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} sm={6} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                        <CardContent sx={{ py: 1.5, px: 2 }}>
                                            <Typography variant="body2" color="textSecondary">Unique Emails</Typography>
                                            <Typography variant="h5" fontWeight="bold">{stats.unique_emails ?? 0}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} sm={6} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                        <CardContent sx={{ py: 1.5, px: 2 }}>
                                            <Typography variant="body2" color="textSecondary">Unique IPs</Typography>
                                            <Typography variant="h5" fontWeight="bold">{stats.unique_ips ?? 0}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} sm={6} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                        <CardContent sx={{ py: 1.5, px: 2 }}>
                                            <Typography variant="body2" color="textSecondary">Blocked IPs</Typography>
                                            <Typography variant="h5" fontWeight="bold">{stats.blocked_ips ?? 0}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        )}

                        {/* Filters Section - Fully responsive */}
                        <Box sx={{ mb: 2 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={2}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="IP Address"
                                        value={ip}
                                        onChange={(e) => setIp(e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={2}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Blocked Status</InputLabel>
                                        <Select value={blockedFilter} label="Blocked Status" onChange={(e) => setBlockedFilter(e.target.value)}>
                                            {blockedOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={6} md={1.5}>
                                    <DatePicker
                                        label="Start Date"
                                        value={startDate}
                                        onChange={setStartDate}
                                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={1.5}>
                                    <DatePicker
                                        label="End Date"
                                        value={endDate}
                                        onChange={setEndDate}
                                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                    />
                                </Grid>
                                <Grid item xs={6} sm={6} md={1}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<RefreshIcon />}
                                        onClick={fetchRecords}
                                        fullWidth
                                        sx={{ height: '40px' }}
                                    >
                                        Refresh
                                    </Button>
                                </Grid>
                            </Grid>
                        </Box>

                        {/* Clear All Button - Responsive positioning */}
                        {canClear && (
                            <Box display="flex" justifyContent={{ xs: 'center', sm: 'flex-end' }} mb={2}>
                                <Button
                                    variant="contained"
                                    color="error"
                                    startIcon={<ClearIcon />}
                                    onClick={handleClearAll}
                                    size={isMobile ? "small" : "medium"}
                                    sx={{ borderRadius: 2 }}
                                >
                                    Clear All Records
                                </Button>
                            </Box>
                        )}
                    </Box>

                    {/* Records List - Responsive: Cards on mobile/tablet, Table on larger screens */}
                    {showTableView ? (
                        // Table view for desktop
                        <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                            <Table sx={{ width: '100%', minWidth: 800 }}>
                                <TableHead>
                                    <TableRow>
                                        {headCells.map((cell) => (
                                            <TableCell key={cell.id} sx={{ fontWeight: 'bold' }}>
                                                {cell.label}
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
                                    ) : records.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={headCells.length} align="center">
                                                <Typography sx={{ py: 3 }} color="text.secondary">
                                                    No failed login records found
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        records.map((record) => (
                                            <TableRow key={record.id} hover>
                                                <TableCell sx={{ fontFamily: 'monospace' }}>{record.ip_address}</TableCell>
                                                <TableCell>{record.email}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={record.attempt_count}
                                                        size="small"
                                                        color={record.attempt_count > 5 ? "warning" : "default"}
                                                    />
                                                </TableCell>
                                                <TableCell>{record.last_attempt_at ? new Date(record.last_attempt_at).toLocaleString() : '-'}</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
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
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        // Card view for mobile and tablet
                        <Box sx={{ p: { xs: 2, sm: 3 } }}>
                            {loading ? (
                                <Box display="flex" justifyContent="center" py={4}>
                                    <CircularProgress />
                                </Box>
                            ) : records.length === 0 ? (
                                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography color="text.secondary">No failed login records found</Typography>
                                </Paper>
                            ) : (
                                <>
                                    {records.map((record) => (
                                        <RecordCard key={record.id} record={record} />
                                    ))}
                                </>
                            )}
                        </Box>
                    )}

                    {/* Pagination */}
                    <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: { xs: 1, sm: 0 } }}>
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25, 50, 100]}
                            component="div"
                            count={total}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={(e, newPage) => setPage(newPage)}
                            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
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

                {/* Confirm Dialog - Responsive full width on mobile */}
                <Dialog
                    open={confirmDialog.open}
                    onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                    fullWidth
                    maxWidth="xs"
                    PaperProps={{
                        sx: { m: { xs: 2, sm: 0 }, borderRadius: { xs: 2, sm: 1 } }
                    }}
                >
                    <DialogTitle sx={{ pb: 1 }}>{confirmDialog.title}</DialogTitle>
                    <DialogContent>
                        <Typography>{confirmDialog.message}</Typography>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, pt: 0 }}>
                        <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirm} color="error" variant="contained">
                            Confirm
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </LocalizationProvider>
    );
}