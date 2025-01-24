import { Avatar, Box } from "@mui/material"

export interface StepProps {
    children: React.ReactNode
    hasError?: boolean,
    sx?: object
}

export const StepView = ({children, hasError, sx}:StepProps) => {

    const bgcolor = () => {
        if(hasError==undefined) {
            return "rgb(250,221,152)"
        }
        if(hasError) {
            return "rgb(217,0,23)"
        } 
        return "rgb(70, 114, 40)"
    }
    const fontcolor = ()=> {
        if(hasError==undefined) {
            return "rgb(0,0,0)"
        }
        return "rgb(233,233,233)" 
    }

    return (
        <Box sx={{
            position: "absolute",
            top: -20,
            left: 5,
            zIndex: 20
          }}><Avatar sx={{
            bgcolor: bgcolor,
            color: fontcolor,
            boxShadow: 3,
            ...sx
          }}>{children}</Avatar>
        </Box>
    )
}