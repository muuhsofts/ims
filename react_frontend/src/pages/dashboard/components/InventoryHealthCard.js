import { Card, Typography, Box, Stack, LinearProgress, useTheme, alpha } from '@mui/material';
import ReactApexChart from 'react-apexcharts';

const InventoryHealthCard = ({ inventoryLevel, totalProducts, inventoryPercent }) => {
    const theme = useTheme();
    const radialOptions = {
        series: [inventoryPercent],
        options: {
            chart: { type: 'radialBar', height: 140, sparkline: { enabled: true } },
            plotOptions: { radialBar: { hollow: { size: '55%' }, track: { background: alpha(theme.palette.divider, 0.2) }, dataLabels: { name: { show: false }, value: { fontSize: '20px', fontWeight: 700, color: theme.palette.text.primary, formatter: (val) => `${val.toFixed(0)}%` } } } },
            colors: [inventoryPercent > 70 ? theme.palette.success.main : inventoryPercent > 30 ? theme.palette.warning.main : theme.palette.error.main],
        },
    };
    return (
        <Card sx={{ borderRadius: 4, p: 2, width: '100%', background: alpha(theme.palette.background.paper, 0.6), backdropFilter: 'blur(8px)' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Box>
                    <Typography variant="h6" fontWeight={700}>Inventory Health</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>{inventoryLevel} of {totalProducts} products in stock</Typography>
                    <LinearProgress variant="determinate" value={inventoryPercent} sx={{ height: 6, borderRadius: 3, mt: 1.5, width: '90%', bgcolor: alpha(theme.palette.divider, 0.3) }} />
                </Box>
                <Box sx={{ width: 110 }}><ReactApexChart options={radialOptions.options} series={radialOptions.series} type="radialBar" height={110} /></Box>
            </Stack>
        </Card>
    );
};

export default InventoryHealthCard;