import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography, useMediaQuery } from '@mui/material';
import PhotoCameraBackIcon from '@mui/icons-material/PhotoCameraBack';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useEffect, useMemo, useRef, useState } from 'react';

interface PickerOptions {
  onChange: (date: Date) => void
  value?: Date
  label?: string
  onlyDate?: boolean
  onExtractFromPhoto?: () => Promise<Date | undefined>
}

type DateParts = {
  month: string
  day: string
  year: string
  hour: string
  minute: string
  period: string
}

const emptyParts: DateParts = {
  month: '',
  day: '',
  year: '',
  hour: '',
  minute: '',
  period: '',
}

const partsFromDate = (date?: Date): DateParts => {
  if (!date || Number.isNaN(date.getTime())) return emptyParts
  const hours = date.getHours()
  return {
    month: String(date.getMonth() + 1),
    day: String(date.getDate()),
    year: String(date.getFullYear()),
    hour: String(hours % 12 || 12),
    minute: String(date.getMinutes()),
    period: hours >= 12 ? 'PM' : 'AM',
  }
}

const daysInMonth = (month: string, year: string) => {
  if (!month || !year) return 31
  return new Date(Number(year), Number(month), 0).getDate()
}

const buildDate = (parts: DateParts, onlyDate: boolean) => {
  if (!parts.month || !parts.day || !parts.year) return undefined
  if (!onlyDate && (!parts.hour || !parts.minute || !parts.period)) return undefined

  let hour = onlyDate ? 0 : Number(parts.hour) % 12
  if (!onlyDate && parts.period === 'PM') hour += 12
  const date = new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    onlyDate ? 0 : Number(parts.minute),
  )
  return Number.isNaN(date.getTime()) ? undefined : date
}

const range = (start: number, count: number) => Array.from({ length: count }, (_, index) => start + index)
const WHEEL_ITEM_HEIGHT = 44
const WHEEL_HEIGHT = 220
const WHEEL_PADDING = (WHEEL_HEIGHT - WHEEL_ITEM_HEIGHT) / 2

type WheelSpinnerProps = {
  label: string
  options: Array<number | string>
  value: string
  onChange: (value: string) => void
  format?: (value: number | string) => string
}

