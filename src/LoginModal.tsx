import React, { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Link,
  CssBaseline,
  Grid,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from '@mui/material';
import { LoadingButton } from '@mui/lab'
import { forgotEmail, loginWithPassword, User } from './Auth';
import { JwtPayload } from 'jwt-decode';

export interface CustomJwtPayload extends JwtPayload {
  email: string; 
  given_name: string;
  family_name: string;
}

type LoginModalProps = {
  payload?:[string,CustomJwtPayload],
  open: boolean;
  onClose: () => void;
  onLoggedIn: (user:User)=>void;
};

const LoginModal = ({
  open,
  onClose,
  payload,
  onLoggedIn
}:LoginModalProps) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading,setLoading] = useState(false)

  useEffect(()=> {
    if(payload) {
      setEmail(payload[1].email)
    }
  },[payload])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true)
    loginWithPassword(email,password, payload![0], payload![1])
    .then(ok=> {
      setLoading(false)
      onLoggedIn(ok)
    }).catch(e=> {
      setLoading(false)
      console.log(e)
    })
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Login with password to link account with Google</DialogTitle>
      <DialogContent>
        <CssBaseline />
        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{ mt: 1 }}
        >
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Grid container>
            <Grid item xs>
              <Link
                component="button"
                variant="body2"
                onClick={()=>{forgotEmail(email)}}
              >
                Forgot password?
              </Link>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <LoadingButton
          loading={loading}
          type="submit"
          disabled={loading}
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
        >
          Login
        </LoadingButton>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoginModal;