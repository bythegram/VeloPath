import React, { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

interface AutocompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  country?: string | string[];
}

export default function AutocompleteInput({
  value,
  onChange,
  onSelect,
  country = 'ca',
  className,
  id,
  name,
  ...props
}: AutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary('places');

  const onChangeRef = useRef(onChange);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    // Initialize Google Places Autocomplete on the input element restricted to Canada
    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'name', 'geometry'],
      componentRestrictions: country ? { country } : undefined,
    });

    // Handle place selection event
    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const address = place.formatted_address || place.name || '';
      
      if (address) {
        onChangeRef.current(address);
        if (onSelectRef.current) {
          onSelectRef.current(address);
        }
      }
    });

    return () => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      } else if (window.google?.maps?.event && listener) {
        google.maps.event.removeListener(listener);
      }
      if (window.google?.maps?.event && autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [placesLib]);

  return (
    <input
      ref={inputRef}
      id={id}
      name={name || id}
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      {...props}
    />
  );
}