const WheelSpinner = ({ label, options, value, onChange, format }: WheelSpinnerProps) => {
  const wheelRef = useRef<HTMLDivElement | null>(null)
  const scrollTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const index = options.findIndex(option => String(option) === value)
    if (wheelRef.current && index >= 0) {
      wheelRef.current.scrollTo({ top: index * WHEEL_ITEM_HEIGHT, behavior: 'auto' })
    }
  }, [options, value])

  useEffect(() => () => {
    if (scrollTimerRef.current != null) window.clearTimeout(scrollTimerRef.current)
  }, [])

  return <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" sx={{ display: 'block', mb: 0.5, textAlign: 'center', fontSize: '0.68rem', fontWeight: 800 }}>
      {label}
    </Typography>
    <Box sx={{ position: 'relative', height: WHEEL_HEIGHT }}>
      <Box
        ref={wheelRef}
        role="listbox"
        aria-label={label}
        onScroll={(event) => {
          if (scrollTimerRef.current != null) window.clearTimeout(scrollTimerRef.current)
          const target = event.currentTarget
          scrollTimerRef.current = window.setTimeout(() => {
            const index = Math.max(0, Math.min(options.length - 1, Math.round(target.scrollTop / WHEEL_ITEM_HEIGHT)))
            const next = String(options[index])
            target.scrollTo({ top: index * WHEEL_ITEM_HEIGHT, behavior: 'smooth' })
            if (next !== value) onChange(next)
          }, 70)
        }}
        sx={{
          height: '100%',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none',
          border: '1px solid rgba(15, 23, 42, 0.14)',
          borderRadius: 1,
          bgcolor: '#fff',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Box sx={{ height: WHEEL_PADDING }} />
        {options.map(option => {
          const selected = String(option) === value
          return <Box
            component="button"
            type="button"
            role="option"
            aria-selected={selected}
            key={option}
            onClick={() => onChange(String(option))}
            sx={{
              width: '100%',
              height: WHEEL_ITEM_HEIGHT,
              display: 'block',
              p: 0,
              border: 0,
              bgcolor: 'transparent',
              color: selected ? '#166534' : '#64748b',
              font: 'inherit',
              fontSize: selected ? '1rem' : '0.82rem',
              fontWeight: selected ? 800 : 500,
              letterSpacing: 0,
              scrollSnapAlign: 'center',
            }}
          >
            {format ? format(option) : option}
          </Box>
        })}
        <Box sx={{ height: WHEEL_PADDING }} />
      </Box>
      <Box sx={{
        position: 'absolute',
        zIndex: 2,
        pointerEvents: 'none',
        left: 0,
        right: 0,
        top: WHEEL_PADDING,
        height: WHEEL_ITEM_HEIGHT,
        borderTop: '2px solid #16a34a',
        borderBottom: '2px solid #16a34a',
        bgcolor: 'rgba(240, 253, 244, 0.35)',
      }} />
    </Box>
  </Box>
}

export const BasicDateTimePicker = ({ onChange, value, onlyDate = false, label, onExtractFromPhoto }: PickerOptions) => {
  const isMobile = useMediaQuery('(max-width:900px)')
  const [parts, setParts] = useState<DateParts>(() => partsFromDate(value))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const valueTime = value?.getTime()
  const currentYear = new Date().getFullYear()
  const years = useMemo(() => range(currentYear - 20, 22).reverse(), [currentYear])
  const dayCount = daysInMonth(parts.month, parts.year)

  useEffect(() => {
    setParts(partsFromDate(value))
  }, [valueTime])

  const updatePart = (field: keyof DateParts, nextValue: string) => {
    const next = { ...parts, [field]: nextValue }
    const maxDay = daysInMonth(next.month, next.year)
    if (next.day && Number(next.day) > maxDay) next.day = String(maxDay)
    setParts(next)
    const nextDate = buildDate(next, onlyDate)
    if (nextDate) onChange(nextDate)
  }

  const spinner = (
    field: keyof DateParts,
    fieldLabel: string,
    values: Array<number | string>,
    format?: (value: number | string) => string,
    commitChange = true,
  ) => (
    <TextField
      select
      fullWidth
      size="small"
      label={fieldLabel}
      value={parts[field]}
      onChange={(event) => {
        if (commitChange) {
          updatePart(field, event.target.value)
          return
        }
        const next = { ...parts, [field]: event.target.value }
        const maxDay = daysInMonth(next.month, next.year)
        if (next.day && Number(next.day) > maxDay) next.day = String(maxDay)
        setParts(next)
      }}
      SelectProps={{ native: true }}
      InputLabelProps={{ shrink: true }}
      sx={{ minWidth: 0 }}
    >
      <option value="" />
      {values.map(option => (
        <option key={option} value={option}>{format ? format(option) : option}</option>
      ))}
    </TextField>
  )

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
        {label || (onlyDate ? 'Date' : 'Time of incident')}
      </Typography>
      {!onlyDate ? <>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<CalendarMonthIcon />}
          onClick={() => {
            setParts(partsFromDate(value || new Date()))
            setPickerOpen(true)
          }}
          sx={{
            minHeight: 52,
            justifyContent: 'flex-start',
            px: 1.5,
            textTransform: 'none',
            fontWeight: value ? 700 : 500,
          }}
        >
          {value ? value.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }) : 'Select date and time'}
        </Button>
        {extractError && <Typography color="error" variant="caption" sx={{ display: 'block', mt: 0.5 }}>
          {extractError}
        </Typography>}
        <Dialog
          fullScreen={isMobile}
          fullWidth
          maxWidth="md"
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
        >
          <DialogTitle sx={{ fontWeight: 800 }}>Time of incident</DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr) minmax(0, 4fr) minmax(0, 2fr) minmax(0, 2fr) minmax(0, 2fr)',
              gap: 0.5,
            }}>
              <WheelSpinner label="Month" options={range(1, 12)} value={parts.month} onChange={value => {
                const next = { ...parts, month: value }
                const maxDay = daysInMonth(next.month, next.year)
                if (Number(next.day) > maxDay) next.day = String(maxDay)
                setParts(next)
              }} format={option => new Date(2000, Number(option) - 1).toLocaleString([], { month: 'short' })} />
              <WheelSpinner label="Day" options={range(1, dayCount)} value={parts.day} onChange={value => setParts(current => ({ ...current, day: value }))} />
              <WheelSpinner label="Year" options={years} value={parts.year} onChange={value => setParts(current => ({ ...current, year: value }))} />
              <WheelSpinner label="Hour" options={range(1, 12)} value={parts.hour} onChange={value => setParts(current => ({ ...current, hour: value }))} />
              <WheelSpinner label="Min" options={range(0, 60)} value={parts.minute} onChange={value => setParts(current => ({ ...current, minute: value }))} format={option => String(option).padStart(2, '0')} />
              <WheelSpinner label="AM/PM" options={['AM', 'PM']} value={parts.period} onChange={value => setParts(current => ({ ...current, period: value }))} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setPickerOpen(false)} color="secondary">Cancel</Button>
            <Button
              variant="contained"
              disabled={!buildDate(parts, false)}
              onClick={() => {
                const next = buildDate(parts, false)
                if (next) onChange(next)
                setPickerOpen(false)
              }}
            >
              Done
            </Button>
          </DialogActions>
        </Dialog>
      </> : <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', sm: onlyDate ? 'repeat(3, minmax(0, 1fr))' : 'repeat(6, minmax(0, 1fr))' },
        gap: 1,
      }}>
        {spinner('month', 'Month', range(1, 12))}
        {spinner('day', 'Day', range(1, dayCount))}
        {spinner('year', 'Year', years)}
        {!onlyDate && spinner('hour', 'Hour', range(1, 12))}
        {!onlyDate && spinner('minute', 'Minute', range(0, 60), value => String(value).padStart(2, '0'))}
        {!onlyDate && spinner('period', 'AM/PM', ['AM', 'PM'])}
      </Box>}
      {!onlyDate && onExtractFromPhoto && <Button
        size="small"
        startIcon={<PhotoCameraBackIcon />}
        disabled={extracting}
        onClick={() => {
          setExtracting(true)
          setExtractError('')
          onExtractFromPhoto()
            .then(date => {
              if (date) onChange(date)
              else setExtractError('The selected photo does not include a capture time.')
            })
            .catch(() => setExtractError('Could not read the selected photo time.'))
            .finally(() => setExtracting(false))
        }}
        sx={{ mt: 1, textTransform: 'none' }}
      >
        {extracting ? 'Reading photo...' : 'Use selected photo time'}
      </Button>}
    </Box>
  )
}
