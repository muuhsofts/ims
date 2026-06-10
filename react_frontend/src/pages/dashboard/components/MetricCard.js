import { Card, CardContent, Typography, Box, Avatar, Stack, useTheme, alpha } from '@mui/material';

const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
};

const MetricCard = ({ title, value, icon: Icon, color }) => {
    const theme = useTheme();
    return (
        <Card elevation={0} sx={{
            borderRadius: 4,
            backdropFilter: 'blur(12px)',
            backgroundColor: alpha(theme.palette.background.paper, 0.75),
            border: `1px solid ${alpha(color, 0.2)}`,
            transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
            '&:hover': { transform: 'translateY(-6px)', boxShadow: `0 20px 35px -12px ${alpha(color, 0.4)}`, borderColor: alpha(color, 0.5) },
            position: 'relative',
            overflow: 'hidden',
            '&::after': { content: '""', position: 'absolute', bottom: 0, left: 0, width: '100%', height: '3px', background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.2)})` },
        }}>
            <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 500, color: alpha(theme.palette.text.secondary, 0.8) }}>
                            {title}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, letterSpacing: '-0.02em' }}>{formatNumber(value)}</Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: alpha(color, 0.15), width: 48, height: 48, color: color, backdropFilter: 'blur(4px)' }}>
                        <Icon sx={{ fontSize: 26 }} />
                    </Avatar>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default MetricCard;