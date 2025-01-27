import { Avatar, Box } from '@mui/material';
import { useEffect, useState } from 'react';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

interface FileProps {
  file: File,
  onClick: ()=>void
  onClickDelete: ()=>void
}

export const FileUploadPreview = ({file, onClick, onClickDelete}:FileProps) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(()=> {
    const blobUrl = URL.createObjectURL(file);
    setImageSrc(blobUrl);
  },[file])

  if(!imageSrc) {
    return null
  }

  let component = 'img'
  if(file.type.indexOf('video')!=-1) {
    component = 'video'
  }
  return (
    <Box
    sx={{
      width: '33%', // Match the width of the inner Box
      aspectRatio: '1/1', // Ensure it maintains the same aspect ratio
      display: 'flex',
      alignItems: 'center',
      position: "relative",
      justifyContent: 'center',
      marginRight: '.3rem', // Apply the outer margin
      borderRadius: '10px', // Optional: Match the inner Box rounding      
      border: '1px solid #ccc', // Optional: Add a border to the wrapper
    }}
  >
    <Box
      src={imageSrc}
      component={component}
      alt="Uploaded Preview"
      onClick={onClick}
      sx={{
        aspectRatio: '1/1',
        height: 'auto',
        width: '100%', // Adjust width to fill parent
        objectFit: 'cover',
        objectPosition: 'center',
        transition: 'transform 0.1s ease',
        "&:hover": {
          transform: 'scale(1.05)', // Smooth hover effect
          cursor: 'pointer',
        },
        borderRadius: '10px', // Optional: Keep inner rounding
      }}
    />
    <Box sx={{
      position: "absolute",
      zIndex: 100,
      top: -5,
      right: -5,
      transition: 'transform 0.1s ease',
        "&:hover": {
          transform: 'scale(1.05)', // Smooth hover effect
          cursor: 'pointer',
        },
      cursor: "pointer"
    }}
    onClick={onClickDelete}
    >
    <Avatar sx={{
      zIndex: 100,
      width: 20,
      color: "rgb(0,0,0)",
      bgcolor: "rgb(255,255,255)",
      height: 20,
      boxShadow: 3
    }}><HighlightOffIcon/></Avatar>
    </Box>
  </Box>
  );
};

export default FileUploadPreview;