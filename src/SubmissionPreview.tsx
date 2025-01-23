import { Box, Button, Card, CardActions, CardContent, CardHeader, CardMedia, Modal, TextField, Typography } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Report, submitReport } from "./Auth";
import { useEffect, useState } from "react";
import moment from "moment";
import heic2any from "heic2any";

export interface SubmissionProps {
    report: Report
    onClose?: () => void
    onCancel?: () => void
    onComplete?: (report:Report)=> void
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

export const SubmissionPreview = ({ report, onClose, onCancel, onComplete, open }: SubmissionProps) => {

    const [images, setImages] = useState<string[]>([])

    const [phone, setPhone] = useState('')

    const [phoneError, setPhoneError] = useState(false)

    const [submitting, setSubmitting] = useState(false)

    function formatPhoneNumber(phone: string): string {
        // Remove all non-numeric characters
        const digits = phone.replace(/\D/g, "");

        // Format the phone number as (xxx) xxx-xxxx
        const formattedPhone = digits
            .replace(/(\d{3})(\d{3})(\d{1,4})/, "($1) $2-$3") // Add formatting
            .substring(0, 14); // Limit to (xxx) xxx-xxxx format
        return formattedPhone;
    }

    function isValidPhoneNumber(phone: string): boolean {
        // Regular expression to validate phone number formats
        const phoneRegex = /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
      
        // Test the input against the regex
        return phoneRegex.test(phone);
      }

    

    useEffect(() => {
        const code = async () => {
            const oldFiles = images
            for (const file of oldFiles || []) {
                URL.revokeObjectURL(file)
            }
            const imgs = await Promise.all(
                report.files.map(async (file) => {
                    if (file.type.toLowerCase() === "image/heic") {
                        const uuu = URL.createObjectURL(file);
                        try {
                            const blob: Blob = await (await fetch(uuu)).blob();
                            const converted = await heic2any({
                                blob,
                                toType: "image/jpeg",
                            }) as Blob;
                            return URL.createObjectURL(converted);
                        } catch (e) {
                            console.log(e);
                            return null;
                        }
                    } else {
                        return URL.createObjectURL(file);
                    }
                })) || []
            const imagesFiltered = imgs.filter(k => k != undefined && k != null)
            setImages(imagesFiltered)
        }
        code()

    }, [report])

    return (<Modal open={open} onClose={onCancel} >
            <Card sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                maxWidth: "35%",
                transform: "translate(-50%, -50%)", // Centers the moda
            }}>
                <CardHeader
                    // avatar={
                    //   <Avatar sx={{ bgcolor: red[500] }} aria-label="recipe">
                    //     R
                    //   </Avatar>
                    // }
                    // action={
                    //   <IconButton aria-label="settings">
                    //     <MoreVertIcon />
                    //   </IconButton>
                    // }
                    title={report.typeofcomplaint}
                    subheader={`${formatCustomDate(report.timeofreport,false)}`}
                />
                <Box sx={{
                    display: "flex"
                }}>
                    {images.map((x) => {
                        return <CardMedia sx={{
                            objectFit: "cover",
                            width: `${(1 / images.length) * 100}%`
                        }} component="img" height="200" image={x} />
                    }
                    )}
                </Box>
                <CardContent>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        License plate <b>{report.license}</b>:<b>{report.state}</b> {report.typeofcomplaint}
                        <b></b> on <i>{formatCustomDate(report.timeofreport)}</i> <b>{report.address.properties.label}</b>.<br /><br />
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {report.user.firstName} {report.user.lastName}
                        {report.user.phone && <>{formatPhoneNumber(report.user.phone)}</>}
                    </Typography>

                    {!report.user.phone && <Box sx={{
                        paddingTop: 2
                    }}>
                        <Typography variant="subtitle1" sx={{
                            fontWeight: 500,
                        }}>Phone</Typography>
                        <TextField
                            sx={{
                                width: "100%"
                            }}
                            error={phoneError}
                            focused
                            onChange={((e) => {
                                const newPhone = formatPhoneNumber(e.currentTarget.value)
                                setPhone(newPhone)
                                setPhoneError(isValidPhoneNumber(newPhone))
                            })}
                            value={phone}
                            // label="Phone"
                            placeholder="Your phone number is needed."
                        />
                    </Box>
                    }
                </CardContent>
                <CardActions>
                    <LoadingButton
                        onClick={()=> {
                            if(submitting) {
                                return
                            }
                            const phoneNumber = phone || report.user.phone || ''
                            if(!isValidPhoneNumber(phoneNumber)) {
                                setPhoneError(true)
                                return
                            } else {
                                setPhoneError(false)
                            }
                            setSubmitting(true)
                            submitReport(report, phone)
                            .then(result=> {
                                setSubmitting(false)
                                onComplete?.(report)
                            }).catch(err=> {
                                setSubmitting(false)
                            })
                        }}
                        loading={submitting}
                        disabled={submitting}
                        loadingPosition="start">
                        Submit
                    </LoadingButton>
                    <Button onClick={() => {
                        onCancel?.()
                    }} color="secondary">
                        Cancel
                    </Button>
                </CardActions>
            </Card>
        </Modal>
    )

}