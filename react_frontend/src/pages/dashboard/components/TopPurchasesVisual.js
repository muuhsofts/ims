import { Card, Typography, Stack, Avatar, Chip, Box, LinearProgress, useTheme, alpha } from '@mui/material';
import { LocalShipping, PieChart as PieChartIcon } from '@mui/icons-material';
import ReactApexChart from 'react-apexcharts';

const TopPurchasesVisual = ({ purchases }) => {
    const theme = useTheme();
    if (!purchases || purchases.length === 0) return <Typography align="center">No purchase data</Typography>;

    const maxSubtotal = Math.max(...purchases.map(p => parseFloat(p.subtotal)));

    // Pie chart data
    const pieLabels = purchases.map(p => p.supplier_name);
    const pieSeries = purchases.map(p => parseFloat(p.subtotal));

    const pieOptions = {
        chart: { type: 'pie', toolbar: { show: false }, background: 'transparent' },
        labels: pieLabels,
        legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '12px', fontWeight: 500, labels: { colors: theme.palette.text.primary } },
        dataLabels: { enabled: true, formatter: (val, { seriesIndex }) => pieSeries[seriesIndex].toLocaleString() + ' TSh', style: { fontSize: '11px', fontWeight: 600 } },
        tooltip: { y: { formatter: (val) => val.toLocaleString() + ' TSh' } },
        colors: [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.success.main, theme.palette.warning.main, theme.palette.info.main, theme.palette.error.main],
        plotOptions: { pie: { expandOnClick: true, donut: { size: '0%' } } }
    };

    return (
        <>
            {/* Pie Chart Summary */}
            <Card sx={{ borderRadius: 4, p: 2, mb: 3, background: alpha(theme.palette.background.paper, 0.6), backdropFilter: 'blur(8px)' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PieChartIcon /> Purchase Distribution by Supplier (Subtotal)
                </Typography>
                <ReactApexChart options={pieOptions} series={pieSeries} type="pie" height={350} />
            </Card>

            {/* Existing purchase cards */}
            <Stack spacing={2} sx={{ p: 2 }}>
                {purchases.map((purchase, idx) => {
                    const subtotal = parseFloat(purchase.subtotal);
                    const percentage = (subtotal / maxSubtotal) * 100;
                    const barColor = idx === 0 ? theme.palette.success.main : theme.palette.primary.main;
                    return (
                        <Card key={purchase.purchase_id} elevation={0} sx={{ p: 2, borderRadius: 3, background: alpha(theme.palette.background.paper, 0.6), border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, transition: 'transform 0.2s', '&:hover': { transform: 'translateX(6px)', borderLeft: `4px solid ${barColor}` } }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
                                <Box sx={{ flex: 2 }}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(barColor, 0.2), color: barColor }}><LocalShipping fontSize="small" /></Avatar>
                                        <Typography variant="subtitle1" fontWeight={700}>{purchase.supplier_name}</Typography>
                                        <Chip label={`#${idx + 1}`} size="small" color={idx === 0 ? 'success' : 'default'} />
                                    </Stack>
                                    <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                            <strong>Qty:</strong> {purchase.quantity}
                                        </Box>
                                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                            <strong>Unit Price:</strong> {parseFloat(purchase.unit_price).toLocaleString()} TSh
                                        </Box>
                                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                            <strong>Status:</strong> <Chip label={purchase.status} size="small" color={purchase.status === 'completed' ? 'success' : 'warning'} />
                                        </Box>
                                    </Box>
                                </Box>
                                <Box sx={{ flex: 1, textAlign: 'right' }}>
                                    <Typography variant="h6" fontWeight={800} color={barColor}>{subtotal.toLocaleString()} TSh</Typography>
                                    <Typography variant="caption">Subtotal</Typography>
                                </Box>
                            </Stack>
                            <LinearProgress variant="determinate" value={percentage} sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: alpha(theme.palette.divider, 0.3), '& .MuiLinearProgress-bar': { bgcolor: barColor } }} />
                        </Card>
                    );
                })}
            </Stack>
        </>
    );
};

export default TopPurchasesVisual;