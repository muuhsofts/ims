import { Card, Typography, Stack, useTheme, alpha } from '@mui/material';
import { ShowChart } from '@mui/icons-material';
import ReactApexChart from 'react-apexcharts';

const OverallTrendChart = ({ weeklySales }) => {
    const theme = useTheme();
    if (!weeklySales || weeklySales.length === 0) return null;
    const series = [{ name: 'Sales Volume', data: weeklySales.map(w => w.sales_count) }];
    const options = {
        chart: { type: 'line', toolbar: { show: false }, background: 'transparent', animations: { enabled: true, speed: 800 }, dropShadow: { enabled: true, top: 2, left: 0, blur: 6, color: theme.palette.primary.main, opacity: 0.2 } },
        stroke: { curve: 'smooth', width: 4, colors: [theme.palette.primary.main] },
        fill: { type: 'gradient', gradient: { shade: 'dark', gradientToColors: [alpha(theme.palette.primary.main, 0.3)], shadeIntensity: 0.5, opacityFrom: 0.5, opacityTo: 0.1 } },
        markers: { size: 5, strokeWidth: 2, strokeColors: '#fff', hover: { size: 7 } },
        xaxis: { categories: weeklySales.map(w => w.day), title: { text: 'Day', style: { fontWeight: 600 } } },
        yaxis: { title: { text: 'Number of Sales', style: { fontWeight: 600 } } },
        tooltip: { y: { formatter: val => `${val} sales` }, theme: 'dark' },
        grid: { borderColor: alpha(theme.palette.divider, 0.2), strokeDashArray: 4 },
    };
    return (
        <Card sx={{ borderRadius: 4, p: 2, background: alpha(theme.palette.background.paper, 0.6), backdropFilter: 'blur(8px)' }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <ShowChart sx={{ color: theme.palette.primary.main }} />
                <Typography variant="h6" fontWeight={700}>Overall Performance Trend (Last 7 Days)</Typography>
            </Stack>
            <ReactApexChart options={options} series={series} type="line" height={320} />
        </Card>
    );
};

export default OverallTrendChart;