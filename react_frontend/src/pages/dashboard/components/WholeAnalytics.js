// WholeAnalytics.js
import { useState } from 'react';
import {
    Container, Grid, Box, Typography, CircularProgress, alpha, useTheme, Paper,
} from '@mui/material';
import DashboardFilters from './DashboardFilters';
import PrimaryMetricsGrid from './PrimaryMetricsGrid';
import ExtendedMetricsGrid from './ExtendedMetricsGrid';
import ExtendedMetricsHistogram from './ExtendedMetricsHistogram';
import InventoryHealthCard from './InventoryHealthCard';
import OverallTrendChart from './OverallTrendChart';
import TopPurchasesVisual from './TopPurchasesVisual';
import RevenuePieChart from './RevenuePieChart';
import RevenueHistogram from './RevenueHistogram';
import { useDashboardAnalytics } from 'hooks/useDashboardAnalytics';
import { useRevenueAnalytics } from 'hooks/useRevenueAnalytics';

const formatApiDate = (period, dateObj) => {
    if (!dateObj || !period) return null;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    switch (period) {
        case 'daily': return `${year}-${month}-${day}`;
        case 'monthly': return `${year}-${month}`;
        case 'yearly': return `${year}`;
        default: return null;
    }
};

const WholeAnalytics = () => {
    const theme = useTheme();
    const [period, setPeriod] = useState('');
    const [date, setDate] = useState(null);
    const apiDate = formatApiDate(period, date);

    const { data, loading, error, refetch } = useDashboardAnalytics(300000, period, apiDate);
    const { data: revenueData, loading: revenueLoading } = useRevenueAnalytics(period || null, apiDate);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading dashboard data…</Typography>
            </Box>
        );
    }

    if (error || !data) {
        return (
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Typography variant="h4" fontWeight={800} gutterBottom>Whole Analytics Dashboard</Typography>
                <Box sx={{ p: 4, borderRadius: 4, textAlign: 'center', bgcolor: alpha(theme.palette.error.main, 0.08), border: `1px solid ${alpha(theme.palette.error.main, 0.3)}` }}>
                    <Typography variant="h6" color="error">{error || 'Data not found'}</Typography>
                </Box>
            </Container>
        );
    }

    const cards = data.cards || {};
    const extended = data.extended_analytics || {};
    const purchases = data.top_5_purchases || [];
    const inventoryLevel = cards.inventory_level || 0;
    const totalProducts = cards.total_products || 0;
    const inventoryPercent = totalProducts > 0 ? (inventoryLevel / totalProducts) * 100 : 0;
    const weeklySales = data.weekly_sales || [];

    const totalRevenue = revenueData?.total_revenue || 0;
    const revenuePieData = revenueData?.revenue_pie_chart || [];
    const revenueHistogramData = revenueData?.revenue_histogram || [];

    const glossyPaper = {
        p: 3,
        borderRadius: 4,
        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.7)} 100%)`,
        backdropFilter: 'blur(8px)',
        boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`,
        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
        height: '100%',
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Typography variant="h4" fontWeight={800} gutterBottom>
                Whole Analytics Dashboard
            </Typography>

            <DashboardFilters period={period} setPeriod={setPeriod} date={date} setDate={setDate} refetch={refetch} />

            <Box sx={{ mb: 5 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
                    Revenue Analytics
                </Typography>
                {revenueLoading ? (
                    <Box display="flex" justifyContent="center" py={6}>
                        <CircularProgress size={48} />
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Paper sx={{ p: 3, textAlign: 'center', background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, color: 'white', borderRadius: 4, boxShadow: `0 10px 25px ${alpha(theme.palette.primary.main, 0.3)}` }}>
                                <Typography variant="h6" fontWeight={500}>Total Revenue (Selected Period)</Typography>
                                <Typography variant="h2" fontWeight={800}>Tshs {totalRevenue.toFixed(2)}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper sx={glossyPaper}>
                                <RevenuePieChart data={revenuePieData} />
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper sx={glossyPaper}>
                                <RevenueHistogram data={revenueHistogramData} />
                            </Paper>
                        </Grid>
                    </Grid>
                )}
            </Box>

            <PrimaryMetricsGrid cards={cards} />

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6} lg={4}>
                    <InventoryHealthCard inventoryLevel={inventoryLevel} totalProducts={totalProducts} inventoryPercent={inventoryPercent} />
                </Grid>
            </Grid>

            <ExtendedMetricsGrid extended={extended} />
            <ExtendedMetricsHistogram extended={extended} />

            {weeklySales.length > 0 ? (
                <OverallTrendChart weeklySales={weeklySales} />
            ) : (
                <Box sx={{ mb: 5, p: 3, borderRadius: 4, bgcolor: alpha(theme.palette.background.paper, 0.6), textAlign: 'center' }}>
                    <Typography color="textSecondary">Weekly sales trend data not available</Typography>
                </Box>
            )}

            <Box sx={{ mt: 5, mb: 3 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom>Top Purchases</Typography>
                <TopPurchasesVisual purchases={purchases} />
            </Box>
        </Container>
    );
};

export default WholeAnalytics;