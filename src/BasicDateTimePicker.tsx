import * as React from 'react';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';

interface PickerOptions {
  onChange: (date:Date) => void
  value?: Date
}

export const BasicDateTimePicker = ({onChange, value}:PickerOptions) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DemoContainer components={['DateTimePicker']}>
        <DateTimePicker value={dayjs(value)} onChange={(value)=> {          
          const date = value?.toDate()
          if(date) {
            onChange?.(date)
          }
          }} label="Time of incident" />
      </DemoContainer>
    </LocalizationProvider>
  );
}