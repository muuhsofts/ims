import { Grid } from '@mui/material';
import { Inventory, Warehouse, LocalShipping, AssignmentTurnedIn, SwapHoriz, RequestPage } from '@mui/icons-material';
import MetricCard from './MetricCard';

const ExtendedMetricsGrid = ({ extended }) => {
    const metrics = [
        { title: 'Total Agent Stock (Qty)', value: extended.agent_inventory?.total_quantity || 0, icon: Inventory, color: '#ff9800' },
        { title: 'Total CC Stock (Qty)', value: extended.collection_center_inventory?.total_quantity || 0, icon: Warehouse, color: '#00bcd4' },
        { title: 'Total Distributed Qty', value: extended.stock_distributions?.total_quantity || 0, icon: LocalShipping, color: '#8bc34a' },
        { title: 'Pending Distributions', value: extended.stock_distributions?.pending_count || 0, icon: AssignmentTurnedIn, color: '#ffc107' },
        { title: 'Total Stock Movements', value: extended.stock_movements?.total_movements || 0, icon: SwapHoriz, color: '#9c27b0' },
        { title: 'Total Transfer Requests', value: extended.transfer_requests?.total_requests || 0, icon: RequestPage, color: '#e91e63' },
    ];
    return (
        <Grid container spacing={3} sx={{ mb: 3 }}>
            {metrics.map((metric, idx) => (
                <Grid item xs={12} sm={6} md={4} lg={2} key={idx}>
                    <MetricCard {...metric} />
                </Grid>
            ))}
        </Grid>
    );
};

export default ExtendedMetricsGrid;