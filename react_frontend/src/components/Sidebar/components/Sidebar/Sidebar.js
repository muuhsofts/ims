// src/components/Sidebar/Sidebar.js
import React from 'react';
import {
    Drawer, List, ListItem, ListItemIcon, ListItemText,
    Collapse, Toolbar, Box, Typography
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePermission } from 'hooks/usePermission';
import { useAuth } from 'hooks/useAuth';
import {getSidebarStructure} from "components/Sidebar/SidebarStructure";

const drawerWidth = 280;

export default function Sidebar({ mobileOpen, onClose }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { hasPermission } = usePermission();
    const { roles } = useAuth();

    // ✅ Administrator check using the roles array from AuthContext
    const isAdmin = roles?.includes('ADMINISTRATOR') || false;

    const sidebarItems = getSidebarStructure(hasPermission, isAdmin);
    const [openMenus, setOpenMenus] = React.useState({});

    const handleToggle = (id) => {
        setOpenMenus((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleNavigate = (link) => {
        navigate(link);
        if (mobileOpen) onClose();
    };

    const renderMenu = (items, depth = 0) => {
        return items.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isOpen = openMenus[item.id] || false;
            const isActive = location.pathname === item.link ||
                (item.children && item.children.some(child => child.link === location.pathname));

            return (
                <React.Fragment key={item.id}>
                    <ListItem
                        button
                        onClick={() => (hasChildren ? handleToggle(item.id) : handleNavigate(item.link))}
                        sx={{
                            pl: depth * 2 + 2,
                            backgroundColor: isActive ? 'action.selected' : 'transparent',
                            '&:hover': { backgroundColor: 'action.hover' },
                        }}
                    >
                        {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
                        <ListItemText primary={item.label} />
                        {hasChildren && (isOpen ? <ExpandLess /> : <ExpandMore />)}
                    </ListItem>
                    {hasChildren && (
                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                            <List component="div" disablePadding>
                                {item.children.map((child) => {
                                    const childHasChildren = child.children && child.children.length > 0;
                                    if (childHasChildren) {
                                        return renderMenu([child], depth + 1);
                                    }
                                    const childActive = location.pathname === child.link;
                                    return (
                                        <ListItem
                                            key={child.label}
                                            button
                                            onClick={() => handleNavigate(child.link)}
                                            sx={{ pl: (depth + 1) * 2 + 2 }}
                                            selected={childActive}
                                        >
                                            {child.icon && <ListItemIcon>{child.icon}</ListItemIcon>}
                                            <ListItemText primary={child.label} />
                                        </ListItem>
                                    );
                                })}
                            </List>
                        </Collapse>
                    )}
                </React.Fragment>
            );
        });
    };

    const drawerContent = (
        <Box sx={{ overflow: 'auto' }}>
            <Toolbar sx={{ justifyContent: 'center' }}>
                <Typography variant="h6" noWrap component="div">
                    IMS Portal
                </Typography>
            </Toolbar>
            <List>{renderMenu(sidebarItems)}</List>
        </Box>
    );

    return (
        <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
            {/* Mobile drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={onClose}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', sm: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                }}
            >
                {drawerContent}
            </Drawer>
            {/* Desktop drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                }}
                open
            >
                {drawerContent}
            </Drawer>
        </Box>
    );
}