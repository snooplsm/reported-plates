import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Reports } from './Reports.tsx';

if (process.env.NODE_ENV === "production") {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="728528457365-gvkq2phpioo23umg6q0ivtp1aeagdt09.apps.googleusercontent.com">
      <Router>
        <Routes>
          <Route path="/" element={<App/>} />
          <Route path="/reports" element={<Reports/>}/>
        </Routes>
    </Router>   
    </GoogleOAuthProvider>
  </StrictMode>,
)