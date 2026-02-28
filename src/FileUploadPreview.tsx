import { Avatar, Box, LinearProgress, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import heic2any from "heic2any";

import HighlightOffIcon from '@mui/icons-material/HighlightOff';

interface FileProps {
  id: string,
  file: File,
  onClick: ()=>void
  onClickDelete: ()=>void
  onProcessingChange?: (id: string, status?: { text: string; progress: number }) => void
}

export const FileUploadPreview = ({id, file, onClick, onClickDelete, onProcessingChange}:FileProps) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewText, setPreviewText] = useState("Processing...");
  const prevFileRef = useRef<File>();
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevFileRef.current !== file) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setImageSrc(null);
      setPreviewText("Processing preview...");
      setPreviewProgress(10);

      const processFile = async () => {
        try {
          let blob: Blob;
          if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
            setPreviewText("Converting HEIC...");
            setPreviewProgress(45);
            onProcessingChange?.(id, { text: "Converting HEIC...", progress: 45 });
            blob = await heic2any({
              blob: file,
              toType: "image/jpeg",
              quality: 1,
            }) as Blob;
            setPreviewProgress(80);
            onProcessingChange?.(id, { text: "Converting HEIC...", progress: 80 });
          } else {
            blob = file;
            setPreviewProgress(70);
          }

          setPreviewText("Rendering preview...");
          if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
            onProcessingChange?.(id, { text: "Rendering HEIC preview...", progress: 92 });
          }
          const blobUrl = URL.createObjectURL(blob);
          previewUrlRef.current = blobUrl;
          setImageSrc(blobUrl);
          setPreviewProgress(100);
          if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
            onProcessingChange?.(id, { text: "HEIC ready", progress: 100 });
            onProcessingChange?.(id, undefined);
          }
          prevFileRef.current = file;
        } catch (err) {
          console.error("Failed to process file", err);
          setPreviewText("Preview failed");
          onProcessingChange?.(id, undefined);
        }
      };
      processFile();
    }

    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      onProcessingChange?.(id, undefined);
    };
  }, [file, id, onProcessingChange]);


  if(!imageSrc) {
    return (
      <Box
        sx={{
          width: '33%',
          aspectRatio: '1/1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          marginRight: '.3rem',
          borderRadius: '10px',
          border: '1px solid #ccc',
          padding: 1
        }}
      >
        <Typography sx={{ fontSize: '.7rem', marginBottom: .5 }}>{previewText}</Typography>
        <LinearProgress variant="determinate" value={previewProgress} sx={{ width: "100%" }} />
      </Box>
    )
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
