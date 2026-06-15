import React, { useState } from 'react';
import { Container, Grid, Box, Typography, CircularProgress, Paper, alpha, useTheme } from '@mui/material';
import { useRevenueAnalytics } from 'hooks/useRevenueAnalytics';
import RevenuePieChart from './RevenuePieChart';
import RevenueHistogram from './RevenueHistogram';
import DashboardFilters from './DashboardFilters';

const RevenueAnalyticsDashboard = () => {
    const theme = useTheme();
    const [period, setPeriod] = useState('monthly');
    const [date, setDate] = useState(null);

    const { data, loading, error, refetch } = useRevenueAnalytics(period, date);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading revenue analytics…</Typography>
            </Box>
        );
    }

    if (error || !data) {
        return (
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Typography variant="h4" fontWeight={800} gutterBottom>
                    Revenue Analytics
                </Typography>
                <Box sx={{ p: 4, textAlign: 'center', bgcolor: alpha(theme.palette.error.main, 0.08), borderRadius: 4 }}>
                    <Typography variant="h6" color="error">{error || 'No data'}</Typography>
                </Box>
            </Container>
        );
    }

    const { total_revenue, revenue_pie_chart, revenue_histogram } = data;

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Typography variant="h4" fontWeight={800} gutterBottom>
                Revenue Analytics
            </Typography>

            <DashboardFilters period={period} setPeriod={setPeriod} date={date} setDate={setDate} refetch={refetch} />

            {/* Total Revenue Card - Tshs */}
            <Paper sx={{ p: 3, mb: 4, textAlign: 'center', bgcolor: theme.palette.primary.main, color: 'white' }}>
                <Typography variant="h6">Total Revenue</Typography>
                <Typography variant="h3">Tshs {total_revenue.toFixed(2)}</Typography>
            </Paper>

            {/* Charts */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <RevenuePieChart data={revenue_pie_chart} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <RevenueHistogram data={revenue_histogram} />
                </Grid>
            </Grid>
        </Container>
    );
};

export default RevenueAnalyticsDashboard;