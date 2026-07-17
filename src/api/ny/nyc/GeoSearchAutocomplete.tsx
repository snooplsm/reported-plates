import React, { useState, useEffect, useRef } from "react";
import { TextField, Autocomplete, CircularProgress } from "@mui/material";
import { Feature, GeoSearchResponse } from "./nyc";

interface GeoSearchProps {
    initial?: GeoSearchResponse,
    onChange?: (resp:GeoSearchResponse, value:Feature) => void
    onClear?: () => void
}

export const GeoSearchAutocomplete: React.FC<GeoSearchProps> = ({ onChange, onClear, initial }) => {
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState<GeoSearchResponse>();
  const [options, setOptions] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedValue, setSelectedValue] = useState<Feature>();
  const [inputValue, setInputValue] = useState<string>("");
  const inputFocusedRef = useRef(false);

  useEffect(() => {
    const initialFeature = initial?.features?.[0];
    if (!initialFeature || inputFocusedRef.current) {
      return;
    }
    setOptions((currentOptions) => {
      if (currentOptions.some((option) => option.properties.id === initialFeature.properties.id)) {
        return currentOptions;
      }
      return [initialFeature, ...currentOptions];
    });
    setSelectedValue(initialFeature);
    setInputValue(initialFeature.properties.label || "");
  }, [initial]);

  useEffect(() => {
    const searchText = inputValue.trim();
    if (selectedValue?.properties.label === inputValue) {
      setLoading(false);
      return;
    }

    if (searchText.length === 0) {
      setResponse(undefined);
      setOptions(initial?.features || []);
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    const timeout = window.setTimeout(() => {
      const fetchGeoSearchResults = async () => {
        try {
          setLoading(true);
          const response = await fetch(
            `https://geosearch.planninglabs.nyc/v2/search?text=${encodeURIComponent(searchText)}`,
            { signal: abortController.signal }
          );
          const data: GeoSearchResponse = await response.json();
          if (abortController.signal.aborted) {
            return;
          }
          setResponse(data);
          setOptions(data.features || []);
          setOpen(true);
        } catch (error) {
          if (!abortController.signal.aborted) {
            console.error("Error fetching GeoSearch data:", error);
          }
        } finally {
          if (!abortController.signal.aborted) {
            setLoading(false);
          }
        }
      };
      void fetchGeoSearchResults();
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      abortController.abort();
    };
  }, [inputValue, initial, selectedValue]);

  const handleChange = (value?: Feature | string | null) => {
    if (!value || typeof value === "string") {
      setSelectedValue(undefined);
      setInputValue("");
      setResponse(undefined);
      setOptions([]);
      setOpen(false);
      onClear?.();
      return;
    }
    setSelectedValue(value);
    setInputValue(value?.properties.label || "");
    if (onChange) {
      onChange(response || {
        type: "FeatureCollection",
        features: [value],
      }, value);
    }
  };

  return (
    <Autocomplete
      open={open}
      value={selectedValue}
      inputValue={inputValue || ""}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      freeSolo={true}
      loading={loading}
      clearOnEscape
      onChange={(_event, value) => handleChange(value)}
      getOptionLabel={(option: any) => option?.properties?.label || ""}
      onInputChange={(_event, value, reason) => {
        if (reason !== "reset") {
          setSelectedValue(undefined);
          setInputValue(value);
        }
      }}
      isOptionEqualToValue={(option, value) =>
        option?.properties?.id === value?.properties?.id
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Search NYC Address"
          variant="outlined"
          onFocus={() => {
            inputFocusedRef.current = true;
          }}
          onBlur={() => {
            inputFocusedRef.current = false;
          }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          inputProps={{
            ...params.inputProps,
            autoComplete: "street-address",
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props}>
          {option.properties.label} {/* Customize display */}
        </li>
      )}
    />
  );
};
