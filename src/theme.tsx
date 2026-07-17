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

    shape: {
        borderRadius: 8,
    },
    typography: {
        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        button: {
            letterSpacing: 0,
            textTransform: "none",
            fontWeight: 700,
        },
    },
    palette: {
        primary: {
            main: "#0f6fb2", // Primary color
            light: "#4d9add", // Optional lighter shade
            dark: "#0b4f80", // Optional darker shade
            contrastText: "#ffffff", // Text color on primary
        },
        secondary: {
            main: "#0f766e", // Secondary color
            light: "#2aa198",
            dark: "#0a5651",
            contrastText: "#ffffff",
        },
        gray: {
            main: 'rgb(107, 114, 128)', // Define a custom color
        },
        gunmetal: {
            main: "#374151"
        },
        background: {
            default: "#eef2f6", // Background color
            paper: "#ffffff",  // Paper background color
        },
        text: {
            primary: "#172033",
            secondary: "#5f6c7b",
        },
        divider: "#d8e0ea",
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: "#eef2f6",
                },
            },
        },
        MuiPaper: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: {
                    border: "1px solid #d8e0ea",
                    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06), 0 10px 28px rgba(15, 23, 42, 0.05)",
                },
            },
        },
        MuiCard: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: {
                    border: "1px solid #d8e0ea",
                    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06), 0 10px 28px rgba(15, 23, 42, 0.05)",
                },
            },
        },
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {
                    letterSpacing: 0,
                    textTransform: "none",
                    fontWeight: 700,
                },
                containedPrimary: {
                    backgroundColor: "#0f6fb2",
                    "&:hover": {
                        backgroundColor: "#0b4f80",
                    },
                },
                outlined: {
                    borderColor: "#c6d1dd",
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    "& .MuiOutlinedInput-root": {
                        backgroundColor: "#ffffff",
                        "& fieldset": {
                            borderColor: "#c6d1dd",
                        },
                        "&:hover fieldset": {
                            borderColor: "#8ca2b8",
                        },
                    },
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    border: "1px solid #d8e0ea",
                },
            },
        },
        MuiLinearProgress: {
            styleOverrides: {
                root: {
                    backgroundColor: "#cdd8e4",
                },
            },
        },
    },
});


export default theme;
