import { Card, Typography, Box, useTheme, alpha } from '@mui/material';
import { BarChart } from '@mui/icons-material';
import ReactApexChart from 'react-apexcharts';

const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
};

const ExtendedMetricsHistogram = ({ extended }) => {
    const theme = useTheme();

    const categories = [
        'Agent Stock', 'CC Stock', 'Distributed Qty',
        'Pending Dist.', 'Stock Movements', 'Transfer Req.'
    ];
    const seriesData = [
        extended.agent_inventory?.total_quantity || 0,
        extended.collection_center_inventory?.total_quantity || 0,
        extended.stock_distributions?.total_quantity || 0,
        extended.stock_distributions?.pending_count || 0,
        extended.stock_movements?.total_movements || 0,
        extended.transfer_requests?.total_requests || 0,
    ];

    const options = {
        chart: { type: 'bar', toolbar: { show: false }, background: 'transparent', animations: { enabled: true, speed: 800 } },
        plotOptions: { bar: { borderRadius: 8, horizontal: false, columnWidth: '60%', dataLabels: { position: 'top' } } },
        dataLabels: { enabled: true, offsetY: -20, style: { fontSize: '12px', fontWeight: 600, colors: [theme.palette.text.primary] }, formatter: (val) => formatNumber(val) },
        xaxis: { categories, title: { text: 'Metric', style: { fontWeight: 600 } }, labels: { rotate: -45, style: { fontSize: '11px' } } },
        yaxis: { title: { text: 'Value', style: { fontWeight: 600 } }, labels: { formatter: (val) => formatNumber(val) } },
        colors: [theme.palette.primary.main],
        tooltip: { y: { formatter: (val) => formatNumber(val) } },
        grid: { borderColor: alpha(theme.palette.divider, 0.2) },
    };

    const series = [{ name: 'Count', data: seriesData }];

    return (
        <Card sx={{ borderRadius: 4, p: 2, mb: 5, background: alpha(theme.palette.background.paper, 0.6), backdropFilter: 'blur(8px)' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChart /> Operational Metrics Histogram
            </Typography>
            <ReactApexChart options={options} series={series} type="bar" height={350} />
        </Card>
    );
};

export default ExtendedMetricsHistogram;