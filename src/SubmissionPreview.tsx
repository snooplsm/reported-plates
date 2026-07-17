import { Alert, Box, Button, Card, CardActions, CardContent, CardHeader, Modal, TextField, Typography } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Report, SimpleReport, submitReport } from "./Auth";
import { useEffect, useState } from "react";
import moment from "moment";
import heic2any from "heic2any";
import { isHeicFile, isImageReportFile, isVideoReportFile } from "./api/file-utils";

export interface SubmissionProps {
    report: Report
    onCancel?: () => void
    onComplete?: (report:SimpleReport)=> void
    open: boolean
}

type PreviewMedia = {
    url: string
    type: "image" | "video"
    key: string
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

export const SubmissionPreview = ({ report, onCancel, onComplete, open }: SubmissionProps) => {

    const [media, setMedia] = useState<PreviewMedia[]>([])

    const [phone, setPhone] = useState('')

    const [phoneError, setPhoneError] = useState(false)

    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState("")

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
        let cancelled = false
        let urlsToRevoke: string[] = []

        const loadPreviewMedia = async () => {
            const video = report.files.find(isVideoReportFile)
            const files = video
                ? [video]
                : report.files.filter(isImageReportFile).slice(0, 3)

            const loaded = await Promise.all(files.map(async (file, index): Promise<PreviewMedia | undefined> => {
                try {
                    if (isVideoReportFile(file)) {
                        return {
                            url: URL.createObjectURL(file),
                            type: "video",
                            key: `${file.name}_${file.lastModified}_${index}`,
                        }
                    }

                    if (isHeicFile(file)) {
                        const converted = await heic2any({
                            blob: file,
                            toType: "image/jpeg",
                        }) as Blob;
                        return {
                            url: URL.createObjectURL(converted),
                            type: "image",
                            key: `${file.name}_${file.lastModified}_${index}`,
                        }
                    }

                    return {
                        url: URL.createObjectURL(file),
                        type: "image",
                        key: `${file.name}_${file.lastModified}_${index}`,
                    }
                } catch (e) {
                    console.log(e);
                    return undefined;
                }
            }))

            const previewMedia = loaded.filter((item): item is PreviewMedia => item != undefined)
            const urls = previewMedia.map(item => item.url)
            if (cancelled) {
                urls.forEach(url => URL.revokeObjectURL(url))
                return
            }

            urlsToRevoke = urls
            setMedia(previewMedia)
        }

        setMedia([])
        void loadPreviewMedia()

        return () => {
            cancelled = true
            urlsToRevoke.forEach(url => URL.revokeObjectURL(url))
        }
    }, [report])

    return (<Modal open={open} onClose={onCancel} >
            <Card sx={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: { xs: "calc(100vw - 24px)", sm: 560, md: 640 },
                maxWidth: "calc(100vw - 24px)",
                maxHeight: { xs: "calc(100dvh - 24px)", sm: "calc(100dvh - 48px)" },
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
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
                    sx={{
                        flex: "0 0 auto",
                        "& .MuiCardHeader-title": {
                            fontSize: { xs: "1rem", sm: "1.1rem" },
                            fontWeight: 700,
                        },
                        "& .MuiCardHeader-subheader": {
                            fontSize: { xs: "0.78rem", sm: "0.85rem" },
                        },
                    }}
                />
                {media.length > 0 && <Box sx={{
                    display: "grid",
                    gridTemplateColumns: media.length === 1 ? "1fr" : `repeat(${media.length}, minmax(0, 1fr))`,
                    gap: 0.75,
                    px: 2,
                    pb: 1,
                    flex: "0 0 auto",
                    maxHeight: { xs: "24dvh", sm: 210 },
                    overflow: "hidden",
                }}>
                    {media.map((item) => (
                        item.type === "video"
                            ? <Box
                                key={item.key}
                                component="video"
                                src={item.url}
                                controls
                                sx={{
                                    width: "100%",
                                    height: { xs: "24dvh", sm: 210 },
                                    display: "block",
                                    objectFit: "contain",
                                    bgcolor: "#000",
                                    borderRadius: 1,
                                }}
                            />
                            : <Box
                                key={item.key}
                                component="img"
                                src={item.url}
                                alt="Submission preview media"
                                sx={{
                                    width: "100%",
                                    height: { xs: media.length === 1 ? "24dvh" : 118, sm: media.length === 1 ? 210 : 156 },
                                    display: "block",
                                    objectFit: "cover",
                                    borderRadius: 1,
                                    bgcolor: "#0f172a",
                                }}
                            />
                    ))}
                </Box>}
                <CardContent sx={{
                    overflowY: "auto",
                    flex: "1 1 auto",
                    minHeight: 0,
                    px: { xs: 2, sm: 3 },
                    py: { xs: 1.5, sm: 2 },
                }}>
                    {submitError && <Alert severity="error" sx={{ mb: 1.5 }}>{submitError}</Alert>}
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
                            onChange={((e) => {
                                const newPhone = formatPhoneNumber(e.currentTarget.value)
                                setPhone(newPhone)
                                setPhoneError(newPhone.length > 0 && !isValidPhoneNumber(newPhone))
                            })}
                            value={phone}
                            // label="Phone"
                            placeholder="Your phone number is needed."
                        />
                    </Box>
                    }
                </CardContent>
                <CardActions disableSpacing sx={{
                    flex: "0 0 auto",
                    gap: 1,
                    px: { xs: 2, sm: 3 },
                    py: 1.5,
                    borderTop: "1px solid rgba(15, 23, 42, 0.1)",
                    justifyContent: "flex-end",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: "stretch",
                }}>
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
                            setSubmitError("")
                            submitReport(report, phone)
                            .then((savedReport)=> {
                                setSubmitting(false)
                                onComplete?.(savedReport)
                            }).catch((error)=> {
                                setSubmitting(false)
                                setSubmitError(error instanceof Error ? error.message : "Submission failed. Please try again.")
                            })
                        }}
                        loading={submitting}
                        disabled={submitting}
                        loadingPosition="start"
                        variant="contained"
                        sx={{
                            width: { xs: "100%", sm: "auto" },
                        }}>
                        Submit
                    </LoadingButton>
                    <Button onClick={() => {
                        onCancel?.()
                    }} color="secondary" sx={{
                        width: { xs: "100%", sm: "auto" },
                    }}>
                        Cancel
                    </Button>
                </CardActions>
            </Card>
        </Modal>
    )

}
