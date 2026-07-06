// src/pages/agents/AgentsList.js
import React, { useState, useEffect } from 'react';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Menu, MenuItem, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TableSortLabel, TextField, Typography,
    useTheme, useMediaQuery, Card, CardContent, Divider, CircularProgress
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Edit as EditIcon,
    Delete as DeleteIcon, VerifiedUser as VerifiedIcon, Block as BlockIcon,
    LockOpen as LockOpenIcon, Refresh as RefreshIcon, Search as SearchIcon,
    Person as PersonIcon, Email as EmailOutlinedIcon, Phone as PhoneIcon,
    Store as StoreIcon, CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

import AgentFormModal from './AgentFormModal';
import AgentVerificationModal from './AgentVerificationModal';
import { showSnackbar } from "utils/snackbar";
import { usePermission } from "@/hooks/usePermission";
import { useAgents } from "context/AgentContext";

const headCells = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'Phone' },
    { id: 'cc', label: 'Collection Center' },
    { id: 'status', label: 'Status' },
    { id: 'email_verified', label: 'Verified' },
    { id: 'created_at', label: 'Created At' },
    { id: 'actions', label: 'Actions', disableSort: true },
];

export default function AgentsList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showTableView = useMediaQuery(theme.breakpoints.up('md'));

    const { items: agents, loading, fetchAll, delete: deleteAgent, update } = useAgents();
    const { hasPermission } = usePermission();

    const [openModal, setOpenModal] = useState(false);
    const [editingAgent, setEditingAgent] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [verifyModalOpen, setVerifyModalOpen] = useState(false);
    const [agentToVerify, setAgentToVerify] = useState(null);

    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        action: null,
    });

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [ccFilter, setCcFilter] = useState('');
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('created_at');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Permissions
    const canView = hasPermission('sales_agent.view');
    const canCreate = hasPermission('sales_agent.create');
    const canEdit = hasPermission('sales_agent.edit');
    const canDelete = hasPermission('sales_agent.delete');
    const canActivate = hasPermission('sales_agent.activate');
    const canDeactivate = hasPermission('sales_agent.deactivate');
    const canSuspend = hasPermission('sales_agent.suspend');

    // Fetch agents whenever filters change
    useEffect(() => {
        fetchAll({
            page: page + 1,
            per_page: rowsPerPage,
            search,
            status: statusFilter,
            cc_id: ccFilter,
        });
    }, [page, rowsPerPage, search, statusFilter, ccFilter]);

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleMenuOpen = (event, agent) => {
        setSelectedAgent(agent);
        setActionMenu(event.currentTarget);
    };

    const handleMenuClose = () => {
        setActionMenu(null);
    };

    const openConfirmDialog = (title, message, actionFn) => {
        setConfirmDialog({ open: true, title, message, action: actionFn });
    };

    const handleAction = async (actionType) => {
        if (!selectedAgent) return;
        handleMenuClose();

        switch (actionType) {
            case 'edit':
                setEditingAgent(selectedAgent);
                setOpenModal(true);
                break;
            case 'verify':
                setAgentToVerify(selectedAgent);
                setVerifyModalOpen(true);
                break;
            case 'activate':
                try {
                    await update(selectedAgent.id, { status: 'active' });
                    showSnackbar({ type: 'success', message: 'Agent activated' });
                    fetchAll();
                } catch (err) {
                    showSnackbar({ type: 'error', message: 'Failed to activate agent' });
                }
                break;
            case 'deactivate':
                openConfirmDialog(
                    'Deactivate Agent',
                    `Are you sure you want to deactivate ${selectedAgent.name}?`,
                    () => update(selectedAgent.id, { status: 'inactive' })
                );
                break;
            case 'suspend':
                openConfirmDialog(
                    'Suspend Agent',
                    `Are you sure you want to suspend ${selectedAgent.name}?`,
                    () => update(selectedAgent.id, { status: 'suspended' })
                );
                break;
            case 'delete':
                openConfirmDialog(
                    'Delete Agent',
                    `Are you sure you want to delete ${selectedAgent.name}?`,
                    () => deleteAgent(selectedAgent.id)
                );
                break;
            default:
                break;
        }
    };

    const handleConfirm = async () => {
        if (!confirmDialog.action) return;
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
            await confirmDialog.action();
            showSnackbar({ type: 'success', message: 'Action completed' });
            fetchAll();
        } catch (err) {
            showSnackbar({ type: 'error', message: 'Action failed' });
        }
    };

    const handleVerifySuccess = () => {
        fetchAll();
        showSnackbar({ type: 'success', message: 'Agent verified successfully!' });
    };

    if (!canView) {
        return (
            <Box sx={{ p: 2 }}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="error">You do not have permission to view sales agents.</Typography>
                </Paper>
            </Box>
        );
    }

    const currentData = Array.isArray(agents) ? agents : [];
    const totalCount = agents.length;

    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : '-';

    // Mobile card component
    const AgentCard = ({ agent }) => {
        const getStatusColor = (status) => {
            switch (status) {
                case 'active': return 'success';
                case 'suspended': return 'error';
                case 'inactive': return 'warning';
                default: return 'default';
            }
        };

        return (
            <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon fontSize="small" color="action" />
                            <Typography variant="body1" fontWeight="medium">
                                {agent.name}
                            </Typography>
                        </Box>
                        <IconButton size="small" onClick={(e) => handleMenuOpen(e, agent)}>
                            <MoreVertIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <EmailOutlinedIcon fontSize="small" color="action" />
                        <Typography variant="body2">{agent.email}</Typography>
                    </Box>

                    {agent.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <PhoneIcon fontSize="small" color="action" />
                            <Typography variant="body2">{agent.phone}</Typography>
                        </Box>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <StoreIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                            {agent.collection_center?.cc_name || 'Unassigned'}
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip
                                label={agent.status}
                                color={getStatusColor(agent.status)}
                                size="small"
                            />
                            {agent.email_verified_at ? (
                                <Chip label="Verified" color="success" size="small" icon={<VerifiedIcon />} />
                            ) : (
                                <Chip label="Not Verified" size="small" />
                            )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                            Created: {formatDate(agent.created_at)}
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    };

    return (
        <Box sx={{ width: '100%', p: { xs: 1, sm: 2 }, m: 0 }}>
            <Paper sx={{ width: '100%', borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden', boxShadow: { xs: 0, sm: 1 } }}>
                {/* Header */}
                <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                        <Typography variant="h5" fontWeight="600" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                            Sales Agents
                        </Typography>
                        {canCreate && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => { setEditingAgent(null); setOpenModal(true); }}
                                size={isMobile ? "small" : "medium"}
                                sx={{ borderRadius: 2 }}
                            >
                                Add Agent
                            </Button>
                        )}
                    </Box>

                    <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                        <TextField
                            label="Search"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                            sx={{ minWidth: { xs: '100%', sm: 250 }, flexGrow: { xs: 1, sm: 0 } }}
                        />
                        <TextField
                            select
                            label="Status"
                            size="small"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            sx={{ minWidth: { xs: '100%', sm: 140 } }}
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="suspended">Suspended</MenuItem>
                        </TextField>
                        <TextField
                            select
                            label="Collection Center"
                            size="small"
                            value={ccFilter}
                            onChange={(e) => setCcFilter(e.target.value)}
                            sx={{ minWidth: { xs: '100%', sm: 180 } }}
                        >
                            <MenuItem value="">All Centers</MenuItem>
                        </TextField>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={() => fetchAll()}
                            size={isMobile ? "small" : "medium"}
                        >
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {/* Table / Cards */}
                {showTableView ? (
                    <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                        <Table sx={{ width: '100%', minWidth: 800 }}>
                            <TableHead>
                                <TableRow>
                                    {headCells.map((cell) => (
                                        <TableCell key={cell.id} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                            {!cell.disableSort ? (
                                                <TableSortLabel
                                                    active={orderBy === cell.id}
                                                    direction={orderBy === cell.id ? order : 'asc'}
                                                    onClick={() => handleRequestSort(cell.id)}
                                                >
                                                    {cell.label}
                                                </TableSortLabel>
                                            ) : cell.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={headCells.length} align="center">
                                            <CircularProgress size={32} sx={{ my: 3 }} />
                                        </TableCell>
                                    </TableRow>
                                ) : currentData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={headCells.length} align="center">
                                            <Typography sx={{ py: 3 }} color="text.secondary">No agents found</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    currentData.map((agent) => (
                                        <TableRow key={agent.id} hover>
                                            <TableCell>{agent.name}</TableCell>
                                            <TableCell>{agent.email}</TableCell>
                                            <TableCell>{agent.phone || '-'}</TableCell>
                                            <TableCell>{agent.collection_center?.cc_name || '-'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={agent.status}
                                                    color={agent.status === 'active' ? 'success' : agent.status === 'suspended' ? 'error' : 'default'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {agent.email_verified_at ? (
                                                    <Chip label="Verified" color="success" size="small" icon={<VerifiedIcon />} />
                                                ) : (
                                                    <Chip label="Not Verified" size="small" />
                                                )}
                                            </TableCell>
                                            <TableCell>{formatDate(agent.created_at)}</TableCell>
                                            <TableCell align="center">
                                                <IconButton size="small" onClick={(e) => handleMenuOpen(e, agent)}>
                                                    <MoreVertIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}>
                                <CircularProgress />
                            </Box>
                        ) : currentData.length === 0 ? (
                            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                                <Typography color="text.secondary">No agents found</Typography>
                            </Paper>
                        ) : (
                            currentData.map((agent) => (
                                <AgentCard key={agent.id} agent={agent} />
                            ))
                        )}
                    </Box>
                )}

                {/* Pagination */}
                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: { xs: 1, sm: 0 } }}>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={totalCount}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={(e, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        sx={{
                            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            },
                            '.MuiTablePagination-actions': { ml: { xs: 0, sm: 1 } }
                        }}
                    />
                </Box>
            </Paper>

            {/* Action Menu */}
            <Menu
                anchorEl={actionMenu}
                open={Boolean(actionMenu)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                {canEdit && (
                    <MenuItem onClick={() => handleAction('edit')}>
                        <EditIcon sx={{ mr: 1, fontSize: 20 }} /> Edit
                    </MenuItem>
                )}
                {!selectedAgent?.email_verified_at && (
                    <MenuItem onClick={() => handleAction('verify')}>
                        <CheckCircleIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} /> Verify
                    </MenuItem>
                )}
                {canActivate && selectedAgent?.status !== 'active' && (
                    <MenuItem onClick={() => handleAction('activate')}>
                        <VerifiedIcon sx={{ mr: 1, color: 'success.main', fontSize: 20 }} /> Activate
                    </MenuItem>
                )}
                {canDeactivate && selectedAgent?.status === 'active' && (
                    <MenuItem onClick={() => handleAction('deactivate')}>
                        <BlockIcon sx={{ mr: 1, color: 'warning.main', fontSize: 20 }} /> Deactivate
                    </MenuItem>
                )}
                {canSuspend && selectedAgent?.status !== 'suspended' && (
                    <MenuItem onClick={() => handleAction('suspend')}>
                        <LockOpenIcon sx={{ mr: 1, color: 'error.main', fontSize: 20 }} /> Suspend
                    </MenuItem>
                )}
                {canDelete && (
                    <MenuItem onClick={() => handleAction('delete')} sx={{ color: 'error.main' }}>
                        <DeleteIcon sx={{ mr: 1, fontSize: 20 }} /> Delete
                    </MenuItem>
                )}
            </Menu>

            <AgentFormModal
                open={openModal}
                onClose={() => { setOpenModal(false); setEditingAgent(null); fetchAll(); }}
                agent={editingAgent}
            />

            <AgentVerificationModal
                open={verifyModalOpen}
                onClose={() => {
                    setVerifyModalOpen(false);
                    setAgentToVerify(null);
                }}
                agent={agentToVerify}
                onVerified={handleVerifySuccess}
            />

            <Dialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                fullWidth
                maxWidth="xs"
                PaperProps={{ sx: { m: { xs: 2, sm: 0 }, borderRadius: { xs: 2, sm: 1 } } }}
            >
                <DialogTitle sx={{ pb: 1 }}>{confirmDialog.title}</DialogTitle>
                <DialogContent>
                    <Typography>{confirmDialog.message}</Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button onClick={handleConfirm} color="error" variant="contained">Confirm</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}