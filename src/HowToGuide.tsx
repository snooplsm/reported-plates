import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Avatar, Stack } from '@mui/material';
import { ComplaintsView } from './Complaints';
import LicensePlate from './LicensePlate';

export enum Steps {
    TAKE_PHOTO,
    DRAG_PHOTO_OR_UPLOAD,
    EXTRACT_DETAILS,
    VERIFY_AND_SUBMIT
}

interface HowToGuideProps {
    videoUrl: string; // URL of the 1:1 video for Step 1
    onStepHovered?: (step?: Steps) => void
    isSignedIn: boolean,
    handleSuccess: (credential: any) => void
    handleError: () => void

}

const HowToGuide = ({ videoUrl, onStepHovered = ()=> {} }: HowToGuideProps) => {

    const scrollRef = useRef<HTMLDivElement>(null);
    const [direction, setDirection] = useState<'down' | 'up'>('down');

    const [,setCanScroll] = useState(true)

    useEffect(() => {
        const userAgent = navigator.userAgent;
        if (/android|iPhone|iPad|iPod/i.test(userAgent.toLowerCase())) {
            setCanScroll(true)
        }
    }, []);


    // useEffect(() => {
    //     if (!canScroll) {
    //         return
    //     }
    //     const interval = setInterval(() => {
    //         if (scrollRef.current) {
    //             const maxScroll = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;

    //             if (direction === 'down') {
    //                 // Scroll down
    //                 scrollRef.current.scrollTop += 3;
    //                 if (scrollRef.current.scrollTop >= maxScroll) {
    //                     setDirection('up');
    //                 }
    //             } else {
    //                 // Scroll up
    //                 scrollRef.current.scrollTop -= 3;
    //                 if (scrollRef.current.scrollTop <= 0) {
    //                     setDirection('down');
    //                 }
    //             }
    //         }
    //     }, 25); // Adjust interval for smoother or faster scrolling

    //     return () => clearInterval(interval); // Cleanup on unmount
    // }, [direction, canScroll]);

    let step = 1

    return (
        <><Box
            sx={{
                height: "100%",
                width: "100%",
                maxHeight: "100vh",
                overflowY: "auto",
                scrollBehavior: "smooth",
                scrollbarWidth: "none", // For Firefox
                '::-webkit-scrollbar': {
                    width: "0px",
                    display: 'none', // For Chrome, Safari, and Edge
                },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                // justifyContent: 'center',                
            }}
        >


            {/* Step-by-Step Guide */}
            <Paper
                sx={{
                    width: '100%',
                    maxWidth: '800px',
                    padding: 2,
                }}
            >
                <Typography variant="h6" align="center" sx={{ fontWeight: 'bold', marginBottom: 1 }}>
                    How to Submit a Vehicle Complaint
                </Typography>
                {/* <Typography variant="h5" >
                    Steps:
                </Typography> */}
                <List>
                    {/* {!isSignedIn && <ListItem
                        onMouseOver={(e) => {
                            e.preventDefault()
                            onStepHovered && onStepHovered(Steps.DRAG_PHOTO_OR_UPLOAD)
                        }
                        }
                        onMouseLeave={(e) => {
                            onStepHovered && onStepHovered(undefined)
                            e.preventDefault()
                        }
                        }
                    >
                        <ListItemText
                            sx={{
                                width: "50%",
                                flexGrow: 1,
                            }}
                            primary={<Stack direction="row" alignItems="center"><Avatar sx={{marginRight: 2}}>{step++}</Avatar>Sign in</Stack>}
                            secondary="Sign in with google."
                        />
                        <Box
                            sx={{
                                width: "35%",
                                position: 'relative',
                                overflow: 'auto',
                                display: "flex",         // Use flexbox for centering
                                alignItems: "center",    // Center vertically
                                justifyContent: "center" // Center horizontally
                            }}
                        >
                            <GoogleLogin
                                onSuccess={handleSuccess}
                                onError={handleError}
                            // Optionally, you can customize the button appearance and behavior
                            />
                        </Box>
                    </ListItem>
                    } */}
                    <ListItem
                        onMouseOver={() => onStepHovered && onStepHovered(Steps.TAKE_PHOTO)}
                        onMouseLeave={() => onStepHovered && onStepHovered(undefined)}
                    >
                        <ListItemText
                            sx={{
                                width: "50%"
                            }}
                            primary={<Stack direction="row" alignItems="center"><Avatar sx={{
                                bgcolor: "rgb(250,221,152)",
                                color: "rgb(0,0,0)",
                                boxShadow: 3,
                                marginRight: 2
                            }}>{step++}</Avatar>Take a photo of the infraction</Stack>}
                            secondary="Be sure to include the vehicle's license plate to take advantage of our license plate reader."
                        />
                        <Box
                            sx={{
                                height: "8rem",
                                position: 'relative',
                                WebkitTransform: "translateZ(0)",
                                borderRadius: 4,
                                overflow: 'hidden',
                            }}
                        >
                            <video
                                src={videoUrl}
                                title="Take a photo"
                                autoPlay={true} loop muted
                                style={{
                                    top: 0,
                                    left: 0,
                                    height: "8rem",
                                    borderRadius: 4,
                                    overflow: 'hidden',
                                    WebkitTransform: "translateZ(0)",
                                    WebkitMaskImage: "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAA5JREFUeNpiYGBgAAgwAAAEAAGbA+oJAAAAAElFTkSuQmCC)"
                                }}
                            />
                        </Box>
                    </ListItem>
                    <ListItem
                        onMouseOver={(e) => {
                            e.preventDefault()
                            onStepHovered && onStepHovered(Steps.DRAG_PHOTO_OR_UPLOAD)
                        }
                        }
                        onMouseLeave={(e) => {
                            onStepHovered && onStepHovered(undefined)
                            e.preventDefault()
                        }
                        }
                    >
                        <ListItemText
                            sx={{
                                width: "50%"
                            }}
                            primary={<Stack direction="row" alignItems="center"><Avatar sx={{
                                bgcolor: "rgb(250,221,152)",
                                color: "rgb(0,0,0)",
                                boxShadow: 3,
                                marginRight: 2
                            }}>{step++}</Avatar>Add photos</Stack>}
                            secondary="We support drag-and-drop or manual uploads for your convenience.  Drag an image over the complaint."
                        />
                        <Box
                            onMouseOver={() => {
                                setCanScroll(false)
                            }}
                            onMouseLeave={() => {
                                onStepHovered && onStepHovered(undefined)
                                setCanScroll(true)
                            }}
                            ref={scrollRef}
                            sx={{
                                width: "25%",
                                position: 'relative',
                                borderRadius: 4,
                                overflow: 'auto',
                            }}
                        >
                            <ComplaintsView onChange={() => { }} onFiles={() => { }} />
                        </Box>
                    </ListItem>
                    <ListItem
                        onMouseOver={() => onStepHovered(Steps.EXTRACT_DETAILS)}
                    >
                        <ListItemText
                            sx={{
                                width: "50%",
                            }}
                            primary={<Stack direction="row" alignItems="center"><Avatar sx={{
                                bgcolor: "rgb(250,221,152)",
                                color: "rgb(0,0,0)",
                                boxShadow: 3,
                                marginRight: 2,
                                fontSize: "90%"
                            }}>{step++} - {(step += 1)}</Avatar>Extract key details</Stack>}
                            secondary="The license plate will be extracted from the photo, along with the location and time of the infraction."
                        />
                        <Box
                            sx={{
                                position: 'relative',
                                width: "30%",
                                borderRadius: 4,
                                overflow: 'hidden',
                            }}
                        >
                            <LicensePlate />
                        </Box>
                    </ListItem>
                    <ListItem onMouseOver={() => onStepHovered && onStepHovered(Steps.VERIFY_AND_SUBMIT)} onMouseLeave={() => onStepHovered && onStepHovered(undefined)}>
                        <ListItemText
                            primary={
                                <Stack direction="row" alignItems="center">
                                    <Avatar sx={{
                                        bgcolor: "rgb(250,221,152)",
                                        color: "rgb(0,0,0)",
                                        boxShadow: 3,
                                        marginRight: 2
                                    }}>{step += 1}
                                    </Avatar>Verify and submit.
                                </Stack>}
                            secondary={
                            <div><ol type="i" style={{
                                marginLeft: 32
                            }}>
                                {[
                                    <><b>Complaint Type:</b> Confirm you selected the correct complaint type</>,
                                    <><b>License Plate and State:</b> Verify the license plate and state match the photo, if applicable</>,
                                    <><b>Incident Address:</b> Ensure the address matches the location where the photo was taken</>,
                                    <><b>Time of Incident:</b> Double-check the reported time of the incident for accuracy</>,
                                    <>Once verified, submit the report and pledge to testify if required</>

                                ].map((x,index) => <li key={`lineitem_${index}`}>{x}.</li>)}

                            </ol></div>}
                            disableTypography={true}
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText
                            primary={<Stack direction="row" alignItems="center"><Avatar sx={{
                                bgcolor: "rgb(250,221,152)",
                                color: "rgb(0,0,0)",
                                boxShadow: 3,
                                marginRight: 2
                            }}>{step += 1}</Avatar><a href="https://join.slack.com/t/reportedcab/shared_invite/zt-2xz2lt5np-9_3CzYUI0X4iGI2OLOZc0g">Join our slack!</a></Stack>}
                            secondary={
                                <>
                                    Our slack channel is a great resource to learn the process of filing complaints with the T&LC
                                </>
                            }
                        />
                    </ListItem>
                </List>
            </Paper>
        </Box>

        </>
    );
};

export default HowToGuide;