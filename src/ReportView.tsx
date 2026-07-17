import { Box, Button, Card, CardActions, CardContent, CardHeader, Divider, Grid, Modal, Stack, Typography } from "@mui/material"
import { LoadingButton } from "@mui/lab"
import { MapContainer, Marker, TileLayer } from "react-leaflet"
import L, { LatLngExpression } from "leaflet"
import "leaflet/dist/leaflet.css"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerIconRetina from "leaflet/dist/images/marker-icon-2x.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
import { deleteReport, SimpleReport, Status } from "./Auth"
import { useState } from "react"
import moment from "moment";
import { ReportMediaGallery } from "./ReportMediaGallery";

export interface ReportProps {
    report: SimpleReport
    onCancel?: () => void
    onDeleted?: (report: SimpleReport) => void
    open: boolean
    statuses?: Map<Number, Status>
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

const marker = new L.Icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIconRetina,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
})

const isDeletable = (report: SimpleReport) => {
    return !report.reqnumber && Number(report.status ?? 0) === 0
}

export const ReportView = ({ report, onCancel, onDeleted, open, statuses }: ReportProps) => {

    const [deleting, setDeleting] = useState(false)
    const position = report.location && report.location.length === 2
        ? [report.location[0], report.location[1]] as LatLngExpression
        : undefined
    const statusText = statuses?.get(report.status)?.text || (Number(report.status ?? 0) === 0 ? "Not yet submitted" : `Status ${report.status}`)

    return (<Modal open={open} onClose={onCancel}>
            <Card sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: { xs: "calc(100vw - 24px)", md: "min(980px, calc(100vw - 48px))" },
                maxHeight: "calc(100vh - 48px)",
                overflow: "auto",
                transform: "translate(-50%, -50%)",
            }}>
                <CardHeader
                    title={report.typeofcomplaint}
                    subheader={formatCustomDate(report.timeofreport,false)}
                />
                <ReportMediaGallery files={report.files || []} />
                <CardContent>
                    <Grid container spacing={2.5}>
                        <Grid item xs={12} md={6}>
                            <Stack spacing={1.5}>
                                <Box>
                                    <Typography variant="overline" color="text.secondary">311 Request</Typography>
                                    <Typography variant="body1">{report.reqnumber || "Not submitted to 311 yet"}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="overline" color="text.secondary">Status</Typography>
                                    <Typography variant="body1">{statusText}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="overline" color="text.secondary">Plate</Typography>
                                    <Typography variant="body1"><b>{report.license}</b>{report.state ? `:${report.state}` : ""}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="overline" color="text.secondary">Address</Typography>
                                    <Typography variant="body1">{report.loc1_address || "No address saved"}</Typography>
                                </Box>
                                {report.reportDescription && <Box>
                                    <Typography variant="overline" color="text.secondary">Description</Typography>
                                    <Typography variant="body2">{report.reportDescription}</Typography>
                                </Box>}
                            </Stack>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="overline" color="text.secondary">Map</Typography>
                            <Box sx={{
                                mt: 0.5,
                                borderRadius: 1,
                                overflow: "hidden",
                                border: "1px solid",
                                borderColor: "divider",
                                height: 280,
                            }}>
                                {position ? <MapContainer
                                    key={report.id}
                                    center={position}
                                    zoom={16}
                                    scrollWheelZoom={false}
                                    attributionControl={false}
                                    style={{ width: "100%", height: "100%" }}
                                >
                                    <TileLayer
                                        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                    />
                                    <TileLayer
                                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
                                        opacity={0.99}
                                    />
                                    <Marker icon={marker} position={position} />
                                </MapContainer> : <Box sx={{
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "text.secondary",
                                    px: 2,
                                    textAlign: "center",
                                }}>
                                    No map coordinates were saved for this submission.
                                </Box>}
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
                <Divider />
                <CardActions disableSpacing sx={{ justifyContent: "space-between", px: 2, py: 1.5 }}>
                    <Button onClick={() => {
                        onCancel?.()
                    }} size="small" color="secondary">
                        Close
                    </Button>
                    {isDeletable(report) && <LoadingButton
                        color="error"
                        loading={deleting}
                        disabled={deleting}
                        onClick={() => {
                            setDeleting(true)
                            deleteReport(report.id)
                                .then(ok => {
                                    setDeleting(false)
                                    if (ok) {
                                        onDeleted?.(report)
                                        onCancel?.()
                                    }
                                })
                                .catch(() => {
                                    setDeleting(false)
                                })
                        }}
                        size="small"
                        variant="outlined"
                    >
                        Delete
                    </LoadingButton>}
                </CardActions>
            </Card>
    </Modal>
    )

}
