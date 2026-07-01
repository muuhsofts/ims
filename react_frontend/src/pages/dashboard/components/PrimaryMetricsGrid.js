import { Grid } from '@mui/material';
import {
    PeopleAlt, Storefront, LocalShipping, Receipt,
    ShoppingCart, Category, Inventory
} from '@mui/icons-material';
import MetricCard from './MetricCard';

const PrimaryMetricsGrid = ({ cards }) => {
    const metrics = [
        { title: 'Total Users', value: cards.total_users || 0, icon: PeopleAlt, color: '#4361ee' },
        { title: 'Customers', value: cards.total_customers || 0, icon: Storefront, color: '#f72585' },
        { title: 'Suppliers', value: cards.total_suppliers || 0, icon: LocalShipping, color: '#4cc9f0' },
        {
            title: 'Purchases',
            value: cards.total_purchases || cards.purchases_count || 0,
            icon: Receipt,
            color: '#f8961e'
        },
        { title: 'Products', value: cards.total_products || 0, icon: ShoppingCart, color: '#4caf50' },
        { title: 'Categories', value: cards.total_categories || 0, icon: Category, color: '#9c27b0' },
        { title: 'Inventory Items', value: cards.inventory_level || 0, icon: Inventory, color: '#ff5722' },
    ];

    return (
        <Grid container spacing={3} sx={{ mb: 5 }}>
            {metrics.map((metric, idx) => (
                <Grid item xs={12} sm={6} md={3} lg={2.4} key={idx}>
                    <MetricCard {...metric} />
                </Grid>
            ))}
        </Grid>
    );
};

export default PrimaryMetricsGrid;