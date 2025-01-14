import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Button } from '@mui/material';

interface HowToGuideProps {
    videoUrl: string; // URL of the 1:1 video for Step 1
}

const HowToGuide = ({ videoUrl }: HowToGuideProps) => {
    return (
        <Box
            sx={{
                height: "100%",
                width: "100%",
                maxHeight: "100vh",
                overflowY: "auto",
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                // justifyContent: 'center',
                padding: 4,
                gap: 2,
            }}
        >
            {/* Title */}
            <Typography variant="h4" align="center" sx={{ fontWeight: 'bold', marginBottom: 2 }}>
                How to Submit a Vehicle Complaint
            </Typography>

            {/* Step-by-Step Guide */}
            <Paper
                elevation={3}
                sx={{
                    width: '100%',
                    maxWidth: '800px',
                    padding: 2,
                    backgroundColor: '#f9f9f9',
                    borderRadius: 2,
                }}
            >
                <Typography variant="h5" >
                    Steps:
                </Typography>
                <List>
                    <ListItem>
                        <ListItemText
                            primary="1. Take a photo of the infraction."
                            secondary="Be sure to include the vehicle's license plate to take advantage of our license plate reader."
                        />
                        <Box
                            sx={{
                                width: '480px',
                                height: "480px",
                                position: 'relative',
                                borderRadius: 2,
                                overflow: 'hidden',
                            }}
                        >
                            <video
                                src={videoUrl}
                                title="Step 1 Video"
                                autoPlay={true} loop muted
                                style={{
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                }}
                            />
                        </Box>
                    </ListItem>
                    <ListItem>
                        <ListItemText
                            primary="2. Drag the photo over the infractions on the left, or click the infraction and upload the file."
                            secondary="We support drag-and-drop or manual uploads for your convenience."
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText
                            primary="3. Extract key details."
                            secondary="The license plate will be extracted from the photo, along with the location and time of the infraction."
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText
                            primary="4. Verify and submit."
                            secondary="Ensure all data points are accurate and submit the complaint for review."
                        />
                    </ListItem>
                </List>
            </Paper>
        </Box>
    );
};

export default HowToGuide;