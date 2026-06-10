import { useState } from 'react';
import {
  Box, Collapse, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import classnames from 'classnames';

import useStyles from './styles';
import Dot from '../Dot';

export default function SidebarLink({
                                      link, icon, label, children, location, isSidebarOpened,
                                      nested, type, toggleDrawer, click, badge, badgeColor, ...props
                                    }) {

  const [isOpen, setIsOpen] = useState(false);
  const classes = useStyles(isOpen);
  const isLinkActive = link && (location.pathname === link || location.pathname.includes(link));

  const toggleCollapse = (e) => {
    if (isSidebarOpened) {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  // Title
  if (type === 'title') {
    return (
        <Typography className={classnames(classes.sectionTitle, { [classes.hidden]: !isSidebarOpened })}>
          {label}
        </Typography>
    );
  }

  // Divider
  if (type === 'divider') return <Divider sx={{ my: 2, mx: 2 }} />;

  // External Link
  if (!children && props.ext) {
    return (
        <ListItemButton
            component="a"
            href={link}
            onClick={toggleDrawer}
            className={classnames(classes.link, { [classes.active]: isLinkActive })}
        >
          <ListItemIcon className={classes.icon}>{icon}</ListItemIcon>
          <ListItemText primary={label} className={classnames({ [classes.textHidden]: !isSidebarOpened })} />
        </ListItemButton>
    );
  }

  // Simple Link
  if (!children) {
    return (
        <ListItemButton
            component={link ? Link : 'div'}
            to={link}
            onClick={(e) => {
              if (click) click(e);
              else toggleDrawer(e);
            }}
            className={classnames(classes.link, { [classes.active]: isLinkActive && !nested })}
        >
          <ListItemIcon className={classnames(classes.icon, { [classes.iconActive]: isLinkActive })}>
            {nested ? <Dot color={isLinkActive ? "primary" : "default"} /> : icon}
          </ListItemIcon>
          <ListItemText
              primary={label}
              className={classnames(classes.text, { [classes.textHidden]: !isSidebarOpened, [classes.textActive]: isLinkActive })}
          />
        </ListItemButton>
    );
  }

  // Parent with Children (Collapsible)
  return (
      <>
        <ListItemButton
            onClick={toggleCollapse}
            className={classnames(classes.link, { [classes.active]: isLinkActive })}
        >
          <ListItemIcon className={classnames(classes.icon, { [classes.iconActive]: isLinkActive })}>
            {icon}
          </ListItemIcon>
          <ListItemText
              primary={label}
              className={classnames(classes.text, { [classes.textActive]: isLinkActive, [classes.textHidden]: !isSidebarOpened })}
          />
          <ExpandMore className={classnames(classes.expandIcon, { [classes.expandOpen]: isOpen })} />
        </ListItemButton>

        <Collapse in={isOpen && isSidebarOpened} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {children.map((child, index) => (
                <SidebarLink
                    key={index}
                    location={location}
                    isSidebarOpened={isSidebarOpened}
                    nested
                    toggleDrawer={toggleDrawer}
                    {...child}
                />
            ))}
          </List>
        </Collapse>
      </>
  );
}