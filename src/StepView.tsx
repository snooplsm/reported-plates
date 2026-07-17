import { Box } from "@mui/material"

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
            top: { xs: -16, md: -20 },
            left: 5,
            zIndex: 20
          }}><Box sx={{
            bgcolor: bgcolor,
            color: fontcolor,
            boxShadow: 3,
            minWidth: 34,
            height: 30,
            px: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 1,
            fontSize: "0.82rem",
            fontWeight: 800,
            lineHeight: 1,
            ...sx
          }}>{children}</Box>
        </Box>
    )
}
