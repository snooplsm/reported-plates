import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Link,
  Container,
  CssBaseline,
  Grid,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from '@mui/material';
import { forgotEmail, loginWithPassword, User } from './Auth';
import { JwtPayload } from 'jwt-decode';

type LoginModalProps = {
  payload?:[string,JwtPayload],
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
    loginWithPassword(email,password, payload![0], payload![1])
    .then(ok=> {
      onLoggedIn(ok)
    }).catch(e=> {
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
        <Button
          loading={loading}
          type="submit"
          variant="contained"
          onClick={handleSubmit}
          sx={{ mt: 3, mb: 2 }}
        >
          Login
        </Button>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoginModal;