// WholeAnalytics.js
import { useState } from 'react';
import { Container, Grid, Box, Typography, CircularProgress, alpha, useTheme } from '@mui/material';
import DashboardFilters from './DashboardFilters';
import PrimaryMetricsGrid from './PrimaryMetricsGrid';
import ExtendedMetricsGrid from './ExtendedMetricsGrid';
import ExtendedMetricsHistogram from './ExtendedMetricsHistogram';
import InventoryHealthCard from './InventoryHealthCard';
import OverallTrendChart from './OverallTrendChart';
import TopPurchasesVisual from './TopPurchasesVisual';
import { useDashboardAnalytics } from 'hooks/useDashboardAnalytics';

// Helper to format date based on period for API
const formatApiDate = (period, dateObj) => {
    if (!dateObj || !period) return null;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    switch (period) {
        case 'daily':
            return `${year}-${month}-${day}`;
        case 'monthly':
            return `${year}-${month}`;
        case 'yearly':
            return `${year}`;
        default:
            return null;
    }
};

const WholeAnalytics = () => {
    const theme = useTheme();
    const [period, setPeriod] = useState('');
    const [date, setDate] = useState(null);

    // Format date for API (backend expects YYYY-MM-DD, YYYY-MM, or YYYY)
    const apiDate = formatApiDate(period, date);

    // Use the real backend hook – auto‑refreshes every 5 minutes
    const { data, loading, error, refetch } = useDashboardAnalytics(300000, period, apiDate);

    // Handle loading state
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading dashboard data…</Typography>
            </Box>
        );
    }

    // Handle error or missing data
    if (error || !data) {
        return (
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Typography variant="h4" fontWeight={800} gutterBottom>
                    Whole Analytics Dashboard
                </Typography>
                <Box
                    sx={{
                        p: 4,
                        mt: 3,
                        borderRadius: 4,
                        textAlign: 'center',
                        bgcolor: alpha(theme.palette.error.main, 0.08),
                        border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                    }}
                >
                    <Typography variant="h6" color="error">
                        {error || 'Data not found from backend'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        Please check your connection or try again later.
                    </Typography>
                </Box>
            </Container>
        );
    }

    // Extract real backend data (controller returns cards, extended_analytics, top_5_purchases, etc.)
    const cards = data.cards || {};
    const extended = data.extended_analytics || {};
    const purchases = data.top_5_purchases || [];

    // Inventory health values
    const inventoryLevel = cards.inventory_level || 0;
    const totalProducts = cards.total_products || 0;
    const inventoryPercent = totalProducts > 0 ? (inventoryLevel / totalProducts) * 100 : 0;

    // Weekly sales – backend does not provide it yet; we pass empty array (OverallTrendChart will show nothing)
    const weeklySales = data.weekly_sales || [];   // will be ignored if not present

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Typography variant="h4" fontWeight={800} gutterBottom>
                Whole Analytics Dashboard
            </Typography>

            {/* Filters */}
            <DashboardFilters
                period={period}
                setPeriod={setPeriod}
                date={date}
                setDate={setDate}
                refetch={refetch}
            />

            {/* Primary Metrics Grid (uses cards from backend) */}
            <PrimaryMetricsGrid cards={cards} />

            {/* Inventory Health Card */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6} lg={4}>
                    <InventoryHealthCard
                        inventoryLevel={inventoryLevel}
                        totalProducts={totalProducts}
                        inventoryPercent={inventoryPercent}
                    />
                </Grid>
            </Grid>

            {/* Extended Metrics Grid (uses extended_analytics from backend) */}
            <ExtendedMetricsGrid extended={extended} />

            {/* Extended Metrics Histogram (same data) */}
            <ExtendedMetricsHistogram extended={extended} />

            {/* Overall Trend Chart – only shows if backend provides weekly_sales */}
            {weeklySales.length > 0 ? (
                <OverallTrendChart weeklySales={weeklySales} />
            ) : (
                <Box sx={{ mb: 5, p: 3, borderRadius: 4, bgcolor: alpha(theme.palette.background.paper, 0.6), textAlign: 'center' }}>
                    <Typography color="textSecondary">Weekly sales trend data not available</Typography>
                </Box>
            )}

            {/* Top Purchases Visual */}
            <Box sx={{ mt: 5, mb: 3 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                    Top Purchases
                </Typography>
                <TopPurchasesVisual purchases={purchases} />
            </Box>
        </Container>
    );
};

export default WholeAnalytics;