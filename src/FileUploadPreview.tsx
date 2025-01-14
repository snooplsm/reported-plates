import { useEffect, useState } from 'react';

interface FileProps {
  file: File
}

export const FileUploadPreview = ({file}:FileProps) => {
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
        style={{ width: '50%', objectFit: "cover", objectPosition: "center", height: "100%", borderRadius: '10px' }}
    />
  );
};

export default FileUploadPreview;