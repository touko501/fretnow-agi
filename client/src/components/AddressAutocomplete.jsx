import { useState, useEffect, useRef } from 'react';

/**
 * Composant autocomplete d'adresse utilisant l'API BAN via le backend
 * GET /api/autocomplete/address?q=...&limit=7
 *
 * Props:
 * - value: string
 * - onChange: (value: string) => void
 * - onSelect: ({ label, city, postcode, context, lat, lon }) => void
 * - placeholder: string
 * - className: string
 * - style: object
 * - inputProps: object (onFocus, onBlur handlers, etc.)
 */
export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, className, style, inputProps = {} }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced fetch
  useEffect(() => {
    if (!value || value.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/autocomplete/address?q=${encodeURIComponent(value)}&limit=7`);
        if (res.ok) {
          const data = await res.json();
          const results = data.results || data.features?.map(f => ({
            label: f.properties?.label,
            city: f.properties?.city,
            postcode: f.properties?.postcode,
            context: f.properties?.context,
            lat: f.geometry?.coordinates?.[1],
            lon: f.geometry?.coordinates?.[0],
          })) || [];
          setSuggestions(results);
          setOpen(results.length > 0);
          setActiveIndex(-1);
        }
      } catch (e) {
        console.error('Autocomplete error:', e);
      }
      setLoading(false);
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [value]);

  const selectItem = (item) => {
    onChange(item.label || item.name || '');
    onSelect?.(item);
    setOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectItem(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        placeholder={placeholder}
        className={className}
        style={style}
        autoComplete="off"
        {...inputProps}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <svg className="animate-spin h-4 w-4" style={{ color: '#94a3b8' }} viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl shadow-xl overflow-hidden"
          style={{
            background: 'var(--fn-surface, white)',
            border: '1px solid var(--fn-border, #e2e8f0)',
            maxHeight: 280,
            overflowY: 'auto',
          }}>
          {suggestions.map((item, i) => (
            <button key={i} type="button"
              className="w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors"
              style={{
                background: activeIndex === i ? 'rgba(37,99,235,0.06)' : 'transparent',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--fn-border-subtle, #f1f5f9)' : 'none',
              }}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => selectItem(item)}>
              <span className="text-sm mt-0.5 shrink-0" style={{ color: '#3b82f6' }}>📍</span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--fn-text, #1e293b)' }}>
                  {item.label || item.name}
                </p>
                {item.context && (
                  <p className="text-[11px] truncate" style={{ color: 'var(--fn-text-muted, #94a3b8)' }}>
                    {item.context}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
