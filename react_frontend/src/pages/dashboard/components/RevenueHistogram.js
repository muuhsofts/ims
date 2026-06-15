import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Box, Typography } from '@mui/material';

const RevenueHistogram = ({ data }) => {
    if (!data || data.length === 0) {
        return <Typography color="textSecondary">No revenue timeline data</Typography>;
    }

    return (
        <Box sx={{ width: '100%', height: 400, mt: 2 }}>
            <Typography variant="h6" gutterBottom>Revenue Over Time</Typography>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bin" />
                    <YAxis tickFormatter={(value) => `Tshs ${value}`} />
                    <Tooltip formatter={(value) => `Tshs ${value.toFixed(2)}`} />
                    <Bar dataKey="revenue" fill="#8884d8" />
                </BarChart>
            </ResponsiveContainer>
        </Box>
    );
};

export default RevenueHistogram;