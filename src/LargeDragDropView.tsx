import { Box } from "@mui/material"
import { Complaint, ComplaintsView } from "./Complaints"

interface LargeDragProps {
    onFiles: (complaint:Complaint | undefined, files: File[]) => void
    onPrepareUpload?: () => void
}

export const LargeDragDropView = ({onFiles, onPrepareUpload}:LargeDragProps) => {

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
    onDragOver={(e) => {
        e.preventDefault()
    }}
    onDrop={(e) => {
        e.preventDefault()
        if (e.dataTransfer.files.length === 0) {
            onFiles(undefined, [])
        }
    }}
    >
        <Box sx={{
            width: "80%",
            display: "flex",
        }}>
        <ComplaintsView showCaption={true} hideUpload={true} onPrepareUpload={onPrepareUpload} onFiles={onFiles} onChange={()=>{}}/>
        </Box>
    </Box>
}
