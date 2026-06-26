// src/pages/dashboard/components/BranchOwnerAnalyticsDashboard.js
import React, { useState } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Chip, Avatar, Stack,
    useTheme, alpha, IconButton, Tooltip, CircularProgress, Tabs, Tab,
    Divider
} from '@mui/material';
import {
    Inventory, People, SwapHoriz, Pending, CheckCircle, Cancel,
    FilterAlt, BarChart, Info, Storefront
} from '@mui/icons-material';
import ReactApexChart from 'react-apexcharts';
import { useBranchOwnerAnalytics } from 'hooks/useBranchOwnerAnalytics';
import { usePermission } from 'hooks/usePermission';
import DashboardFilters from './DashboardFilters';

const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toLocaleString();
};

const MetricCard = ({ title, value, icon: Icon, color }) => {
    const theme = useTheme();
    return (
        <Card elevation={0} sx={{
            borderRadius: 4,
            backdropFilter: 'blur(12px)',
            backgroundColor: alpha(theme.palette.background.paper, 0.75),
            border: `1px solid ${alpha(color, 0.2)}`,
            transition: 'all 0.3s',
            '&:hover': { transform: 'translateY(-6px)', boxShadow: `0 20px 35px -12px ${alpha(color, 0.4)}` },
        }}>
            <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 500, color: alpha(theme.palette.text.secondary, 0.8) }}>
                            {title}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>{formatNumber(value)}</Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: alpha(color, 0.15), width: 48, height: 48, color }}>
                        <Icon sx={{ fontSize: 26 }} />
                    </Avatar>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default function BranchOwnerAnalyticsDashboard() {
    const theme = useTheme();
    const { hasPermission } = usePermission();
    const [period, setPeriod] = useState('');
    const [date, setDate] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [tabValue, setTabValue] = useState(0);
    const { data, loading, error, refetch } = useBranchOwnerAnalytics(300000, period || null, date || null);

    if (!hasPermission('cc_center_dashboard.view')) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <Typography variant="h4" color="error">Access Denied</Typography>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading branch insights...</Typography>
            </Box>
        );
    }

    if (error || !data) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <Typography color="error">Failed to load data: {error}</Typography>
            </Box>
        );
    }

    const {
        cards = {},
        transfer_stats = {},
        recent_transfers = [],
        product_stock_histogram = []
    } = data;

    // Transfer status pie (still useful)
    const transferStatusSeries = [
        transfer_stats.pending || 0,
        transfer_stats.approved || 0,
        transfer_stats.rejected || 0,
    ];
    const transferStatusLabels = ['Pending', 'Approved', 'Rejected'];
    const transferStatusOptions = {
        labels: transferStatusLabels,
        colors: ['#ff9800', '#4caf50', '#f44336'],
        legend: { position: 'bottom' },
        plotOptions: { pie: { donut: { size: '60%' } } },
        tooltip: { y: { formatter: (val) => `${val} requests` } }
    };

    // Histogram: Top 10 stocked products (kept)
    const histCategories = product_stock_histogram.map(p =>
        p.product_name.length > 20 ? p.product_name.substring(0, 20) + '...' : p.product_name
    );
    const histData = product_stock_histogram.map(p => p.quantity);
    const histOptions = {
        chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
        plotOptions: { bar: { borderRadius: 6, horizontal: true, dataLabels: { position: 'top' } } },
        dataLabels: { enabled: true, formatter: (val) => val, offsetX: 20, style: { fontSize: '12px' } },
        xaxis: { categories: histCategories, title: { text: 'Quantity' } },
        colors: [theme.palette.success.main],
        tooltip: {
            custom: function({ dataPointIndex }) {
                const item = product_stock_histogram[dataPointIndex];
                return `<div style="padding: 8px; background: #fff; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                            <strong>${item.product_name}</strong><br/>
                            Category: ${item.category_name}<br/>
                            Model: ${item.model}<br/>
                            SKU: ${item.sku}<br/>
                            IMEI: ${item.imei}<br/>
                            Quantity: ${item.quantity}
                        </div>`;
            }
        },
    };
    const histSeries = [{ name: 'Stock', data: histData }];

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', background: `radial-gradient(circle at 10% 30%, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.background.default, 0.96)} 100%)` }}>
            {/* Header */}
            <Box mb={3} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap">
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${theme.palette.primary.main} 80%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Branch Owner Dashboard
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: theme.palette.text.secondary }}>
                        <span>Collection Center & Agent Performance</span>
                        {cards.period !== 'all-time' && <Chip size="small" label={`Period: ${cards.period}`} />}
                    </Box>
                </Box>
                <Tooltip title="Filter data by period">
                    <IconButton onClick={() => setShowFilters(!showFilters)} color={showFilters ? 'primary' : 'default'}>
                        <FilterAlt />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Filters */}
            {showFilters && (
                <DashboardFilters period={period} setPeriod={setPeriod} date={date} setDate={setDate} refetch={refetch} />
            )}

            {/* KPI Cards */}
            <Grid container spacing={3} sx={{ mb: 5 }}>
                <Grid item xs={12} sm={4}>
                    <MetricCard title="CC Stock (Units)" value={cards.total_cc_stock || 0} icon={Storefront} color="#ff9800" />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <MetricCard title="Agents' Stock" value={cards.total_agent_stock || 0} icon={Inventory} color="#4caf50" />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <MetricCard title="Total Agents" value={cards.total_agents || 0} icon={People} color="#2196f3" />
                </Grid>
            </Grid>

            {/* Transfer Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 5 }}>
                <Grid item xs={12} sm={4}>
                    <MetricCard title="Pending Transfers" value={transfer_stats.pending || 0} icon={Pending} color="#ff9800" />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <MetricCard title="Approved Transfers" value={transfer_stats.approved || 0} icon={CheckCircle} color="#4caf50" />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <MetricCard title="Rejected Transfers" value={transfer_stats.rejected || 0} icon={Cancel} color="#f44336" />
                </Grid>
            </Grid>

            {/* Tabs for Charts */}
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
                <Tab label="Stock Insights" />
                <Tab label="Transfer Analytics" />
            </Tabs>

            {/* Tab 0: Stock Insights – only top 10 histogram */}
            {tabValue === 0 && (
                <Grid container spacing={4} sx={{ mb: 5 }}>
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2, borderRadius: 4, backdropFilter: 'blur(8px)', bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
                            <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <BarChart /> Top 10 Stocked Products (CC) <Info fontSize="small" color="action" />
                            </Typography>
                            {histData.length > 0 ? (
                                <ReactApexChart options={histOptions} series={histSeries} type="bar" height={400} />
                            ) : (
                                <Typography align="center" color="textSecondary">No product stock to display</Typography>
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Tab 1: Transfer Analytics */}
            {tabValue === 1 && (
                <Grid container spacing={4}>
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, borderRadius: 4, backdropFilter: 'blur(8px)', bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
                            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>📊 Transfer Request Status</Typography>
                            <ReactApexChart options={transferStatusOptions} series={transferStatusSeries} type="pie" height={350} />
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        {/* Removed Weekly Transfer Trend chart – no chart here now, keep empty or reuse, but we removed it */}
                        <Paper sx={{ p: 2, borderRadius: 4, backdropFilter: 'blur(8px)', bgcolor: alpha(theme.palette.background.paper, 0.6), height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant="body1" color="textSecondary">Weekly transfer trend has been removed.</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2, borderRadius: 4, backdropFilter: 'blur(8px)', bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
                            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>📋 Recent Transfer Requests</Typography>
                            <TableContainer component={Paper} elevation={0}>
                                <Table>
                                    <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
                                        <TableRow>
                                            <TableCell><strong>Request ID</strong></TableCell>
                                            <TableCell><strong>Items</strong></TableCell>
                                            <TableCell align="right"><strong>Total Qty</strong></TableCell>
                                            <TableCell align="center"><strong>Status</strong></TableCell>
                                            <TableCell><strong>Approved By</strong></TableCell>
                                            <TableCell><strong>Date</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {recent_transfers.map(tr => (
                                            <TableRow key={tr.request_id} hover>
                                                <TableCell>{tr.request_id.substring(0, 8)}...</TableCell>
                                                <TableCell>
                                                    {tr.requested_items?.length ? `${tr.requested_items.length} item(s)` : '-'}
                                                </TableCell>
                                                <TableCell align="right">{tr.total_quantity || 0}</TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={tr.status}
                                                        size="small"
                                                        color={tr.status === 'approved' ? 'success' : tr.status === 'pending' ? 'warning' : 'error'}
                                                    />
                                                </TableCell>
                                                <TableCell>{tr.approved_by || '-'}</TableCell>
                                                <TableCell>{new Date(tr.created_at).toLocaleDateString()}</TableCell>
                                            </TableRow>
                                        ))}
                                        {recent_transfers.length === 0 && (
                                            <TableRow><TableCell colSpan={6} align="center">No transfers found</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Removed the entire "Summary Analytics" section at the bottom */}
        </Box>
    );
}