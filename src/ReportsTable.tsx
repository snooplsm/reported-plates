import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';
import { deleteReport, SimpleReport, Status } from './Auth';
import moment from 'moment';
import { IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import React, { useState } from 'react';

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

const paginationModel = { page: 0, pageSize: 5 };

interface ReportProps {
    reports?: SimpleReport[],
    onReports?: (reports:SimpleReport[]) => void,
    onReportClicked?: (report: SimpleReport) => void,
    statuses?: Map<Number, Status>
}

export default function ReportsTable({ reports, onReports = (reports) => {}, statuses, onReportClicked = (report) => { } }: ReportProps) {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    const columns: GridColDef[] = [
        {
            field: 'id', headerName: 'Actions', width: 70,
            renderCell: (params) => {
                return (<div>
                    <IconButton
                        aria-label="more"
                        id="long-button"
                        aria-controls={open ? 'long-menu' : undefined}
                        aria-expanded={open ? 'true' : undefined}
                        aria-haspopup="true"
                        onClick={handleClick}
                    >
                        <MoreVertIcon />
                    </IconButton>
                    <Menu
                        id="long-menu"
                        MenuListProps={{
                            'aria-labelledby': 'long-button',
                        }}
                        anchorEl={anchorEl}
                        open={open}
                        onClose={handleClose}
                        slotProps={{
                            paper: {
                                style: {
                                    // maxHeight: ITEM_HEIGHT * 4.5,
                                    width: '20ch',
                                },
                            },
                        }}
                    >
                        {(params.row.status==undefined || params.row.status==0) && <MenuItem key={'delete'} onClick={() => {
                            deleteReport(params.row.id)
                            .then(ok=> {
                                if(ok) {
                                    const newReports = [...reports || []].filter(x=>x.id!=params.row.id)
                                    onReports(newReports)
                                }
                                handleClose()
                            }).catch(k=> {
                                handleClose()
                            })
                        }}>
                            Delete
                        </MenuItem>}
                        <MenuItem key={'view'} onClick={() => {
                            onReportClicked(params.row)
                            handleClose()
                        }}>
                            View
                        </MenuItem>

                    </Menu>
                </div>)
            }
        }
        ,
        {
            field: 'status', headerName: 'Status', width: 140,
            valueGetter: (value: any, row: any) => {
                return statuses && statuses.get(value)?.text || "Not yet submitted"
            },
        },
        { field: 'reqnumber', headerName: '311#', width: 140 },
        { field: 'license', headerName: 'License #', 
            valueGetter: (value: any, row: any) => {
                return `${row.license}:${row.state}`
            },
            width: 150 },
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

    return (
        <Paper sx={{ height: "70%", width: '100%' }}>
            <DataGrid
                // onCellClick={(cell) => {
                //     onReportClicked(cell.row as SimpleReport)
                // }}
                rows={reports || []}
                columns={columns}
                initialState={{ pagination: { paginationModel } }}
                checkboxSelection
                sx={{ border: 0 }}
            />
        </Paper>
    );
}