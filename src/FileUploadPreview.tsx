import { useEffect, useState } from 'react';

interface FileProps {
  file: File,
  onClick: ()=>void
}

export const FileUploadPreview = ({file, onClick}:FileProps) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(()=> {
    const blobUrl = URL.createObjectURL(file);
    setImageSrc(blobUrl);
  },[file])

  if(!imageSrc) {
    return null
  }
  return (    
    <img
        src={imageSrc}
        alt="Uploaded Preview"
        onClick={onClick}
        style={{ 
          aspectRatio: "1/1",
          height: "auto",
          width: '33%', objectFit: "cover", objectPosition: "center", borderRadius: '10px' }}
    />
  );
};

export default FileUploadPreview;