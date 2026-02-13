/**
 * 🔍 SMART AUTOCOMPLETE COMPONENTS
 * 
 * Composants React réutilisables pour:
 * - Autocomplétion d'adresses
 * - Recherche d'entreprises SIRENE
 * - Sélection de villes
 */

// Configuration API
const API_CONFIG = {
  address: 'https://api-adresse.data.gouv.fr/search',
  sirene: 'https://recherche-entreprises.api.gouv.fr/search',
  geo: 'https://geo.api.gouv.fr'
};

// ═══════════════════════════════════════════════════════════════════════════
// 📍 ADDRESS AUTOCOMPLETE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const AddressAutocomplete = ({ 
  value = '', 
  onChange, 
  onSelect, 
  placeholder = 'Entrez une adresse...',
  className = '',
  disabled = false
}) => {
  const [query, setQuery] = React.useState(value);
  const [suggestions, setSuggestions] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const inputRef = React.useRef(null);
  const debounceRef = React.useRef(null);

  // Recherche avec debounce
  const searchAddress = React.useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_CONFIG.address}?q=${encodeURIComponent(searchQuery)}&limit=5&autocomplete=1`
      );
      const data = await response.json();
      
      setSuggestions((data.features || []).map(f => ({
        id: f.properties.id,
        label: f.properties.label,
        street: f.properties.name,
        housenumber: f.properties.housenumber,
        postcode: f.properties.postcode,
        city: f.properties.city,
        context: f.properties.context,
        type: f.properties.type,
        coordinates: {
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0]
        }
      })));
      setIsOpen(true);
    } catch (error) {
      console.error('Erreur recherche adresse:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce input
  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchAddress(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchAddress]);

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setSelectedIndex(-1);
    onChange?.(newValue);
  };

  // Handle suggestion selection
  const handleSelect = (suggestion) => {
    setQuery(suggestion.label);
    setSuggestions([]);
    setIsOpen(false);
    onSelect?.(suggestion);
    onChange?.(suggestion.label);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={inputRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-white/5 border border-gray-700 rounded-xl px-4 py-3 pr-10 transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          autoComplete="off"
        />
        {/* Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              onClick={() => handleSelect(suggestion)}
              className={`px-4 py-3 cursor-pointer transition flex items-start gap-3 ${
                index === selectedIndex ? 'bg-cyan-500/20' : 'hover:bg-white/5'
              }`}
            >
              <span className="text-cyan-500 mt-0.5">📍</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{suggestion.label}</p>
                <p className="text-sm text-gray-500 truncate">{suggestion.context}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 🏢 COMPANY AUTOCOMPLETE COMPONENT (SIRENE)
// ═══════════════════════════════════════════════════════════════════════════

const CompanyAutocomplete = ({ 
  value = '', 
  onChange, 
  onSelect, 
  placeholder = 'Nom de l\'entreprise ou SIRET...',
  transportOnly = false,
  className = ''
}) => {
  const [query, setQuery] = React.useState(value);
  const [suggestions, setSuggestions] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const inputRef = React.useRef(null);
  const debounceRef = React.useRef(null);

  // Recherche entreprises
  const searchCompany = React.useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      let url = `${API_CONFIG.sirene}?q=${encodeURIComponent(searchQuery)}&per_page=5&etat_administratif=A`;
      
      if (transportOnly) {
        url += '&activite_principale=49.41A,49.41B,49.41C,49.42Z';
      }

      const response = await fetch(url);
      const data = await response.json();
      
      setSuggestions((data.results || []).map(c => ({
        siren: c.siren,
        siret: c.siege?.siret,
        name: c.nom_complet,
        legalName: c.nom_raison_sociale,
        tradeName: c.nom_commercial,
        activity: c.libelle_activite_principale,
        activityCode: c.activite_principale,
        category: c.categorie_entreprise,
        employees: c.tranche_effectif_salarie,
        creationDate: c.date_creation,
        address: {
          street: c.siege?.adresse,
          postcode: c.siege?.code_postal,
          city: c.siege?.libelle_commune
        },
        isActive: c.etat_administratif === 'A'
      })));
      setIsOpen(true);
    } catch (error) {
      console.error('Erreur recherche entreprise:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [transportOnly]);

  // Debounce
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCompany(query), 400);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, searchCompany]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setSelectedIndex(-1);
    onChange?.(newValue);
  };

  const handleSelect = (company) => {
    setQuery(company.name);
    setSuggestions([]);
    setIsOpen(false);
    onSelect?.(company);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) handleSelect(suggestions[selectedIndex]);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={inputRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-gray-700 rounded-xl px-4 py-3 pr-10 transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          )}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto">
          {suggestions.map((company, index) => (
            <li
              key={company.siren}
              onClick={() => handleSelect(company)}
              className={`px-4 py-3 cursor-pointer transition ${
                index === selectedIndex ? 'bg-cyan-500/20' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">🏢</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{company.name}</p>
                    {company.isActive && (
                      <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">Actif</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 truncate">{company.activity}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>SIRET: {company.siret}</span>
                    <span>•</span>
                    <span>{company.address?.city}</span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 🏙️ CITY AUTOCOMPLETE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const CityAutocomplete = ({ 
  value = '', 
  onChange, 
  onSelect, 
  placeholder = 'Ville...',
  className = ''
}) => {
  const [query, setQuery] = React.useState(value);
  const [suggestions, setSuggestions] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const inputRef = React.useRef(null);
  const debounceRef = React.useRef(null);

  const searchCity = React.useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_CONFIG.geo}/communes?nom=${encodeURIComponent(searchQuery)}&fields=nom,code,codesPostaux,departement,region&boost=population&limit=5`
      );
      const data = await response.json();
      
      setSuggestions(data.map(city => ({
        name: city.nom,
        code: city.code,
        postcodes: city.codesPostaux,
        department: city.departement?.nom,
        departmentCode: city.departement?.code,
        region: city.region?.nom
      })));
      setIsOpen(true);
    } catch (error) {
      console.error('Erreur recherche ville:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCity(query), 300);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, searchCity]);

  const handleSelect = (city) => {
    setQuery(city.name);
    setSuggestions([]);
    setIsOpen(false);
    onSelect?.(city);
  };

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={inputRef} className={`relative ${className}`}>
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange?.(e.target.value); }}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-gray-700 rounded-xl px-4 py-3 transition focus:border-cyan-500"
      />

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
          {suggestions.map((city, index) => (
            <li
              key={city.code}
              onClick={() => handleSelect(city)}
              className="px-4 py-3 cursor-pointer hover:bg-white/5 flex items-center gap-3"
            >
              <span>🏙️</span>
              <div>
                <p className="font-medium">{city.name}</p>
                <p className="text-sm text-gray-500">{city.department} ({city.departmentCode})</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 📋 SIRET INPUT WITH VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

const SiretInput = ({ 
  value = '', 
  onChange, 
  onValidated,
  className = ''
}) => {
  const [siret, setSiret] = React.useState(value);
  const [status, setStatus] = React.useState(null); // null, 'loading', 'valid', 'invalid'
  const [companyInfo, setCompanyInfo] = React.useState(null);
  const debounceRef = React.useRef(null);

  const verifySiret = React.useCallback(async (siretValue) => {
    const cleanSiret = siretValue.replace(/\s/g, '');
    
    if (cleanSiret.length !== 14) {
      setStatus(null);
      setCompanyInfo(null);
      return;
    }

    setStatus('loading');
    try {
      const response = await fetch(`${API_CONFIG.sirene}?q=${cleanSiret}&per_page=1`);
      const data = await response.json();
      
      const company = data.results?.[0];
      if (company && company.siege?.siret === cleanSiret) {
        setStatus('valid');
        const info = {
          siret: cleanSiret,
          siren: company.siren,
          name: company.nom_complet,
          activity: company.libelle_activite_principale,
          city: company.siege?.libelle_commune,
          isActive: company.etat_administratif === 'A'
        };
        setCompanyInfo(info);
        onValidated?.(info);
      } else {
        setStatus('invalid');
        setCompanyInfo(null);
        onValidated?.(null);
      }
    } catch (error) {
      setStatus('invalid');
      setCompanyInfo(null);
    }
  }, [onValidated]);

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => verifySiret(siret), 500);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [siret, verifySiret]);

  // Format SIRET with spaces
  const formatSiret = (value) => {
    const clean = value.replace(/\D/g, '').slice(0, 14);
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{0,5})/, '$1 $2 $3 $4').trim();
  };

  const handleChange = (e) => {
    const formatted = formatSiret(e.target.value);
    setSiret(formatted);
    onChange?.(formatted.replace(/\s/g, ''));
  };

  const statusColors = {
    loading: 'border-yellow-500',
    valid: 'border-green-500',
    invalid: 'border-red-500'
  };

  return (
    <div className={className}>
      <div className="relative">
        <input
          type="text"
          value={siret}
          onChange={handleChange}
          placeholder="123 456 789 00001"
          maxLength={17}
          className={`w-full bg-white/5 border rounded-xl px-4 py-3 pr-10 transition font-mono tracking-wider
            ${status ? statusColors[status] : 'border-gray-700'} focus:ring-2 focus:ring-cyan-500/20`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {status === 'loading' && (
            <svg className="w-5 h-5 animate-spin text-yellow-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          )}
          {status === 'valid' && (
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {status === 'invalid' && (
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
      </div>

      {/* Company info card */}
      {status === 'valid' && companyInfo && (
        <div className="mt-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span className="font-medium text-green-400">Entreprise vérifiée</span>
          </div>
          <p className="mt-1 font-semibold">{companyInfo.name}</p>
          <p className="text-sm text-gray-400">{companyInfo.activity}</p>
          <p className="text-sm text-gray-500">{companyInfo.city}</p>
        </div>
      )}

      {status === 'invalid' && siret.replace(/\s/g, '').length === 14 && (
        <p className="mt-2 text-sm text-red-400">SIRET non trouvé ou entreprise inactive</p>
      )}
    </div>
  );
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AddressAutocomplete, CompanyAutocomplete, CityAutocomplete, SiretInput };
}
