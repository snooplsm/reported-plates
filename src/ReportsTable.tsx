import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';
import { SimpleReport } from './Auth';
import moment from 'moment';

function formatCustomDate(date: Date, showAgo = true) {
    const now = moment();
    const givenDate = moment(date);

    const daysAgo = now.diff(givenDate, "days");
    const hoursAgo = now.diff(givenDate, "hours") % 24; // Remaining hours after subtracting days

    const formattedDate = givenDate.format("MM/D/YY h:mma \\(dddd\\)"); // Main date format

    let timeAgo = "";
    if (showAgo) {
        if (daysAgo > 0) {
            timeAgo = `(${daysAgo}d${hoursAgo}h ago)`;
        } else {
            timeAgo = `(${hoursAgo}h ago)`;
        }
    }

    return `${formattedDate} ${timeAgo}`.trim();
}

const columns: GridColDef[] = [
    { field: 'reqnumber', headerName: '311#', width: 140 },
    { field: 'license', headerName: 'License #', width: 150 },
    { field: 'loc1_address', headerName: 'Address', width: 350 },
    {
        field: 'timeofreport',
        headerName: 'Date',
        valueGetter: (value: any, row: any) => {
            return formatCustomDate(value, true)
        },
        width: 400,
    },
    {
        field: 'files', headerName: 'Photos', width: 100,
        valueGetter: (value: any, row: any) => value.length

    }
];

const paginationModel = { page: 0, pageSize: 5 };

interface ReportProps {
    reports?: SimpleReport[]
    onReportClicked?: (report:SimpleReport) => void
}

export default function ReportsTable({ reports, onReportClicked = (report) => {} }: ReportProps) {
    return (
        <Paper sx={{ height: "70%", width: '100%' }}>
            <DataGrid
            onCellClick={(cell)=> {                
                onReportClicked(cell.row as SimpleReport)
            }}
                rows={reports || []}
                columns={columns}
                initialState={{ pagination: { paginationModel } }}
                checkboxSelection
                sx={{ border: 0 }}
            />
        </Paper>
    );
}