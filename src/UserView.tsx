import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { BasicSpeedDial } from "./BasicSpeedDial"
import { Box, Button } from "@mui/material"
import { useNavigate } from "react-router-dom"
import { enqueueSnackbar } from "notistack"
import LoginModal from "./LoginModal"

export interface UserProps {
    isSignedIn: boolean
    handleSuccess: (credential: any) => void
    handleError: () => void
}

export interface UserViewRef {
    refreshUserAvatar: () => void;
  }

export const UserView = forwardRef<UserViewRef, UserProps>(({ isSignedIn, handleSuccess, handleError }, ref) => {

    const [avatar, setAvatar] = useState<string>('')  
    const [loginOpen, setLoginOpen] = useState(false)

    const nav = useNavigate()

    useImperativeHandle(ref, () => ({
        refreshUserAvatar: () => {
            enqueueSnackbar(`You need to login.`, {
                autoHideDuration: 7000,                
                variant: 'warning',
              })
        },
      }));

    useEffect(() => {
        if (isSignedIn) {
            const userS = localStorage.getItem('user')
            if (userS) {
                const user = JSON.parse(userS)
                setAvatar(user.picture || '')
            } else {
                setAvatar('')
            }
        }
    }, [isSignedIn])
    return (<Box
        display="flex"
        width="100%"
        flexDirection="row"
        sx={{
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1
        }}
    >
        <Box
            src="./reported.svg"
            component="img"
            sx={{
                aspectRatio: "1/1",
                height: "52px",
                borderRadius: 3,
                objectFit: "contain",
                flexShrink: 0,
                cursor: "pointer",
                transition: "transform 0.1s ease",
                "&:hover": {
                    transform: "scale(1.06)",
                    cursor: "pointer"
                }
            }}
            onClick={() => nav('/')}
        />
        <Box>
            {!isSignedIn && <Button
                id="login"
                variant="contained"
                onClick={() => setLoginOpen(true)}
                sx={{
                    borderRadius: "999px",
                    textTransform: "none",
                    fontWeight: 700,
                    px: 2.5,
                    minHeight: 44,
                    whiteSpace: "nowrap"
                }}
            >
                Log In
            </Button>}
            {isSignedIn && <BasicSpeedDial avatarUrl={avatar} />}
        </Box>
        <LoginModal
            open={loginOpen}
            onClose={() => setLoginOpen(false)}
            onLoggedIn={() => setLoginOpen(false)}
            onGoogleSuccess={(credential) => {
                setLoginOpen(false)
                handleSuccess(credential)
            }}
            onGoogleError={handleError}
            onAppleSignIn={() => {
                enqueueSnackbar('Apple Sign in is not configured yet.', {
                    variant: 'info',
                })
            }}
        />
    </Box>)
}) 
