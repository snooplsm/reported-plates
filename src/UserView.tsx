import { GoogleLogin } from "@react-oauth/google"
import { useEffect, useState } from "react"
import {BasicSpeedDial} from "./BasicSpeedDial"
import { Box } from "@mui/material"

export interface UserProps {
    isSignedIn: boolean
    handleSuccess: (credential:any) =>void
    handleError: () => void
}

export const UserView = ({isSignedIn, handleSuccess, handleError}:UserProps) => {

    const [avatar,setAvatar] = useState<string>('')

    useEffect(()=> {
        if(isSignedIn) {
            const userS = localStorage.getItem('user')
            if(userS) {
                const user = JSON.parse(userS)
                setAvatar(user.picture)
            }            
        }
    }, [isSignedIn])
    return (<Box sx={{
        display: 'flex',
        width: '100%', // Full width
    }}>
        <Box sx={{width: "1%", marginTop: 1}}>
        </Box>
        <Box src="./reported.svg" component="img" sx={{
            width: "12%",
            aspectRatio: "1/1",
            marginTop: .5,
            height: "auto",
            borderRadius: 3,
            objectFit: "contain",
            flexShrink: 0,
        }}/>
        <Box sx={{width: "1%"}}>
        </Box>
        <Box
        sx={{
          padding: 1,
          marginLeft: "auto",
          right: 0
        }}
      >
       {!isSignedIn && <GoogleLogin
            shape="pill"
            onSuccess={handleSuccess}
            onError={handleError}
        // Optionally, you can customize the button appearance and behavior
        />
       }
       {isSignedIn && <BasicSpeedDial avatarUrl={avatar} />}
        </Box>
    </Box>)
}