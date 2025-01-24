import Box from '@mui/material/Box';
import { Avatar, ClickAwayListener, Fab, Grow, Link, MenuItem, MenuList, Paper, Popper } from '@mui/material';
import { logout } from './Auth';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

  const nav = useNavigate()

  return (
    <Box sx={{
    }}>
      <Fab 
      sx={{
        transition: "transform   0.1s ease", // Smooth hover effect
        "&:hover": {
          transform: "scale(1.09)", // Scale image on hover        
          cursor: "pointer"
      }
      }}
        ref={anchorRef} onClick={handleToggle}>
        <Avatar sx={{width: "100%", height: "100%"}} src={avatarUrl} />
      </Fab>
      <Popper
        sx={{
          zIndex: 700
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
            <Paper sx={{
              zIndex: 100
            }}>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList
                  autoFocusItem={open}
                  id="composition-menu"
                  aria-labelledby="composition-button"
                // onKeyDown={handleListKeyDown}
                >
                  <MenuItem onClick={(event) => {
                    handleClose(event)
                    nav('/')
                  }}>New Report</MenuItem>
                  <MenuItem onClick={(event) => {
                    handleClose(event)
                    nav('/reports')
                  }}>My Reports</MenuItem>
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