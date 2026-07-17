import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';
import { Button, Stack } from '@mui/material';
import { deleteReport, SimpleReport, Status } from './Auth';
import moment from 'moment';

function formatCustomDate(date: Date, showAgo = true) {
    const now = moment();
    const givenDate = moment(date);

    const daysAgo = now.diff(givenDate, "days");
    const hoursAgo = now.diff(givenDate, "hours") % 24;
    const formattedDate = givenDate.format("MM/D/YY h:mma");

    let timeAgo = "";
    if (showAgo) {
        if (daysAgo > 0) {
            timeAgo = `(${daysAgo}d ${hoursAgo}h ago)`;
        } else {
            timeAgo = `(${hoursAgo}h ago)`;
        }
    }

    return `${formattedDate} ${timeAgo}`.trim();
}

const paginationModel = { page: 0, pageSize: 10 };

interface ReportProps {
    reports?: SimpleReport[],
    onReports?: (reports:SimpleReport[]) => void,
    onReportClicked?: (report: SimpleReport) => void,
    statuses?: Map<Number, Status>
}

const canDeleteReport = (report: SimpleReport) => {
    return !report.reqnumber && Number(report.status ?? 0) === 0
}

export default function ReportsTable({ reports, onReports = () => {}, statuses, onReportClicked = () => { } }: ReportProps) {
    const columns: GridColDef[] = [
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            sortable: false,
            filterable: false,
            renderCell: (params) => {
                const report = params.row as SimpleReport
                return (<Stack direction="row" spacing={0.75} alignItems="center" sx={{ height: "100%" }}>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={(event) => {
                            event.stopPropagation()
                            onReportClicked(report)
                        }}
                    >
                        View
                    </Button>
                    {canDeleteReport(report) && <Button
                        size="small"
                        color="error"
                        onClick={(event) => {
                            event.stopPropagation()
                            deleteReport(report.id)
                                .then(ok=> {
                                    if(ok) {
                                        const newReports = [...reports || []].filter(x=>x.id!=report.id)
                                        onReports(newReports)
                                    }
                                }).catch(console.log)
                        }}
                    >
                        Delete
                    </Button>}
                </Stack>)
            }
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 160,
            valueGetter: (value: any) => {
                return statuses && statuses.get(value)?.text || "Not yet submitted"
            },
        },
        { field: 'reqnumber', headerName: '311 #', width: 150 },
        {
            field: 'license',
            headerName: 'Plate',
            valueGetter: (_: any, row: any) => {
                return `${row.license || ''}${row.state ? `:${row.state}` : ''}`
            },
            width: 140
        },
        { field: 'typeofcomplaint', headerName: 'Complaint', width: 180 },
        { field: 'loc1_address', headerName: 'Address', flex: 1, minWidth: 260 },
        {
            field: 'timeofreport',
            headerName: 'Date',
            valueGetter: (value: any) => value ? new Date(value) : null,
            valueFormatter: (value: any) => value ? formatCustomDate(value, true) : '',
            width: 210,
        },
        {
            field: 'files',
            headerName: 'Files',
            width: 90,
            valueGetter: (value: any) => value?.length || 0

        }
    ];

    return (
        <Paper sx={{ height: "100%", width: '100%', overflow: "hidden" }}>
            <DataGrid
                rows={reports || []}
                columns={columns}
                initialState={{
                    pagination: { paginationModel },
                    sorting: { sortModel: [{ field: 'timeofreport', sort: 'desc' }] },
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                disableRowSelectionOnClick
                onRowDoubleClick={(params) => onReportClicked(params.row as SimpleReport)}
                sx={{
                    border: 0,
                    '& .MuiDataGrid-columnHeaders': {
                        bgcolor: '#f8fafc',
                    },
                    '& .MuiDataGrid-row:hover': {
                        cursor: 'pointer',
                    },
                }}
            />
        </Paper>
    );
}
