import React, { useState } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Chip, Avatar, Stack,
    useTheme, alpha, IconButton, Tooltip as MuiTooltip, CircularProgress,
} from '@mui/material';
import { Inventory, AttachMoney, TrendingUp, FilterAlt, BarChart, Info } from '@mui/icons-material';
import ReactApexChart from 'react-apexcharts';
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

const CHART_COLORS = ['#4361ee', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0', '#f8961e', '#f9c74f', '#90be6d'];

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

    const { cards = {}, pie_chart = [], weekly_sales = [], top_5_sales = [], product_stock_histogram = [] } = data;

    // Pie chart (categories)
    const pieSeries = pie_chart.map(item => item.product_count);
    const pieLabels = pie_chart.map(item => item.category);
    const pieOptions = {
        labels: pieLabels,
        legend: { position: 'bottom' },
        colors: CHART_COLORS,
        plotOptions: { pie: { donut: { size: '55%' } } },
        tooltip: { y: { formatter: (val) => `${val} units` } }
    };

    // Top 5 sales pie (amounts)
    const top5PieSeries = top_5_sales.map(sale => parseFloat(sale.total_amount));
    const top5PieLabels = top_5_sales.map(sale => sale.customer_name);
    const top5PieOptions = {
        labels: top5PieLabels,
        legend: { position: 'bottom', fontSize: '12px' },
        colors: ['#f72585', '#4cc9f0', '#f8961e', '#90be6d', '#4361ee'],
        dataLabels: { enabled: true, formatter: (val, { seriesIndex }) => top5PieSeries[seriesIndex].toLocaleString() + ' TSh', style: { fontSize: '11px' } },
        tooltip: { y: { formatter: (val) => val.toLocaleString() + ' TSh' } },
        plotOptions: { pie: { donut: { size: '0%' }, expandOnClick: true } }
    };

    // Weekly sales line chart
    const lineSeries = [{ name: 'Sales', data: weekly_sales.map(w => w.sales_count) }];
    const lineOptions = {
        chart: { type: 'line', toolbar: { show: false }, background: 'transparent', animations: { enabled: true } },
        stroke: { curve: 'smooth', width: 3, colors: [theme.palette.primary.main] },
        xaxis: { categories: weekly_sales.map(w => w.day), title: { text: 'Day' } },
        yaxis: { title: { text: 'Number of Sales' } },
        tooltip: { y: { formatter: val => `${val} sales` } },
    };

    // Histogram – Stock per product (with category & model in tooltip)
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
            custom: function({ seriesIndex, dataPointIndex, w }) {
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
                        Agent Analytics
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: theme.palette.text.secondary }}>
                        <span>Inventory & Sales Performance</span>
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
                    <MetricCard title="Total Stock (Qty)" value={cards.total_stock || 0} icon={Inventory} color="#ff9800" />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <MetricCard title="Total Sales (TSh)" value={cards.total_sales_amount || 0} icon={AttachMoney} color="#4caf50" />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <MetricCard title="Total Transactions" value={cards.total_sales_count || 0} icon={TrendingUp} color="#2196f3" />
                </Grid>
            </Grid>

            {/* Pie + Line Charts */}
            <Grid container spacing={4} sx={{ mb: 5 }}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, borderRadius: 4, backdropFilter: 'blur(8px)', bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>📊 Product Categories (by stock)</Typography>
                        {pieSeries.length > 0 ? (
                            <ReactApexChart options={pieOptions} series={pieSeries} type="pie" height={350} />
                        ) : (
                            <Typography align="center" color="textSecondary">No inventory data</Typography>
                        )}
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, borderRadius: 4, backdropFilter: 'blur(8px)', bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>📈 Weekly Sales Trend (Last 7 days)</Typography>
                        {weekly_sales.length > 0 ? (
                            <ReactApexChart options={lineOptions} series={lineSeries} type="line" height={350} />
                        ) : (
                            <Typography align="center" color="textSecondary">No sales data</Typography>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* Top 5 Sales – Amount Distribution Pie */}
            {top_5_sales.length > 0 && (
                <Grid container spacing={4} sx={{ mb: 5 }}>
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2, borderRadius: 4, backdropFilter: 'blur(8px)', bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
                            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>🥧 Top 5 Sales – Amount Distribution</Typography>
                            <ReactApexChart options={top5PieOptions} series={top5PieSeries} type="pie" height={350} />
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Histogram: Stock per Product (Top 10) – now shows category & model on hover */}
            <Paper sx={{ p: 2, mb: 5, borderRadius: 4, backdropFilter: 'blur(8px)', bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BarChart /> Stock Quantity per Product (Top 10) <Info fontSize="small" color="action" />
                </Typography>
                {histData.length > 0 ? (
                    <ReactApexChart options={histOptions} series={histSeries} type="bar" height={400} />
                ) : (
                    <Typography align="center" color="textSecondary">No product stock to display</Typography>
                )}
            </Paper>

            {/* Top 5 Sales Table – now includes product details */}
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
                                <TableCell align="right"><strong>Amount (TSh)</strong></TableCell>
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
                                    <TableCell align="right">{parseFloat(sale.total_amount).toLocaleString()} TSh</TableCell>
                                    <TableCell>{sale.payment_method}</TableCell>
                                    <TableCell align="center">
                                        <Chip label={sale.status} size="small" color={sale.status === 'completed' ? 'success' : 'warning'} />
                                    </TableCell>
                                    <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                                </TableRow>
                            ))}
                            {top_5_sales.length === 0 && (
                                <TableRow><TableCell colSpan={8} align="center">No sales found</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}