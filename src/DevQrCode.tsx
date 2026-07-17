import { Box, IconButton, Paper, Tooltip, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import { useEffect, useState } from 'react'

export const DevQrCode = () => {
  const [imageUrl, setImageUrl] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const lanUrl = import.meta.env.VITE_DEV_LAN_URL as string

  useEffect(() => {
    if (!import.meta.env.DEV || !lanUrl) return
    let cancelled = false
    import('qrcode').then(({ default: QRCode }) =>
      QRCode.toDataURL(lanUrl, {
        width: 184,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
    ).then(url => {
      if (!cancelled) setImageUrl(url)
    }).catch(console.log)
    return () => { cancelled = true }
  }, [lanUrl])

  if (!import.meta.env.DEV || !lanUrl) return null

  if (collapsed) {
    return <Tooltip title="Show phone QR code">
      <IconButton
        aria-label="Show phone QR code"
        onClick={() => setCollapsed(false)}
        sx={{
          display: { xs: 'none', md: 'inline-flex' },
          position: 'fixed',
          zIndex: 1500,
          right: 16,
          bottom: 16,
          bgcolor: 'background.paper',
          boxShadow: 4,
          '&:hover': { bgcolor: 'background.paper' },
        }}
      >
        <QrCode2Icon />
      </IconButton>
    </Tooltip>
  }

  return <Paper sx={{
    display: { xs: 'none', md: 'block' },
    position: 'fixed',
    zIndex: 1500,
    right: 16,
    bottom: 16,
    width: 216,
    p: 1.5,
    borderRadius: 1,
    boxShadow: 5,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Open on phone</Typography>
      <IconButton size="small" aria-label="Hide phone QR code" onClick={() => setCollapsed(true)}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
    {imageUrl && <Box component="img" src={imageUrl} alt="QR code for development site" sx={{
      width: '100%',
      display: 'block',
      imageRendering: 'pixelated',
    }} />}
    <Typography variant="caption" sx={{ display: 'block', mt: 1, overflowWrap: 'anywhere', color: 'text.secondary' }}>
      {lanUrl}
    </Typography>
  </Paper>
}
