// src/pages/audit/AuditList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography, FormControl, InputLabel, Select,
    Grid, Card, CardContent, CircularProgress
} from '@mui/material';
import {
    Refresh as RefreshIcon, Search as SearchIcon, MoreVert as MoreVertIcon,
    Visibility as ViewIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { auditService } from 'services/audit.service';
import { usePermission } from '@/hooks/usePermission';
import { showSnackbar } from 'utils/snackbar';

const headCells = [
    { id: 'created_at', label: 'Date & Time' },
    { id: 'user', label: 'User' },
    { id: 'action', label: 'Action' },
    { id: 'module', label: 'Module' },
    { id: 'description', label: 'Description' },
    { id: 'ip_address', label: 'IP' },
    { id: 'request_method', label: 'Method' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

export default function AuditList() {
    const { hasPermission } = usePermission();
    const canView = hasPermission('audit.view');
    const canExport = hasPermission('audit.export');

    const [audits, setAudits] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);

    const [modules, setModules] = useState([]);
    const [actions, setActions] = useState([]);

    const [search, setSearch] = useState('');
    const [moduleFilter, setModuleFilter] = useState('all');
    const [actionFilter, setActionFilter] = useState('all');
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedAudit, setSelectedAudit] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);

    // Load filter options (modules & actions)
    useEffect(() => {
        if (canView) {
            loadFilters();
        }
    }, [canView]);

    const loadFilters = async () => {
        try {
            const [modulesRes, actionsRes] = await Promise.all([
                auditService.getModules(),
                auditService.getActions()
            ]);
            if (modulesRes.data?.success) setModules(modulesRes.data.data);
            if (actionsRes.data?.success) setActions(actionsRes.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAudits = useCallback(async () => {
        if (!canView) return;
        setLoading(true);
        try {
            const params = {
                page: page + 1,
                per_page: rowsPerPage,
                search: search || undefined,
                module: moduleFilter !== 'all' ? moduleFilter : undefined,
                action: actionFilter !== 'all' ? actionFilter : undefined,
                from_date: fromDate ? fromDate.toISOString().split('T')[0] : undefined,
                to_date: toDate ? toDate.toISOString().split('T')[0] : undefined,
            };
            const response = await auditService.getAuditTrails(params);
            if (response.data?.success) {
                setAudits(response.data.data.data);
                setTotal(response.data.data.total);
            } else {
                setAudits([]);
                setTotal(0);
            }
        } catch (error) {
            showSnackbar({ type: 'error', message: 'Failed to load audit trails' });
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, search, moduleFilter, actionFilter, fromDate, toDate, canView]);

    useEffect(() => {
        fetchAudits();
    }, [fetchAudits]);

    const fetchStats = useCallback(async () => {
        if (!canView) return;
        setStatsLoading(true);
        try {
            const params = {
                search: search || undefined,
                module: moduleFilter !== 'all' ? moduleFilter : undefined,
                action: actionFilter !== 'all' ? actionFilter : undefined,
                from_date: fromDate ? fromDate.toISOString().split('T')[0] : undefined,
                to_date: toDate ? toDate.toISOString().split('T')[0] : undefined,
            };
            const response = await auditService.getStats(params);
            if (response.data?.success) setStats(response.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setStatsLoading(false);
        }
    }, [search, moduleFilter, actionFilter, fromDate, toDate, canView]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleMenuOpen = (event, audit) => {
        setSelectedAudit(audit);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => setActionMenu(null);

    const handleViewDetails = () => {
        setViewModalOpen(true);
        handleMenuClose();
    };

    if (!canView) {
        return <Typography>You do not have permission to view audit trails.</Typography>;
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ width: '100%', p: 0, m: 0 }}>
                <Paper sx={{ width: '100%', borderRadius: 1, overflow: 'hidden', boxShadow: 1 }}>
                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h5" gutterBottom>Audit Trails</Typography>

                        {/* Filters row */}
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={12} md={3}>
                                <TextField
                                    fullWidth size="small"
                                    label="Global Search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                                />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Module</InputLabel>
                                    <Select value={moduleFilter} label="Module" onChange={(e) => setModuleFilter(e.target.value)}>
                                        <MenuItem value="all">All Modules</MenuItem>
                                        {modules.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Action</InputLabel>
                                    <Select value={actionFilter} label="Action" onChange={(e) => setActionFilter(e.target.value)}>
                                        <MenuItem value="all">All Actions</MenuItem>
                                        {actions.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <DatePicker
                                    label="From Date"
                                    value={fromDate}
                                    onChange={setFromDate}
                                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <DatePicker
                                    label="To Date"
                                    value={toDate}
                                    onChange={setToDate}
                                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                />
                            </Grid>
                            <Grid item xs={12} md={1}>
                                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchAudits} fullWidth>
                                    Refresh
                                </Button>
                            </Grid>
                        </Grid>

                        {/* Statistics cards */}
                        {statsLoading ? (
                            <Box display="flex" justifyContent="center" py={2}>
                                <CircularProgress size={24} />
                            </Box>
                        ) : stats && (
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                <Grid item xs={6} md={3}>
                                    <Card variant="outlined">
                                        <CardContent sx={{ py: 1 }}>
                                            <Typography variant="body2" color="textSecondary">Total Records</Typography>
                                            <Typography variant="h5">{stats.total ?? 0}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Card variant="outlined">
                                        <CardContent sx={{ py: 1 }}>
                                            <Typography variant="body2" color="textSecondary">Today</Typography>
                                            <Typography variant="h5">{stats.today ?? 0}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Card variant="outlined">
                                        <CardContent sx={{ py: 1 }}>
                                            <Typography variant="body2" color="textSecondary">This Week</Typography>
                                            <Typography variant="h5">{stats.this_week ?? 0}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Card variant="outlined">
                                        <CardContent sx={{ py: 1 }}>
                                            <Typography variant="body2" color="textSecondary">Top 3 Users</Typography>
                                            <Typography variant="caption" component="div">
                                                {stats.by_user && stats.by_user.length > 0
                                                    ? stats.by_user.slice(0,3).map(u => `${u.user_email}: ${u.count}`).join(', ')
                                                    : 'No data'}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        )}
                    </Box>

                    <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                        <Table sx={{ width: '100%', minWidth: 1000 }}>
                            <TableHead>
                                <TableRow>
                                    {headCells.map((cell) => (
                                        <TableCell key={cell.id}>{cell.label}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={8} align="center">Loading...</TableCell></TableRow>
                                ) : audits.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} align="center">No audit records found</TableCell></TableRow>
                                ) : (
                                    audits.map((audit, idx) => (
                                        <TableRow key={`${audit.created_at}-${audit.user_email}-${idx}`} hover>
                                            <TableCell>{new Date(audit.created_at).toLocaleString()}</TableCell>
                                            <TableCell>
                                                <strong>{audit.user_name}</strong><br />
                                                <small>{audit.user_email}</small>
                                            </TableCell>
                                            <TableCell><Chip label={audit.action} size="small" /></TableCell>
                                            <TableCell>{audit.module || '-'}</TableCell>
                                            <TableCell>{audit.description?.substring(0, 60)}...</TableCell>
                                            <TableCell>{audit.ip_address}</TableCell>
                                            <TableCell>{audit.request_method}</TableCell>
                                            <TableCell align="center">
                                                <IconButton size="small" onClick={(e) => handleMenuOpen(e, audit)}>
                                                    <MoreVertIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25, 50]}
                            component="div"
                            count={total}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={(e, newPage) => setPage(newPage)}
                            onRowsPerPageChange={(e) => {
                                setRowsPerPage(parseInt(e.target.value, 10));
                                setPage(0);
                            }}
                        />
                    </Box>
                </Paper>

                {/* Action Menu */}
                <Menu anchorEl={actionMenu} open={Boolean(actionMenu)} onClose={handleMenuClose}>
                    <MenuItem onClick={handleViewDetails}>
                        <ViewIcon sx={{ mr: 1 }} /> View Details
                    </MenuItem>
                </Menu>

                {/* Details Modal */}
                <Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle>Audit Trail Details</DialogTitle>
                    <DialogContent dividers>
                        {selectedAudit && (
                            <>
                                <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 1 }}>
                                    <dt>Date & Time:</dt><dd>{new Date(selectedAudit.created_at).toLocaleString()}</dd>
                                    <dt>User:</dt><dd>{selectedAudit.user_name} ({selectedAudit.user_email})</dd>
                                    <dt>Role:</dt><dd>{selectedAudit.user_role}</dd>
                                    <dt>Action:</dt><dd>{selectedAudit.action}</dd>
                                    <dt>Module:</dt><dd>{selectedAudit.module || '-'}</dd>
                                    <dt>Description:</dt><dd>{selectedAudit.description}</dd>
                                    <dt>IP Address:</dt><dd>{selectedAudit.ip_address}</dd>
                                    <dt>Request Method:</dt><dd>{selectedAudit.request_method}</dd>
                                    <dt>Request URL:</dt><dd style={{ wordBreak: 'break-all' }}>{selectedAudit.request_url}</dd>
                                    <dt>User Agent:</dt><dd style={{ wordBreak: 'break-all' }}>{selectedAudit.user_agent}</dd>
                                    {selectedAudit.old_data && (
                                        <>
                                            <dt>Old Data:</dt>
                                            <dd><pre>{JSON.stringify(selectedAudit.old_data, null, 2)}</pre></dd>
                                        </>
                                    )}
                                    {selectedAudit.new_data && (
                                        <>
                                            <dt>New Data:</dt>
                                            <dd><pre>{JSON.stringify(selectedAudit.new_data, null, 2)}</pre></dd>
                                        </>
                                    )}
                                </Box>
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setViewModalOpen(false)}>Close</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </LocalizationProvider>
    );
}