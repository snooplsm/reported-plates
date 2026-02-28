import { GoogleLogin, useGoogleOneTapLogin } from "@react-oauth/google"
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { BasicSpeedDial } from "./BasicSpeedDial"
import { Box, Button } from "@mui/material"
import { useNavigate } from "react-router-dom"
import { closeSnackbar, enqueueSnackbar } from "notistack"

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

    const nav = useNavigate()

    const login = () => {
        useGoogleOneTapLogin({
            onSuccess: handleSuccess,  
              
        })
    }

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
                setAvatar(user.picture)
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
            {!isSignedIn && <Box component={"div"} id="googlelogin"><GoogleLogin
                shape="pill"
                onSuccess={handleSuccess}
                onError={handleError}
            /></Box>}
            {isSignedIn && <BasicSpeedDial avatarUrl={avatar} />}
        </Box>
    </Box>)
}) 
