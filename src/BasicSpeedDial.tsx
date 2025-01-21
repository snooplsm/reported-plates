import Box from '@mui/material/Box';
import { Avatar, ClickAwayListener, Fab, Grow, MenuItem, MenuList, Paper, Popper } from '@mui/material';
import { logout } from './Auth';
import { useEffect, useRef, useState } from 'react';

export interface SpeedProps {
  avatarUrl?: string
}

export const BasicSpeedDial = ({ avatarUrl }: SpeedProps) => {

  const anchorRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false);
  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event | React.SyntheticEvent) => {
    if (
      anchorRef.current &&
      anchorRef.current.contains(event.target as HTMLElement)
    ) {
      return;
    }

    setOpen(false);
  };

  const handleLogout = async (event: Event | React.SyntheticEvent) => {
    await logout()
    setOpen(false)
  }
  const prevOpen = useRef(open);

  useEffect(() => {
    if (prevOpen.current === true && open === false) {
      anchorRef.current!.focus();
    }

    prevOpen.current = open;
  }, [open]);

  return (
    <Box sx={{
    }}>
      <Fab ref={anchorRef} onClick={handleToggle}>
        <Avatar src={avatarUrl} />
      </Fab>
      <Popper
        sx={{
          zIndex: 7
        }}
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        placement="bottom-start"
        transition
        disablePortal
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin:
                placement === 'bottom-start' ? 'left top' : 'left bottom',
            }}
          >
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList
                  autoFocusItem={open}
                  id="composition-menu"
                  aria-labelledby="composition-button"
                // onKeyDown={handleListKeyDown}
                >
                  <MenuItem onClick={handleClose}>My Reports</MenuItem>
                  <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </Box>
  );
}