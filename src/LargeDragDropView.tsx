import { Box } from "@mui/material"
import { Complaint, ComplaintsView } from "./Complaints"
import { useEffect } from "react";

interface LargeDragProps {
    onFiles: (complaint:Complaint | undefined, files: File[]) => void
}

export const LargeDragDropView = ({onFiles}:LargeDragProps) => {

      const handleDragEnd = () => {
        onFiles(undefined,[])
        console.log("Drag ended");
      };
    
      useEffect(() => {
        // Add global dragend listener
        window.addEventListener("mousemove", handleDragEnd);
    
        return () => {
          // Cleanup
          window.removeEventListener("mousemove", handleDragEnd);
        };
      }, []);

    return <Box sx={{
        width: "100%",
        height: "100%",
        background: "#ccccccfc",
        zIndex: 4000,
        position: "absolute",
        display: "flex", // Activate flexbox
        justifyContent: "center", // Center horizontally
        alignItems: "center", // Center vertically
        padding: 20
    }}
    >
        <Box sx={{
            width: "80%",
            display: "flex",
        }}>
        <ComplaintsView showCaption={true} hideUpload={true} onFiles={onFiles} onChange={()=>{}}/>
        </Box>
    </Box>
}