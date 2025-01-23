import { Box, Button, Card, CardActions, CardContent, CardHeader, CardMedia, Dialog, DialogContent, Modal, TextField, Typography } from "@mui/material"
import { SimpleReport, submitReport } from "./Auth"
import { useEffect, useState } from "react"
import moment from "moment";
import heic2any from "heic2any"

export interface ReportProps {
    report: SimpleReport
    onClose?: () => void
    onCancel?: () => void
    open: boolean
}

export function formatCustomDate(date:Date, showAgo = true) {
    const now = moment();
    const givenDate = moment(date);

    const daysAgo = now.diff(givenDate, "days");
    const hoursAgo = now.diff(givenDate, "hours") % 24; // Remaining hours after subtracting days

    const formattedDate = givenDate.format("dddd MMMM Do YYYY [@] h:mma"); // Main date format

    let timeAgo = "";
    if (showAgo) {
        if (daysAgo > 0) {
            timeAgo = `(${daysAgo} days ${hoursAgo} hours ago)`;
        } else {
            timeAgo = `(${hoursAgo} hours ago)`;
        }
    }

    return `${formattedDate} ${timeAgo}`.trim();
}

export const ReportView = ({ report, onClose, onCancel, open }: ReportProps) => {

    const [images] = useState<string[]>(report.files)

    return (<Modal open={open} onClose={onCancel}>
            <Card sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                maxWidth: "35%",
                transform: "translate(-50%, -50%)", // Centers the moda
            }}>
                <CardHeader                    
                    title={report.typeofcomplaint}
                    subheader={`${formatCustomDate(report.timeofreport,false)}`}
                />
                <Box sx={{
                    display: "flex"
                }}>
                    {images.map((x) => {
                        return <CardMedia
                            onClick={()=> {
                                window.open(x, "_blank")
                            }}
                         sx={{
                            objectFit: "cover",
                            width: `${(1 / images.length) * 100}%`,
                            cursor: "pointer"
                        }} component="img" height="200" image={x} />
                    }
                    )}
                </Box>
                <CardContent>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {report.reqnumber} <br/>
                        License plate <b>{report.license}</b>:<b>{report.state}</b> {report.typeofcomplaint}
                        <b></b> on <i>{formatCustomDate(report.timeofreport)}</i> <b>{report.loc1_address}</b>.<br /><br />

                        {report.reportDescription}
                    </Typography>                    
                </CardContent>
                <CardActions disableSpacing>                    
                    <Button onClick={() => {
                        onCancel?.()
                    }} size="small" color="secondary">
                        Close
                    </Button>
                </CardActions>
            </Card>
    </Modal>
    )

}