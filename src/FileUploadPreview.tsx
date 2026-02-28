import { Avatar, Box, LinearProgress, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    let cancelled = false;
    let localUrl: string | null = null;
    const isHeic = file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic");

    setImageSrc(null);
    setPreviewText("Processing preview...");
    setPreviewProgress(10);

    const processFile = async () => {
      try {
        let blob: Blob;
        if (isHeic) {
          setPreviewText("Converting HEIC...");
          setPreviewProgress(45);
          onProcessingChange?.(id, { text: "Converting HEIC...", progress: 45 });
          blob = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 1,
          }) as Blob;
          if (cancelled) {
            return;
          }
          setPreviewProgress(80);
          onProcessingChange?.(id, { text: "Converting HEIC...", progress: 80 });
          setPreviewText("Rendering preview...");
          onProcessingChange?.(id, { text: "Rendering HEIC preview...", progress: 92 });
        } else {
          blob = file;
          setPreviewText("Rendering preview...");
          setPreviewProgress(70);
        }

        localUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(localUrl);
          localUrl = null;
          return;
        }

        setImageSrc(localUrl);
        setPreviewProgress(100);
        setPreviewText("Ready");
        if (isHeic) {
          onProcessingChange?.(id, { text: "HEIC ready", progress: 100 });
        }
        onProcessingChange?.(id, undefined);
      } catch (err) {
        console.error("Failed to process file", err);
        setPreviewText("Preview failed");
        onProcessingChange?.(id, undefined);
      }
    };

    void processFile();

    return () => {
      cancelled = true;
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
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

  const isVideo = file.type.indexOf('video')!=-1
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
    {isVideo ? (
      <video
        src={imageSrc}
        onClick={onClick}
        style={{
          aspectRatio: '1 / 1',
          height: 'auto',
          width: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          borderRadius: '10px',
          cursor: 'pointer',
        }}
      />
    ) : (
      <img
        src={imageSrc}
        alt="Uploaded Preview"
        onClick={onClick}
        style={{
          aspectRatio: '1 / 1',
          height: 'auto',
          width: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'transform 0.1s ease',
        }}
      />
    )}
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
