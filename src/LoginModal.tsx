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
  Divider,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { LoadingButton } from '@mui/lab'
import AppleIcon from '@mui/icons-material/Apple';
import { GoogleLogin } from '@react-oauth/google';
import { enqueueSnackbar } from 'notistack';
import { forgotEmail, loginWithEmailPassword, loginWithPassword, User } from './Auth';
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
  onGoogleSuccess?: (credential: any) => void;
  onGoogleError?: () => void;
  onAppleSignIn?: () => void;
};

const LoginModal = ({
  open,
  onClose,
  payload,
  onLoggedIn,
  onGoogleSuccess,
  onGoogleError,
  onAppleSignIn
}:LoginModalProps) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading,setLoading] = useState(false)
  const isLinkingGoogleAccount = payload != undefined
  const isSmallScreen = useMediaQuery('(max-width:420px)')
  const providerButtonWidth = isSmallScreen ? 240 : 320

  useEffect(()=> {
    if(payload) {
      setEmail(payload[1].email)
    }
  },[payload])

  const handleSubmit = () => {
    if (!email.trim() || !password) {
      enqueueSnackbar('Enter your email and password.', { variant: 'warning' })
      return
    }
    setLoading(true)
    const loginRequest = isLinkingGoogleAccount
      ? loginWithPassword(email.trim(), password, payload![0], payload![1])
      : loginWithEmailPassword(email.trim(), password)

    loginRequest
    .then(ok=> {
      setLoading(false)
      onLoggedIn(ok)
    }).catch(e=> {
      setLoading(false)
      console.log(e)
      enqueueSnackbar('Login failed. Check your email and password.', { variant: 'error' })
    })
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      enqueueSnackbar('Enter your email first.', { variant: 'warning' })
      return
    }
    forgotEmail(email.trim())
      .then(() => {
        enqueueSnackbar('Password reset email sent.', { variant: 'info', autoHideDuration: 3000 })
      })
      .catch((e) => {
        console.log(e)
        enqueueSnackbar('Could not send password reset email.', { variant: 'error' })
      })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isLinkingGoogleAccount ? 'Log in with password to link account with Google' : 'Log In'}</DialogTitle>
      <DialogContent>
        <CssBaseline />
        <Stack
          spacing={2}
          sx={{ mt: 1 }}
        >
          {!isLinkingGoogleAccount &&
            <>
              <Stack
                spacing={1.5}
                sx={{
                  alignSelf: 'center',
                  width: providerButtonWidth,
                  maxWidth: '100%',
                }}
              >
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AppleIcon />}
                  onClick={onAppleSignIn}
                  sx={{
                    height: 40,
                    borderRadius: '20px',
                    borderColor: '#dadce0',
                    color: '#3c4043',
                    bgcolor: '#ffffff',
                    boxShadow: 'none',
                    textTransform: 'none',
                    fontSize: 14,
                    fontWeight: 500,
                    '&:hover': {
                      borderColor: '#dadce0',
                      bgcolor: '#f8fafd',
                      boxShadow: 'none',
                    },
                  }}
                >
                  Sign in with Apple
                </Button>
                <Box
                  id="googlelogin"
                  display="flex"
                  justifyContent="center"
                  sx={{
                    width: '100%',
                    '& > div': {
                      width: '100%',
                    },
                    '& iframe': {
                      width: '100% !important',
                      margin: 0,
                    },
                  }}
                >
                  <GoogleLogin
                    shape="pill"
                    theme="outline"
                    size="large"
                    logo_alignment="left"
                    width={providerButtonWidth}
                    onSuccess={onGoogleSuccess}
                    onError={onGoogleError}
                  />
                </Box>
              </Stack>
              <Divider>
                <Typography variant="body2" color="text.secondary">
                  or
                </Typography>
              </Divider>
            </>}
          <TextField
            required
            fullWidth
            id="email"
            label="Username or Email"
            name="username"
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
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
                onClick={handleForgotPassword}
              >
                Forgot password?
              </Link>
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <LoadingButton
          loading={loading}
          onClick={handleSubmit}
          disabled={loading}
          fullWidth
          variant="contained"
          sx={{
            height: 40,
            borderRadius: '20px',
            textTransform: 'none',
            fontWeight: 700,
          }}
        >
          Log In
        </LoadingButton>
        <Button
          onClick={onClose}
          variant="outlined"
          fullWidth
          sx={{
            height: 40,
            borderRadius: '20px',
            textTransform: 'none',
            fontWeight: 700,
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoginModal;
