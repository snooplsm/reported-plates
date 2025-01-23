import { ThemeProvider } from "@emotion/react";
import theme from "./theme";
import { Box, CssBaseline, Paper, TextField } from "@mui/material";
import { UserView } from "./UserView";
import { BasicDateTimePicker } from "./BasicDateTimePicker";
import { useEffect, useState } from "react";
import ReportsTable from "./ReportsTable";
import { querySubmissions, getStatuses, SimpleReport, Status } from "./Auth";
import { ReportView } from "./ReportView";

export const Reports = () => {

  const [three, setThree] = useState('')
  const [license, setLicnese] = useState('')
  const [start, setStart] = useState<Date>()
  const [end, setEnd] = useState<Date>()
  const [reports, setReports] = useState<SimpleReport[]>()

  const [selectedReport, setSelectedReport] = useState<SimpleReport>()

  const [statuses, setStatuses] = useState<Map<number,Status>>()

  useEffect(()=> {
    getStatuses()
    .then(stats=> {
      if(stats) {
        setStatuses(stats)
      }
    })
  },[])


  useEffect(() => {
    const start = new Date()
    start.setFullYear(start.getFullYear()-1)
    start.setHours(0,0,0,0)
    // setStart(start)
    const now = new Date()
    const later = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    // setEnd(later)
  },[])

  useEffect(() => {
    const handler = setTimeout(() => {
      querySubmissions({
        license: license.trim(),
        reqNumber: three.trim(),
        startDate: start,
        endDate: end
      }).then(result=> {
          setReports(result)
      }).catch(console.log)
    }, 400); // 500ms debounce time
    return () => {
      clearTimeout(handler);
    };
  }, [three, license, start, end])

  return (
    <ThemeProvider theme={theme}>
  <CssBaseline />
  
  {/* Fixed Header */}
  <Box
    width="100%"
    sx={{
      position: "fixed", // Fixes the header to the top
      top: 0, // Positions it at the top
      zIndex: 10, // Ensures it's above other content
      backgroundColor: "background.paper", // Matches theme background
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)", // Optional: Adds shadow
    }}
  >
    <UserView isSignedIn={true} handleSuccess={(data) => {}} handleError={() => {}} />
    <Box sx={{
      padding: 1,
      display: "flex",
      alignItems: "center",
      gap: .5
    }}>
    <TextField label="311#" placeholder="311 request #" value={three} onChange={(e)=>setThree(e.currentTarget.value)}/>
    <TextField label="License#" placeholder="License Plate #" value={license} onChange={(e)=>setLicnese(e.currentTarget.value)}/>
    <Box sx={{
      width: "250px"
    }}>
    <BasicDateTimePicker onlyDate={true} label="Start date/time" value={start} onChange={(value) => {
                  setStart(value)
                }} />    
    </Box>
    <Box sx={{
      width: "250px"
    }}>
    <BasicDateTimePicker onlyDate={true} label="End date/time" value={end} onChange={(value) => {
                  setEnd(value)
                }} />
    </Box>
    <Box sx={{
      width: "200px"
    }}>
    {/* <GeoSearchAutocomplete/> */}
    </Box>
    </Box>
  </Box>
  
  {/* Main Content */}
  <Box
    display="flex"
    sx={{
      marginTop: "200px", // Add margin to prevent overlap (adjust height of UserView if needed)
      "& > *": {
        margin: 1, // Apply margin to all children
      },
    }}
    height="100vh"
  >    
    <ReportsTable reports={reports} onReports={(reports)=> {
      setReports(reports)
    }} onReportClicked={(report)=> setSelectedReport(report)}/>
  </Box>
  {selectedReport && <ReportView onCancel={()=>setSelectedReport(undefined)} open={selectedReport!=undefined} report={selectedReport}/>}
</ThemeProvider>
  )
};
