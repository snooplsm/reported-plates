import Box from '@mui/material/Box';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import Logout from '@mui/icons-material/Logout';
import SaveIcon from '@mui/icons-material/Save';
import PrintIcon from '@mui/icons-material/Print';
import ShareIcon from '@mui/icons-material/Share';
import { Avatar } from '@mui/material';
import { logout } from './Auth';

const actions = [
  { icon: <Logout />, name: 'Logout', onClick: ()=> {
    logout()
  } },
];

export interface SpeedProps {
  avatarUrl?:string
}

export const BasicSpeedDial = ({avatarUrl}:SpeedProps) => {
  return (
    <Box sx={{ 
      position: 'relative', // Establishes positioning context for SpeedDial,
      minHeight: 'auto', // Adjust height to content size
      right: 0
     }}>
      <SpeedDial
        ariaLabel="SpeedDial basic example"
        direction='right'
        sx={{ position: 'reltive', right: 0 }}
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
      </SpeedDial>
    </Box>
  );
}