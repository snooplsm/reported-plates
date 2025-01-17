import Box from '@mui/material/Box';
import { Avatar, ClickAwayListener, Fab, Grow, MenuItem, MenuList, Paper, Popper } from '@mui/material';
import { logout } from './Auth';
import { useEffect, useRef, useState } from 'react';

export interface SpeedProps {
  avatarUrl?:string
}

export const BasicSpeedDial = ({avatarUrl}:SpeedProps) => {

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
      position: 'relative', // Establishes positioning context for SpeedDial,
      width: "20px",
      height: "20px",
      right: 0
     }}>
      <Fab ref={anchorRef} onClick={handleToggle}>
        <Avatar sx={{width: "100%", height: "100%"}} src={avatarUrl}/>
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
      {/* <SpeedDial
        ariaLabel="SpeedDial basic example"
        direction='up'
        sx={{ position: 'reltive', height: "100",right: 0 }}
        icon={<Avatar src={avatarUrl}  />}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            onClick={action.onClick}
            tooltipTitle={action.name}
          />
        ))}
      </SpeedDial> */}
    </Box>
  );
}