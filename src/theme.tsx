import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
    interface Palette {
        gray: {
            main: string;
        };
        gunmetal: {
            main: string;
        }
    }
    interface PaletteOptions {
        gray?: {
            main: string;
        };
        gunmetal?: {
            main: string;
        }
    }
}

const theme = createTheme({

    palette: {
        primary: {
            main: "#1976d2", // Primary color
            light: "#42a5f5", // Optional lighter shade
            dark: "#1565c0", // Optional darker shade
            contrastText: "#ffffff", // Text color on primary
        },
        secondary: {
            main: "#9c27b0", // Secondary color
            light: "#ba68c8",
            dark: "#7b1fa2",
            contrastText: "#ffffff",
        },
        gray: {
            main: 'rgb(107, 114, 128)', // Define a custom color
        },
        gunmetal: {
            main: "#374151"
        },
        background: {
            default: "#f5f5f5", // Background color
            paper: "#ffffff",  // Paper background color
        },
    },
});


export default theme;