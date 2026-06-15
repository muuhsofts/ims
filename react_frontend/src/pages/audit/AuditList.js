// src/pages/audit/AuditList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography, FormControl, InputLabel, Select,
    Grid, Card, CardContent, CircularProgress, useTheme, useMediaQuery,
    Divider, Tooltip
} from '@mui/material';
import {
    Refresh as RefreshIcon, Search as SearchIcon, MoreVert as MoreVertIcon,
    Visibility as ViewIcon, Person as PersonIcon,
    AccessTime as TimeIcon, Public as IpIcon, Http as MethodIcon,
    Link as UrlIcon, DeviceHub as UserAgentIcon,
    DataUsage as DataIcon
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

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
        return (
            <Box sx={{ p: 2 }}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="error">You do not have permission to view audit trails.</Typography>
                </Paper>
            </Box>
        );
    }

    // Helper: format date
    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleString() : '-';

    // Card component for mobile/tablet view
    const AuditCard = ({ audit }) => {
        return (
            <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Header: Date & Action */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TimeIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                                {formatDate(audit.created_at)}
                            </Typography>
                        </Box>
                        <Chip label={audit.action} size="small" color="primary" variant="outlined" />
                    </Box>

                    {/* User info */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight="medium">
                            {audit.user_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            ({audit.user_email})
                        </Typography>
                    </Box>

                    {/* Module & IP */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary">Module:</Typography>
                            <Typography variant="body2">{audit.module || '-'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <IpIcon fontSize="small" sx={{ fontSize: 14 }} color="action" />
                            <Typography variant="caption" fontFamily="monospace">{audit.ip_address}</Typography>
                        </Box>
                    </Box>

                    {/* Method */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <MethodIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">Method:</Typography>
                        <Chip label={audit.request_method} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                    </Box>

                    {/* Description snippet */}
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                        {audit.description}
                    </Typography>

                    {/* Action button */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
                        <Button
                            size="small"
                            startIcon={<ViewIcon />}
                            onClick={(e) => handleMenuOpen(e, audit)}
                            sx={{ borderRadius: 2 }}
                        >
                            View Details
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        );
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ width: '100%', p: { xs: 1, sm: 2 }, m: 0 }}>
                <Paper sx={{ width: '100%', borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden', boxShadow: { xs: 0, sm: 1 } }}>
                    {/* Header */}
                    <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h5" fontWeight="600" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                            Audit Trails
                        </Typography>

                        {/* Filters - Responsive stack */}
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth size="small"
                                    label="Global Search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Module</InputLabel>
                                    <Select value={moduleFilter} label="Module" onChange={(e) => setModuleFilter(e.target.value)}>
                                        <MenuItem value="all">All Modules</MenuItem>
                                        {modules.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Action</InputLabel>
                                    <Select value={actionFilter} label="Action" onChange={(e) => setActionFilter(e.target.value)}>
                                        <MenuItem value="all">All Actions</MenuItem>
                                        {actions.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={1.5}>
                                <DatePicker
                                    label="From Date"
                                    value={fromDate}
                                    onChange={setFromDate}
                                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={1.5}>
                                <DatePicker
                                    label="To Date"
                                    value={toDate}
                                    onChange={setToDate}
                                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                />
                            </Grid>
                            <Grid item xs={6} sm={6} md={1}>
                                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchAudits} fullWidth sx={{ height: '40px' }}>
                                    Refresh
                                </Button>
                            </Grid>
                        </Grid>

                        {/* Statistics cards - Responsive */}
                        {statsLoading ? (
                            <Box display="flex" justifyContent="center" py={2}>
                                <CircularProgress size={24} />
                            </Box>
                        ) : stats && (
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                <Grid item xs={6} sm={6} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                        <CardContent sx={{ py: 1.5, px: 2 }}>
                                            <Typography variant="body2" color="textSecondary">Total Records</Typography>
                                            <Typography variant="h5" fontWeight="bold">{stats.total ?? 0}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} sm={6} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                        <CardContent sx={{ py: 1.5, px: 2 }}>
                                            <Typography variant="body2" color="textSecondary">Today</Typography>
                                            <Typography variant="h5" fontWeight="bold">{stats.today ?? 0}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} sm={6} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                        <CardContent sx={{ py: 1.5, px: 2 }}>
                                            <Typography variant="body2" color="textSecondary">This Week</Typography>
                                            <Typography variant="h5" fontWeight="bold">{stats.this_week ?? 0}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} sm={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                                        <CardContent sx={{ py: 1.5, px: 2 }}>
                                            <Typography variant="body2" color="textSecondary">Top 3 Users</Typography>
                                            <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
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

                    {/* Records: Cards on mobile/tablet, Table on desktop */}
                    {showTableView ? (
                        <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                            <Table sx={{ width: '100%', minWidth: 1000 }}>
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
                                            <TableCell colSpan={8} align="center">
                                                <CircularProgress size={32} sx={{ my: 3 }} />
                                            </TableCell>
                                        </TableRow>
                                    ) : audits.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center">
                                                <Typography sx={{ py: 3 }} color="text.secondary">No audit records found</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        audits.map((audit, idx) => (
                                            <TableRow key={`${audit.created_at}-${audit.user_email}-${idx}`} hover>
                                                <TableCell>{formatDate(audit.created_at)}</TableCell>
                                                <TableCell>
                                                    <strong>{audit.user_name}</strong><br />
                                                    <small>{audit.user_email}</small>
                                                </TableCell>
                                                <TableCell><Chip label={audit.action} size="small" /></TableCell>
                                                <TableCell>{audit.module || '-'}</TableCell>
                                                <TableCell sx={{ maxWidth: 250, wordBreak: 'break-word' }}>{audit.description?.substring(0, 60)}...</TableCell>
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
                    ) : (
                        <Box sx={{ p: { xs: 2, sm: 3 } }}>
                            {loading ? (
                                <Box display="flex" justifyContent="center" py={4}>
                                    <CircularProgress />
                                </Box>
                            ) : audits.length === 0 ? (
                                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography color="text.secondary">No audit records found</Typography>
                                </Paper>
                            ) : (
                                audits.map((audit, idx) => <AuditCard key={`${audit.created_at}-${audit.user_email}-${idx}`} audit={audit} />)
                            )}
                        </Box>
                    )}

                    {/* Pagination */}
                    <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: { xs: 1, sm: 0 } }}>
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

                {/* Action Menu */}
                <Menu
                    anchorEl={actionMenu}
                    open={Boolean(actionMenu)}
                    onClose={handleMenuClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <MenuItem onClick={handleViewDetails}>
                        <ViewIcon sx={{ mr: 1, fontSize: 20 }} /> View Details
                    </MenuItem>
                </Menu>

                {/* Details Modal - Responsive full width on mobile */}
                <Dialog
                    open={viewModalOpen}
                    onClose={() => setViewModalOpen(false)}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                        sx: { m: { xs: 2, sm: 0 }, borderRadius: { xs: 2, sm: 1 } }
                    }}
                >
                    <DialogTitle sx={{ pb: 1 }}>Audit Trail Details</DialogTitle>
                    <DialogContent dividers>
                        {selectedAudit && (
                            <Box component="dl" sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: '120px 1fr' },
                                gap: 1,
                                '& dt': {
                                    fontWeight: 'bold',
                                    color: 'text.secondary',
                                    fontSize: '0.875rem',
                                    mt: 0.5
                                },
                                '& dd': {
                                    m: 0,
                                    wordBreak: 'break-all',
                                    fontSize: '0.875rem',
                                    mb: 1
                                }
                            }}>
                                <dt>Date & Time:</dt><dd>{formatDate(selectedAudit.created_at)}</dd>
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
                                        <dd><pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.75rem' }}>{JSON.stringify(selectedAudit.old_data, null, 2)}</pre></dd>
                                    </>
                                )}
                                {selectedAudit.new_data && (
                                    <>
                                        <dt>New Data:</dt>
                                        <dd><pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.75rem' }}>{JSON.stringify(selectedAudit.new_data, null, 2)}</pre></dd>
                                    </>
                                )}
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setViewModalOpen(false)} variant="outlined">Close</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </LocalizationProvider>
    );
}