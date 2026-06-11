// src/pages/dashboard/AnalyticsDashboard.js
import React from 'react';
import { usePermission } from 'hooks/usePermission';
import WholeAnalytics from './components/WholeAnalytics';
import AgentAnalyticsDashboard from './components/AgentAnalyticsDashboard';
import BranchOwnerAnalyticsDashboard from './components/BranchOwnerAnalyticsDashboard';
import { Box, Typography } from '@mui/material';

function AccessDenied() {
    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
            <Typography variant="h4" color="error">Access Denied</Typography>
        </Box>
    );
}

export default function AnalyticsDashboard() {
    const { hasPermission } = usePermission();

    if (hasPermission('dashboard.view')) {
        return <WholeAnalytics />;
    }
    if (hasPermission('agent-dashboard.view')) {
        return <AgentAnalyticsDashboard />;
    }
    if (hasPermission('cc_center_dashboard.view')) {
        return <BranchOwnerAnalyticsDashboard />;
    }
    return <AccessDenied />;
}