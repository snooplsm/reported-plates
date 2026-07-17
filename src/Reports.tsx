import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import { Box, Button, CssBaseline, Paper, Stack, TextField, Typography } from "@mui/material";
import { UserView } from "./UserView";
import { BasicDateTimePicker } from "./BasicDateTimePicker";
import { useEffect, useState } from "react";
import ReportsTable from "./ReportsTable";
import { querySubmissions, getStatuses, SimpleReport, Status } from "./Auth";
import { ReportView } from "./ReportView";

const startOfDay = (date?: Date) => {
  if (!date) {
    return undefined
  }
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

const endOfDay = (date?: Date) => {
  if (!date) {
    return undefined
  }
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

export const Reports = () => {

  const [three, setThree] = useState('')
  const [license, setLicense] = useState('')
  const [start, setStart] = useState<Date>()
  const [end, setEnd] = useState<Date>()
  const [reports, setReports] = useState<SimpleReport[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [selectedReport, setSelectedReport] = useState<SimpleReport>()

  const [statuses, setStatuses] = useState<Map<Number, Status>>()

  useEffect(() => {
    getStatuses()
      .then(stats => {
        if (stats) {
          setStatuses(stats)
        }
      })
  }, [])

  const searchReports = (criteria?: {
    license: string,
    reqNumber: string,
    start?: Date,
    end?: Date
  }) => {
    const activeLicense = criteria?.license ?? license.trim()
    const activeReqNumber = criteria?.reqNumber ?? three.trim()
    const activeStart = criteria ? criteria.start : start
    const activeEnd = criteria ? criteria.end : end

    setSearching(true)
    setSearchError('')
    querySubmissions({
      license: activeLicense,
      reqNumber: activeReqNumber,
      startDate: startOfDay(activeStart),
      endDate: endOfDay(activeEnd)
    }).then(result => {
      setReports(result)
      setSearching(false)
    }).catch(e => {
      console.log(e)
      setSearchError('Could not load submissions.')
      setSearching(false)
    })
  }

  useEffect(() => {
    searchReports()
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        p: { xs: 1, md: 1.5 },
      }}>
        <Stack spacing={1.5} sx={{ height: { xs: "auto", md: "calc(100vh - 24px)" } }}>
          <Paper sx={{ p: 1 }}>
            <UserView isSignedIn={true} handleSuccess={() => { }} handleError={() => { }} />
          </Paper>

          <Paper sx={{ p: { xs: 1.5, md: 2 } }}>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Submissions</Typography>
                <Typography variant="body2" color="text.secondary">
                  Search by date range, plate, or 311 request number. Leave everything blank to list all submissions.
                </Typography>
              </Box>
              <Box
                component="form"
                onSubmit={(event) => {
                  event.preventDefault()
                  searchReports()
                }}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "minmax(180px, 1fr) minmax(180px, 1fr) 250px 250px auto auto" },
                  gap: 1,
                  alignItems: "center",
                }}
              >
                <TextField
                  label="311 #"
                  placeholder="311-27688337"
                  value={three}
                  onChange={(e) => setThree(e.currentTarget.value)}
                  size="small"
                />
                <TextField
                  label="License"
                  placeholder="Plate #"
                  value={license}
                  onChange={(e) => setLicense(e.currentTarget.value)}
                  size="small"
                />
                <BasicDateTimePicker onlyDate={true} label="Start date" value={start} onChange={(value) => {
                  setStart(value)
                }} />
                <BasicDateTimePicker onlyDate={true} label="End date" value={end} onChange={(value) => {
                  setEnd(value)
                }} />
                <Button type="submit" variant="contained" disabled={searching}>
                  Search
                </Button>
                <Button
                  variant="outlined"
                  disabled={searching}
                  onClick={() => {
                    setThree('')
                    setLicense('')
                    setStart(undefined)
                    setEnd(undefined)
                    searchReports({
                      license: '',
                      reqNumber: '',
                      start: undefined,
                      end: undefined,
                    })
                  }}
                >
                  Clear
                </Button>
              </Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color={searchError ? "error" : "text.secondary"}>
                  {searchError || `${reports.length} result${reports.length === 1 ? '' : 's'} found`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Sorted most recent first
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          <Box sx={{ flex: 1, minHeight: { xs: 500, md: 0 } }}>
            <ReportsTable
              reports={reports}
              statuses={statuses}
              onReports={(reports) => {
                setReports(reports)
              }}
              onReportClicked={(report) => setSelectedReport(report)}
            />
          </Box>
        </Stack>
      </Box>
      {selectedReport && <ReportView
        onCancel={() => setSelectedReport(undefined)}
        onDeleted={(deletedReport) => {
          setReports((reports) => reports.filter(report => report.id !== deletedReport.id))
        }}
        open={selectedReport != undefined}
        report={selectedReport}
        statuses={statuses}
      />}
    </ThemeProvider>
  )
};
