import * as React from 'react';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { Box } from '@mui/material';

interface PickerOptions {
  onChange: (date:Date) => void
  value?: Date
  label?: string
  onlyDate?: boolean
}

export const BasicDateTimePicker = ({onChange, value, onlyDate = false, label}:PickerOptions) => {
  return (
    <Box sx={{
      paddingTop: 2,
      paddingBottom: 2
    }}>
    <LocalizationProvider dateAdapter={AdapterDayjs}>
        {onlyDate==undefined || onlyDate==false &&<DateTimePicker value={value && dayjs(value)} onChange={(value)=> {          
          const date = value?.toDate()
          if(date) {
            onChange?.(date)
          }
          }} label={label || "Time of incident"} />}
                  {onlyDate===true && <DatePicker value={value && dayjs(value)} onChange={(value)=> {          
          const date = value?.toDate()
          if(date) {
            onChange?.(date)
          }
          }} label={label || "Time of incident"} />}
    </LocalizationProvider>
    </Box>
  );
}