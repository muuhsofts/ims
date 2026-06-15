import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Typography, useTheme } from '@mui/material';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6B6B'];

const RevenuePieChart = ({ data }) => {
    const theme = useTheme();
    if (!data || data.length === 0) {
        return <Typography color="textSecondary">No revenue data by category</Typography>;
    }

    return (
        <Box sx={{ width: '100%', height: 400, mt: 2 }}>
            <Typography variant="h6" gutterBottom>Revenue by Product Category</Typography>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="revenue"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        fill="#8884d8"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => `Tshs ${value.toFixed(2)}`} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </Box>
    );
};

export default RevenuePieChart;