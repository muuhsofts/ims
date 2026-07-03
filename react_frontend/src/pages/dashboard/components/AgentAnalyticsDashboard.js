import React, { useState } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Chip, Avatar, Stack,
    useTheme, alpha, IconButton, Tooltip as MuiTooltip, CircularProgress,
} from '@mui/material';
import { Inventory, TrendingUp, FilterAlt, ShoppingCart } from '@mui/icons-material';
import { useAgentAnalytics } from 'hooks/useAgentAnalytics';
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

export default function AgentAnalyticsDashboard() {
    const theme = useTheme();
    const { hasPermission } = usePermission();
    const [period, setPeriod] = useState('');
    const [date, setDate] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const { data, loading, error, refetch } = useAgentAnalytics(300000, period || null, date || null);

    if (!hasPermission('agent-dashboard.view')) {
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
                <Typography sx={{ ml: 2 }}>Loading agent insights...</Typography>
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

    const { cards = {}, top_5_sales = [] } = data;

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', background: `radial-gradient(circle at 10% 30%, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.background.default, 0.96)} 100%)` }}>
            {/* Header */}
            <Box mb={3} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap">
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${theme.palette.primary.main} 80%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Agent Analytics
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: theme.palette.text.secondary }}>
                        <span>Sales Performance</span>
                        {cards.period !== 'all-time' && <Chip size="small" label={`Period: ${cards.period}`} />}
                    </Box>
                </Box>
                <MuiTooltip title="Filter data by period">
                    <IconButton onClick={() => setShowFilters(!showFilters)} color={showFilters ? 'primary' : 'default'}>
                        <FilterAlt />
                    </IconButton>
                </MuiTooltip>
            </Box>

            {/* Filters */}
            {showFilters && (
                <DashboardFilters period={period} setPeriod={setPeriod} date={date} setDate={setDate} refetch={refetch} />
            )}

            {/* Count Cards */}
            <Grid container spacing={3} sx={{ mb: 5 }}>
                <Grid item xs={12} sm={4}>
                    <MetricCard
                        title="Total Received Stock"
                        value={cards.total_stock || 0}
                        icon={Inventory}
                        color="#ff9800"
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <MetricCard
                        title="Total Remaining Device"
                        value={cards.remaining_stock || 0}
                        icon={ShoppingCart}
                        color="#4caf50"
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <MetricCard
                        title="Total Sold Device"
                        value={cards.total_sales_count || 0}
                        icon={TrendingUp}
                        color="#2196f3"
                    />
                </Grid>
            </Grid>

            {/* Top 5 Sales Table */}
            <Paper sx={{ p: 2, borderRadius: 4, backdropFilter: 'blur(8px)', bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>🏆 Top 5 Sales Transactions</Typography>
                <TableContainer component={Paper} elevation={0}>
                    <Table>
                        <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
                            <TableRow>
                                <TableCell><strong>Customer</strong></TableCell>
                                <TableCell><strong>Phone</strong></TableCell>
                                <TableCell><strong>Product</strong></TableCell>
                                <TableCell><strong>Category / Model</strong></TableCell>
                                <TableCell><strong>Method</strong></TableCell>
                                <TableCell align="center"><strong>Status</strong></TableCell>
                                <TableCell><strong>Date</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {top_5_sales.map(sale => (
                                <TableRow key={sale.sale_id} hover>
                                    <TableCell>{sale.customer_name}</TableCell>
                                    <TableCell>{sale.customer_phone}</TableCell>
                                    <TableCell>
                                        <MuiTooltip title={`IMEI: ${sale.imei} | SKU: ${sale.sku}`}>
                                            <span>{sale.product_name}</span>
                                        </MuiTooltip>
                                    </TableCell>
                                    <TableCell>{sale.category_name} / {sale.model}</TableCell>
                                    <TableCell>{sale.payment_method}</TableCell>
                                    <TableCell align="center">
                                        <Chip label={sale.status} size="small" color={sale.status === 'completed' ? 'success' : 'warning'} />
                                    </TableCell>
                                    <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                                </TableRow>
                            ))}
                            {top_5_sales.length === 0 && (
                                <TableRow><TableCell colSpan={7} align="center">No sales found</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}