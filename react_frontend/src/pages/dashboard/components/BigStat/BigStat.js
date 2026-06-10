// src/pages/dashboard/Dashboard.js
import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Box,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

import useStyles from './styles';
import {dashboardService} from "services/dashboardService";
import {showSnackbar} from "utils/snackbar"; // if you have custom styles

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await dashboardService.mainStats();
        if (res.data.success) {
          setStats(res.data.data);
        } else {
          setError(res.data.message);
          showSnackbar({ type: 'error', message: res.data.message });
        }
      } catch (err) {
        setError(err.message);
        showSnackbar({ type: 'error', message: 'Failed to load dashboard data' });
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress />
        </Box>
    );
  }

  if (error) {
    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <Typography color="error">Error loading dashboard: {error}</Typography>
        </Box>
    );
  }

  const { cards, today_top_sales, user_stats, hourly_sales_today, revenue_last_7_days, top_5_products_today } = stats;

  // Format data for charts
  const hourlyChartData = hourly_sales_today?.map(item => ({
    hour: `${item.hour}:00`,
    sales: item.sales_count,
  })) || [];

  const revenueChartData = revenue_last_7_days?.map(item => ({
    date: item.date,
    revenue: item.revenue,
  })) || [];

  return (
      <Grid container spacing={3}>
        {/* Cards row */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Products</Typography>
              <Typography variant="h4">{cards.total_products}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Customers</Typography>
              <Typography variant="h4">{cards.total_customers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Users</Typography>
              <Typography variant="h4">{cards.total_users}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Sales Today</Typography>
              <Typography variant="h4">{cards.total_sales_today}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Revenue Today</Typography>
              <Typography variant="h4">${cards.total_revenue_today.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Avg Order Value</Typography>
              <Typography variant="h4">${cards.average_order_value_today.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Top 10 Sales Today */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Today's Top 10 Sales</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Method</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {today_top_sales?.map((sale, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{sale.customer_name}</TableCell>
                        <TableCell>{sale.customer_phone}</TableCell>
                        <TableCell align="right">${sale.total_amount.toFixed(2)}</TableCell>
                        <TableCell>{sale.payment_method}</TableCell>
                      </TableRow>
                  ))}
                  {(!today_top_sales || today_top_sales.length === 0) && (
                      <TableRow><TableCell colSpan={4} align="center">No sales today</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* User Statistics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>User Statistics</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2">Total: {user_stats.total}</Typography>
                <Typography variant="body2">Active: {user_stats.active}</Typography>
                <Typography variant="body2">Inactive: {user_stats.inactive}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">Pending: {user_stats.pending}</Typography>
                <Typography variant="body2">Suspended: {user_stats.suspended}</Typography>
              </Grid>
            </Grid>
            <Typography variant="subtitle2" sx={{ mt: 1 }}>By Role:</Typography>
            <Grid container spacing={1}>
              {Object.entries(user_stats.by_role || {}).map(([role, count]) => (
                  <Grid item key={role}>
                    <Typography variant="body2" display="inline" sx={{ bgcolor: '#f5f5f5', p: 0.5, borderRadius: 1 }}>
                      {role}: {count}
                    </Typography>
                  </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Hourly Sales Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Hourly Sales (Today)</Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Last 7 Days Revenue Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Revenue Last 7 Days</Typography>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value}`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top 5 Products Today */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Top 5 Products Sold Today</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product IMEI</TableCell>
                    <TableCell>Color</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {top_5_products_today?.map((prod, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{prod.imei}</TableCell>
                        <TableCell>{prod.color}</TableCell>
                        <TableCell align="right">{prod.quantity_sold}</TableCell>
                        <TableCell align="right">${prod.revenue.toFixed(2)}</TableCell>
                      </TableRow>
                  ))}
                  {(!top_5_products_today || top_5_products_today.length === 0) && (
                      <TableRow><TableCell colSpan={4} align="center">No sales today</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
  );
}