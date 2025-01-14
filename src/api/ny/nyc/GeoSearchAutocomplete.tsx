import React, { useState, useEffect } from "react";
import { TextField, Autocomplete, CircularProgress } from "@mui/material";
import { Feature, GeoSearchResponse } from "./nyc";

interface GeoSearchProps {
    initial?: GeoSearchResponse,
    onChange?: (resp:GeoSearchResponse, value:Feature) => void
}

const GeoSearchAutocomplete: React.FC<GeoSearchProps> = ({onChange, initial}) => {
  const [open, setOpen] = useState(false);
  const [response,setResponse] = useState<GeoSearchResponse>()
  const [options, setOptions] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(()=> {
    if(initial && initial.features[0].properties.label) {
        setQuery(initial.features[0].properties.label)
    }
  }, [initial])

  // Fetch data from the GeoSearch API
  const fetchGeoSearchResults = async (searchText: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://geosearch.planninglabs.nyc/v2/search?text=${encodeURIComponent(
          searchText
        )}`
      );
      const data:GeoSearchResponse = await response.json();
      setResponse(data)
      setOptions(data.features || []); // Assuming `features` contains the results
    } catch (error) {
      console.error("Error fetching GeoSearch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value:Feature) => {
    if(onChange && response) {
        onChange(response, value)
    }
  }

  useEffect(() => {
    if (query.trim().length > 0) {
      fetchGeoSearchResults(query);
    } else {
      setOptions([]);
    }
  }, [query]);

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      loading={loading}
      onChange={(event,value)=>handleChange(value)}
      getOptionLabel={(option: any) => option.properties.label || ""}
      onInputChange={(event, value) => setQuery(value)}
      isOptionEqualToValue={(option, value) =>
        option.properties.label === value.properties?.label
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Search NYC Address"
          variant="outlined"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li key={option.properties.label} {...props}>
          {option.properties.label} {/* Customize display */}
        </li>
      )}
    />
  );
};

export default GeoSearchAutocomplete;