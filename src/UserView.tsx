import { GoogleLogin } from "@react-oauth/google"
import { useEffect, useState } from "react"
import { BasicSpeedDial } from "./BasicSpeedDial"
import { Box } from "@mui/material"
import { useNavigate } from "react-router-dom"

export interface UserProps {
    isSignedIn: boolean
    handleSuccess: (credential: any) => void
    handleError: () => void
}

export const UserView = ({ isSignedIn, handleSuccess, handleError }: UserProps) => {

    const [avatar, setAvatar] = useState<string>('')    

    const nav = useNavigate()

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
        width="100%" // Full width
        flexDirection="row-reverse"
        sx={{
            alignItems: "center"
        }}
    >
        <Box sx={{ width: "1%", marginTop: 1 }}>
        </Box>
        <Box src="./reported.svg" component="img" sx={{
            aspectRatio: "1/1",
            marginTop: .5,
            height: "60px",
            borderRadius: 3,
            objectFit: "contain",
            flexShrink: 0,
            cursor: "pointer",
            transition: "transform   0.1s ease", // Smooth hover effect
          "&:hover": {
            transform: "scale(1.09)", // Scale image on hover        
            cursor: "pointer"
          }
        }} onClick={()=> nav('/')}
        />
        <Box sx={{ width: "1%" }}>
        </Box>
        <Box
            sx={{
                marginLeft: "auto",
                right: 0
            }}
        >
            <>{!isSignedIn && <GoogleLogin
                shape="pill"
                onSuccess={handleSuccess}
                onError={handleError}
            // Optionally, you can customize the button appearance and behavior
            />}
            {isSignedIn && <BasicSpeedDial avatarUrl={avatar} />}</>
        
        </Box>        

    </Box>)
}