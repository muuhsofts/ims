// src/pages/stock/StockMovementModal.js
import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Box, Chip, Typography, Grid, Card, CardContent,
    useMediaQuery, useTheme
} from '@mui/material';
import {
    SwapHoriz as TransferIcon,
    LocationOn as LocationIcon,
    Person as PersonIcon,
    Category as CategoryIcon,
    QrCode as ImeiIcon,
    Sell as SkuIcon,
    CalendarToday as CalendarIcon,
    Notes as NotesIcon,
    RequestPage as RequestIcon
} from '@mui/icons-material';

const movementTypeConfig = {
    transfer: { label: 'Transfer', color: 'primary' },
    purchase: { label: 'Purchase', color: 'success' },
    sale: { label: 'Sale', color: 'error' },
    return: { label: 'Return', color: 'warning' },
    adjustment: { label: 'Adjustment', color: 'info' },
    loss: { label: 'Loss', color: 'default' }
};

const InfoItem = ({ icon: Icon, label, value }) => (
    <Box display="flex" alignItems="center" gap={1} mb={1.5} flexWrap="wrap">
        <Icon fontSize="small" color="action" />
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 100 }}>
            {label}:
        </Typography>
        <Typography variant="body2" fontWeight="medium" sx={{ wordBreak: 'break-word' }}>
            {value || '-'}
        </Typography>
    </Box>
);

export default function StockMovementModal({ open, onClose, movement }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    if (!movement) return null;

    const config = movementTypeConfig[movement.movement_type] || movementTypeConfig.transfer;

    return (
        <Dialog
            open={open}
            onClose={() => onClose(false)}
            maxWidth="md"
            fullWidth
            fullScreen={fullScreen}
            PaperProps={{ sx: { borderRadius: { xs: 0, sm: 2 } } }}
        >
            <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <TransferIcon color={config.color} />
                        <Typography variant="h6">Stock Movement Details</Typography>
                        <Chip label={config.label} color={config.color} size="small" />
                    </Box>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ mt: { xs: 1, sm: 2 } }}>
                {/* Product Information */}
                <Card variant="outlined" sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={2}>
                            📦 Product Information
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <InfoItem icon={CategoryIcon} label="Product Name" value={movement.product_name} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <InfoItem icon={ImeiIcon} label="IMEI" value={movement.imei} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <InfoItem icon={SkuIcon} label="SKU" value={movement.sku} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <InfoItem icon={CategoryIcon} label="Brand" value={movement.brand} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <InfoItem icon={CategoryIcon} label="Model" value={movement.model} />
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {/* Movement Information */}
                <Card variant="outlined" sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={2}>
                            🔄 Movement Information
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <InfoItem icon={TransferIcon} label="Movement Type" value={movement.movement_type_description} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <InfoItem icon={LocationIcon} label="From" value={`${movement.from_name} (${movement.from_type})`} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <InfoItem icon={LocationIcon} label="To" value={`${movement.to_name} (${movement.to_type})`} />
                            </Grid>
                            {movement.request_id && (
                                <Grid item xs={12}>
                                    <InfoItem icon={RequestIcon} label="Request ID" value={movement.request_id} />
                                </Grid>
                            )}
                        </Grid>
                    </CardContent>
                </Card>

                {/* Additional Information */}
                <Card variant="outlined" sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={2}>
                            ℹ️ Additional Information
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <InfoItem icon={PersonIcon} label="Performed By" value={movement.performed_by} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <InfoItem icon={PersonIcon} label="Requester" value={movement.requester_name || movement.request_name} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <InfoItem icon={CalendarIcon} label="Date & Time" value={new Date(movement.created_at).toLocaleString()} />
                            </Grid>
                            <Grid item xs={12}>
                                <InfoItem icon={NotesIcon} label="Notes" value={movement.notes || 'No notes available'} />
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </DialogContent>

            <DialogActions sx={{ p: { xs: 2, sm: 3 }, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button onClick={() => onClose(false)} variant="contained" color="primary">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}