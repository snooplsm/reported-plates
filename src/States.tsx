export enum State {
    AL = "AL",
    AK = "AK",
    AZ = "AZ",
    AR = "AR",
    CA = "CA",
    CO = "CO",
    CT = "CT",
    DE = "DE",
    FL = "FL",
    GA = "GA",
    HI = "HI",
    ID = "ID",
    IL = "IL",
    IN = "IN",
    IA = "IA",
    KS = "KS",
    KY = "KY",
    LA = "LA",
    ME = "ME",
    MD = "MD",
    MA = "MA",
    MI = "MI",
    MN = "MN",
    MS = "MS",
    MO = "MO",
    MT = "MT",
    NE = "NE",
    NV = "NV",
    NH = "NH",
    NJ = "NJ",
    NM = "NM",
    NY = "NY",
    NC = "NC",
    ND = "ND",
    OH = "OH",
    OK = "OK",
    OR = "OR",
    PA = "PA",
    RI = "RI",
    SC = "SC",
    SD = "SD",
    TN = "TN",
    TX = "TX",
    UT = "UT",
    VT = "VT",
    VA = "VA",
    WA = "WA",
    WV = "WV",
    WI = "WI",
    WY = "WY",
    DIP = "DIP",
    USPS = "USPS",
    NYPD = "NYPD"

  }

  export const NYSTATE = {
    state: State.NY,
    top: {
      bg: "#FFFFFF",
      text: "NEW YORK",
      color: "#0B0C14",
    },
    bottom: {
      bg: "#00000000",
      text: (isTlc:boolean) => (isTlc ? "T&LC" : "EXCELSIOR"),
      color: "#ED9C36",
      altColor: (isTlc:boolean) => (isTlc ? "#0B0C14" : "#ED9C36")
    },
    plate: {
      bg: "#FFF",
      color: "#0B0C14",
    },
  } as StatePres



  export const states: StatePres[] = [
    NYSTATE,
    {
      state: State.PA,
      top: {
        bg: "#0E1756",
        text: "PENNSYLVANIA",
        color: "#FFFFFF",
      },
      bottom: {
        bg: "#F0CA38",
        text: "visitPA.com",
        color: "#000000",
      },
      plate: {
        bg: "#FFFFFF",
        color: "#0E1756",
      },
    },
    {
      state: State.NJ,
      top: {
        bg: "#00000000",
        text: "NEW JERSEY",
        color: "#000",
      },
      bottom: {
        bg: "#00000000",
        text: "Garden State",
        color: "#000",
      },
      plate: {
        bg: "linear-gradient(to bottom, #FFF44F, #FFFFFF)",
        color: "#000",
      },
    },
    {
      state: State.CT,
      top: {
        bg: "#00000000",
        text: "CONNECTICUT",
        color: "#0A142E",
      },
      bottom: {
        bg: "#00000000",
        text: "Constitution State",
        color: "#0A142E",
      },
      plate: {
        bg: "linear-gradient(to bottom, #ADD8E6, #FFFFFF)",
        color: "#0A142E",
      },
    },
    {
      state: State.AL,
      top: { bg: "#00000000", text: "Alabama", color: "#000"},
      bottom: { bg: "#00000000", text: "Heart of Dixie", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.AK,
      top: { bg: "#00000000", text: "Alaska", color: "#000"},
      bottom: { bg: "#00000000", text: "The Last Frontier", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.AZ,
      top: { bg: "#00000000", text: "Arizona", color: "#000"},
      bottom: { bg: "#00000000", text: "Grand Canyon State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.AR,
      top: { bg: "#00000000", text: "Arkansas", color: "#000"},
      bottom: { bg: "#00000000", text: "The Natural State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.CA,
      top: { bg: "#00000000", text: "California", color: "rgb(207,0,32)" },
      bottom: { bg: "#00000000", text: "", color: "#FFF" },
      plate: { bg: "#FFF", color: "#rgb(29,24,74)" },
    },
    {
      state: State.CO,
      top: { bg: "#00000000", text: "Colorado", color: "#000"},
      bottom: { bg: "#00000000", text: "Colorful Colorado", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.CT,
      top: { bg: "#00000000", text: "CONNECTICUT", color: "#0A142E" },
      bottom: { bg: "#00000000", text: "Constitution State", color: "#FFF" },
      plate: { bg: "linear-gradient(to bottom, #ADD8E6, #FFFFFF)", color: "#0A142E" },
    },
    {
      state: State.DE,
      top: { bg: "#00000000", text: "Delaware", color: "#000"},
      bottom: { bg: "#00000000", text: "The First State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.FL,
      top: { bg: "#00000000", text: "Florida", color: "#000"},
      bottom: { bg: "#00000000", text: "Sunshine State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.GA,
      top: { bg: "#00000000", text: "Georgia", color: "#000"},
      bottom: { bg: "#00000000", text: "Peach State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.HI,
      top: { bg: "#00000000", text: "Hawaii", color: "#000"},
      bottom: { bg: "#00000000", text: "Aloha State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.ID,
      top: { bg: "#00000000", text: "Idaho", color: "#000"},
      bottom: { bg: "#00000000", text: "Famous Potatoes", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.IL,
      top: { bg: "#00000000", text: "Illinois", color: "#000"},
      bottom: { bg: "#00000000", text: "Land of Lincoln", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.IN,
      top: { bg: "#00000000", text: "Indiana", color: "#000"},
      bottom: { bg: "#00000000", text: "The Hoosier State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.IA,
      top: { bg: "#00000000", text: "Iowa", color: "#000"},
      bottom: { bg: "#00000000", text: "Hawkeye State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.KS,
      top: { bg: "#00000000", text: "Kansas", color: "#000"},
      bottom: { bg: "#00000000", text: "The Sunflower State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.KY,
      top: { bg: "#00000000", text: "Kentucky", color: "#000"},
      bottom: { bg: "#00000000", text: "Bluegrass State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.LA,
      top: { bg: "#00000000", text: "Louisiana", color: "#000"},
      bottom: { bg: "#00000000", text: "Sportsman's Paradise", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.ME,
      top: { bg: "#00000000", text: "Maine", color: "#000"},
      bottom: { bg: "#00000000", text: "Vacationland", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.MD,
      top: { bg: "#00000000", text: "Maryland", color: "#000"},
      bottom: { bg: "#00000000", text: "Maryland", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.MA,
      top: { bg: "#00000000", text: "Massachusetts", color: "#000"},
      bottom: { bg: "#00000000", text: "The Spirit of America", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.MI,
      top: { bg: "#00000000", text: "Michigan", color: "#000"},
      bottom: { bg: "#00000000", text: "Great Lakes State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.MN,
      top: { bg: "#00000000", text: "Minnesota", color: "#000"},
      bottom: { bg: "#00000000", text: "10,000 Lakes", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.MS,
      top: { bg: "#00000000", text: "Mississippi", color: "#000"},
      bottom: { bg: "#00000000", text: "Birthplace of America's Music", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.MO,
      top: { bg: "#00000000", text: "Missouri", color: "#000"},
      bottom: { bg: "#00000000", text: "Show-Me State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.MT,
      top: { bg: "#00000000", text: "Montana", color: "#000"},
      bottom: { bg: "#00000000", text: "Big Sky Country", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.NE,
      top: { bg: "#00000000", text: "Nebraska", color: "#000"},
      bottom: { bg: "#00000000", text: "The Good Life", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.NV,
      top: { bg: "#00000000", text: "Nevada", color: "#000"},
      bottom: { bg: "#00000000", text: "The Silver State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.NH,
      top: { bg: "#00000000", text: "New Hampshire", color: "#000"},
      bottom: { bg: "#00000000", text: "Live Free or Die", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.NM,
      top: { bg: "#00000000", text: "New Mexico", color: "#000"},
      bottom: { bg: "#00000000", text: "Land of Enchantment", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.NC,
      top: { bg: "#00000000", text: "North Carolina", color: "#000"},
      bottom: { bg: "#00000000", text: "First in Flight", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.ND,
      top: { bg: "#00000000", text: "North Dakota", color: "#000"},
      bottom: { bg: "#00000000", text: "Legendary", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.OH,
      top: { bg: "#00000000", text: "Ohio", color: "#000"},
      bottom: { bg: "#00000000", text: "Birthplace of Aviation", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.OK,
      top: { bg: "#00000000", text: "Oklahoma", color: "#000"},
      bottom: { bg: "#00000000", text: "Native America", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.OR,
      top: { bg: "#00000000", text: "Oregon", color: "#000"},
      bottom: { bg: "#00000000", text: "Pacific Wonderland", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.RI,
      top: { bg: "#00000000", text: "Rhode Island", color: "#000"},
      bottom: { bg: "#00000000", text: "Ocean State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.SC,
      top: { bg: "#00000000", text: "South Carolina", color: "#000"},
      bottom: { bg: "#00000000", text: "Smiling Faces. Beautiful Places.", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.SD,
      top: { bg: "#00000000", text: "South Dakota", color: "#000"},
      bottom: { bg: "#00000000", text: "Great Faces. Great Places.", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.TN,
      top: { bg: "#00000000", text: "Tennessee", color: "#000"},
      bottom: { bg: "#00000000", text: "The Volunteer State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.TX,
      top: { bg: "#00000000", text: "Texas", color: "#000"},
      bottom: { bg: "#00000000", text: "The Lone Star State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.UT,
      top: { bg: "#00000000", text: "Utah", color: "#000"},
      bottom: { bg: "#00000000", text: "Greatest Snow on Earth", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.VT,
      top: { bg: "#00000000", text: "Vermont", color: "#000"},
      bottom: { bg: "#00000000", text: "Green Mountain State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.VA,
      top: { bg: "#00000000", text: "Virginia", color: "#000"},
      bottom: { bg: "#00000000", text: "Virginia is for Lovers", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.WA,
      top: { bg: "#00000000", text: "Washington", color: "#000"},
      bottom: { bg: "#00000000", text: "Evergreen State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.WV,
      top: { bg: "#00000000", text: "West Virginia", color: "#000"},
      bottom: { bg: "#00000000", text: "Wild, Wonderful", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.WI,
      top: { bg: "#00000000", text: "Wisconsin", color: "#000"},
      bottom: { bg: "#00000000", text: "America's Dairyland", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {
      state: State.WY,
      top: { bg: "#00000000", text: "Wyoming", color: "#000"},
      bottom: { bg: "#00000000", text: "The Equality State", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },
    },
    {state: State.DIP,
      top: { bg: "#00000000", text: "Diplomatic", color: "#000"},
      bottom: { bg: "#00000000", text: "Diplomatic Plate", color: "#FFF" },
      plate: { bg: "#FFF", color: "#000" },},
      {
        state: State.USPS, // Add USPS to your State enum if not already present
        top: { bg: "#00000000", text: "USPS", color: "#000"},
        bottom: { bg: "#00000000", text: "United States Postal Service", color: "#000" },
        plate: { bg: "#FFF", color: "#000" },
      },
      // NYPD Plate
      {
        state: State.NYPD, // Add NYPD to your State enum if not already present
        top: { bg: "#00000000", text: "NYPD", color: "#000"},
        bottom: { bg: "#00000000", text: "New York Police Department", color: "#FFF" },
        plate: { bg: "#000080", color: "#FFF" }, // Blue background with white text
      },
    // Add remaining states in the same format
  ];

  export interface StatePres {
    top:StateColor
    bottom:StateColor
    plate:StateColor,
    state:State    
  }

  export interface StateColor {
    bg?: string,
    color: string,
    altColor?:  ((isTlc?: boolean) => string | undefined)
    text?: string | ((isTlc?: boolean) => string)
  }