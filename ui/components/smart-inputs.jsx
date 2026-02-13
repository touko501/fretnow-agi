/**
 * 🔍 SMART INPUT COMPONENTS
 * 
 * Composants React pour:
 * - Autocomplétion d'adresses (API Adresse gouv.fr)
 * - Vérification SIRENE (API entreprise.data.gouv.fr)
 * - Input téléphone formaté
 */

// ═══════════════════════════════════════════════════════════════════════════
// 📍 AUTOCOMPLETE ADRESSE
// ═══════════════════════════════════════════════════════════════════════════

const AddressAutocomplete = ({ value, onChange, onSelect, placeholder, className }) => {
  const [query, setQuery] = React.useState(value || '');
  const [suggestions, setSuggestions] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const debounceRef = React.useRef(null);
  const inputRef = React.useRef(null);

  // Recherche avec debounce
  const searchAddress = async (q) => {
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`
      );
      const data = await response.json();
      
      setSuggestions(data.features?.map(f => ({
        label: f.properties.label,
        street: f.properties.name,
        city: f.properties.city,
        postcode: f.properties.postcode,
        context: f.properties.context,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        score: f.properties.score
      })) || []);
    } catch (error) {
      console.error('Erreur recherche adresse:', error);
      setSuggestions([]);
    }
    setIsLoading(false);
  };

  // Debounce la recherche
  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange?.(val);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(val), 300);
  };

  // Sélection d'une suggestion
  const handleSelect = (suggestion) => {
    setQuery(suggestion.label);
    onChange?.(suggestion.label);
    onSelect?.(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Navigation clavier
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Tapez une adresse..."}
          className={className || "w-full bg-white/5 border border-gray-700 rounded-xl px-4 py-3 pr-10 transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"}
          autoComplete="off"
        />
        
        {/* Icône */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(s)}
              className={`w-full px-4 py-3 text-left hover:bg-white/10 transition flex items-start gap-3
                ${i === selectedIndex ? 'bg-white/10' : ''}`}
            >
              <span className="text-cyan-400 mt-0.5">📍</span>
              <div>
                <p className="font-medium text-sm">{s.street}</p>
                <p className="text-xs text-gray-400">{s.postcode} {s.city}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// 🏢 VÉRIFICATION SIRENE/SIRET
// ═══════════════════════════════════════════════════════════════════════════

const SiretInput = ({ value, onChange, onVerified, className }) => {
  const [siret, setSiret] = React.useState(value || '');
  const [status, setStatus] = React.useState('idle'); // idle, loading, valid, invalid, error
  const [company, setCompany] = React.useState(null);
  const debounceRef = React.useRef(null);

  // Formater le SIRET (XXX XXX XXX XXXXX)
  const formatSiret = (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 14);
    const parts = [];
    if (clean.length > 0) parts.push(clean.slice(0, 3));
    if (clean.length > 3) parts.push(clean.slice(3, 6));
    if (clean.length > 6) parts.push(clean.slice(6, 9));
    if (clean.length > 9) parts.push(clean.slice(9, 14));
    return parts.join(' ');
  };

  // Vérifier le SIRET
  const verifySiret = async (cleanSiret) => {
    if (cleanSiret.length !== 14) {
      setStatus('idle');
      setCompany(null);
      return;
    }

    setStatus('loading');
    try {
      const response = await fetch(
        `https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/${cleanSiret}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const etab = data.etablissement;
        
        const companyData = {
          siret: etab.siret,
          siren: etab.siren,
          name: etab.unite_legale?.denomination || etab.denomination_usuelle || 'Non renseigné',
          address: `${etab.numero_voie || ''} ${etab.type_voie || ''} ${etab.libelle_voie || ''}`.trim(),
          postalCode: etab.code_postal,
          city: etab.libelle_commune,
          activity: etab.libelle_activite_principale,
          activityCode: etab.activite_principale,
          legalForm: etab.unite_legale?.categorie_juridique,
          creationDate: etab.date_creation,
          employees: etab.tranche_effectifs,
          active: etab.etat_administratif === 'A'
        };
        
        setCompany(companyData);
        setStatus(companyData.active ? 'valid' : 'inactive');
        onVerified?.(companyData);
      } else if (response.status === 404) {
        setStatus('invalid');
        setCompany(null);
        onVerified?.(null);
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Erreur vérification SIRET:', error);
      setStatus('error');
    }
  };

  // Gérer l'input
  const handleChange = (e) => {
    const formatted = formatSiret(e.target.value);
    const clean = formatted.replace(/\s/g, '');
    setSiret(formatted);
    onChange?.(clean);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => verifySiret(clean), 500);
  };

  // Icône de statut
  const StatusIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
        );
      case 'valid':
        return <span className="text-green-400">✓</span>;
      case 'inactive':
        return <span className="text-orange-400">⚠</span>;
      case 'invalid':
        return <span className="text-red-400">✕</span>;
      case 'error':
        return <span className="text-yellow-400">!</span>;
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
    }
  };

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={siret}
          onChange={handleChange}
          placeholder="XXX XXX XXX XXXXX"
          className={`${className || "w-full bg-white/5 border border-gray-700 rounded-xl px-4 py-3 pr-10 transition"} 
            ${status === 'valid' ? 'border-green-500 focus:border-green-500' : ''}
            ${status === 'invalid' ? 'border-red-500 focus:border-red-500' : ''}
            ${status === 'inactive' ? 'border-orange-500 focus:border-orange-500' : ''}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <StatusIcon />
        </div>
      </div>

      {/* Affichage des infos entreprise */}
      {company && status === 'valid' && (
        <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🏢</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-green-400 truncate">{company.name}</p>
              <p className="text-sm text-gray-400">{company.address}</p>
              <p className="text-sm text-gray-400">{company.postalCode} {company.city}</p>
              <p className="text-xs text-gray-500 mt-1">{company.activity}</p>
            </div>
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg">Actif</span>
          </div>
        </div>
      )}

      {company && status === 'inactive' && (
        <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
          <div className="flex items-center gap-2 text-orange-400">
            <span>⚠️</span>
            <p className="text-sm">Cet établissement n'est plus actif</p>
          </div>
        </div>
      )}

      {status === 'invalid' && (
        <div className="mt-2 text-sm text-red-400">
          Ce SIRET n'existe pas dans la base SIRENE
        </div>
      )}

      {status === 'error' && (
        <div className="mt-2 text-sm text-yellow-400">
          Impossible de vérifier le SIRET pour le moment
        </div>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// 📞 INPUT TÉLÉPHONE FORMATÉ
// ═══════════════════════════════════════════════════════════════════════════

const PhoneInput = ({ value, onChange, className }) => {
  const [phone, setPhone] = React.useState(value || '');

  const formatPhone = (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    const parts = [];
    for (let i = 0; i < clean.length; i += 2) {
      parts.push(clean.slice(i, i + 2));
    }
    return parts.join(' ');
  };

  const handleChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    onChange?.(formatted.replace(/\s/g, ''));
  };

  return (
    <div className="relative">
      <input
        type="tel"
        value={phone}
        onChange={handleChange}
        placeholder="06 12 34 56 78"
        className={className || "w-full bg-white/5 border border-gray-700 rounded-xl px-4 py-3 pl-12 transition focus:border-cyan-500"}
      />
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🇫🇷</span>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// 🏭 RECHERCHE ENTREPRISE PAR NOM
// ═══════════════════════════════════════════════════════════════════════════

const CompanySearch = ({ onSelect, transportOnly = true, className }) => {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showResults, setShowResults] = React.useState(false);
  const debounceRef = React.useRef(null);

  const searchCompanies = async (q) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      let url = `https://entreprise.data.gouv.fr/api/sirene/v3/etablissements?q=${encodeURIComponent(q)}&per_page=8`;
      
      // Filtrer sur les codes NAF transport si demandé
      if (transportOnly) {
        url += '&activite_principale=49.41A,49.41B,49.41C,52.29A,52.29B';
      }
      
      const response = await fetch(url);
      const data = await response.json();

      setResults(data.etablissements?.filter(e => e.etat_administratif === 'A').map(e => ({
        siret: e.siret,
        siren: e.siren,
        name: e.unite_legale?.denomination || e.denomination_usuelle || 'Non renseigné',
        city: e.libelle_commune,
        postalCode: e.code_postal,
        activity: e.libelle_activite_principale
      })) || []);
    } catch (error) {
      console.error('Erreur recherche entreprises:', error);
      setResults([]);
    }
    setIsLoading(false);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCompanies(val), 400);
  };

  const handleSelect = (company) => {
    setQuery(company.name);
    onSelect?.(company);
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder="Rechercher une entreprise de transport..."
          className={className || "w-full bg-white/5 border border-gray-700 rounded-xl px-4 py-3 pr-10 transition focus:border-cyan-500"}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
          {results.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(c)}
              className="w-full px-4 py-3 text-left hover:bg-white/10 transition flex items-start gap-3 border-b border-gray-800 last:border-0"
            >
              <span className="text-xl mt-0.5">🏢</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{c.name}</p>
                <p className="text-xs text-gray-400">{c.postalCode} {c.city}</p>
                <p className="text-xs text-gray-500 truncate">{c.activity}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};


// Export pour utilisation dans d'autres fichiers
if (typeof window !== 'undefined') {
  window.AddressAutocomplete = AddressAutocomplete;
  window.SiretInput = SiretInput;
  window.PhoneInput = PhoneInput;
  window.CompanySearch = CompanySearch;
}
