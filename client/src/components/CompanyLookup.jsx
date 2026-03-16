import { useState, useEffect, useRef } from 'react';

/**
 * Composant de recherche entreprise par SIREN/SIRET ou nom
 * Utilise les endpoints:
 * - GET /api/autocomplete/siren/:siren
 * - GET /api/autocomplete/siret/:siret
 * - GET /api/autocomplete/company?q=...
 *
 * Props:
 * - siren: string
 * - siret: string
 * - companyName: string
 * - onCompanyFound: ({ companyName, siren, siret, address, naf, legalForm }) => void
 * - inputClass: string
 * - inputStyle: object
 * - focusHandlers: { onFocus, onBlur }
 */
export default function CompanyLookup({ siren, siret, companyName, onCompanyFound, inputClass, inputStyle, focusHandlers = {}, onChangeSiren, onChangeSiret, onChangeCompanyName }) {
  const [lookupStatus, setLookupStatus] = useState(null); // null | 'loading' | 'found' | 'not_found' | 'error'
  const [companyData, setCompanyData] = useState(null);
  const [companySuggestions, setCompanySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Close suggestions on click outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // SIREN lookup (9 digits)
  useEffect(() => {
    if (!siren || siren.length !== 9 || !/^\d{9}$/.test(siren)) {
      if (siren && siren.length > 0 && siren.length < 9) setLookupStatus(null);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLookupStatus('loading');
      try {
        const res = await fetch(`/api/autocomplete/siren/${siren}`);
        if (res.ok) {
          const data = await res.json();
          if (data.valid && data.nom_complet) {
            setCompanyData(data);
            setLookupStatus('found');
            onCompanyFound?.({
              companyName: data.nom_complet || data.nom_raison_sociale,
              siren: data.siren,
              siret: data.siege?.siret || '',
              address: data.siege?.adresse || '',
              naf: data.activite_principale || '',
              legalForm: data.nature_juridique || '',
            });
          } else {
            setLookupStatus('not_found');
            setCompanyData(null);
          }
        } else {
          setLookupStatus('error');
        }
      } catch {
        setLookupStatus('error');
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [siren]);

  // SIRET lookup (14 digits)
  useEffect(() => {
    if (!siret || siret.length !== 14 || !/^\d{14}$/.test(siret)) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLookupStatus('loading');
      try {
        const res = await fetch(`/api/autocomplete/siret/${siret}`);
        if (res.ok) {
          const data = await res.json();
          if (data.valid !== false && (data.nom_complet || data.denomination)) {
            setCompanyData(data);
            setLookupStatus('found');
            onCompanyFound?.({
              companyName: data.nom_complet || data.denomination || '',
              siren: siret.substring(0, 9),
              siret: siret,
              address: data.adresse || '',
              naf: data.activite_principale || '',
            });
          } else {
            setLookupStatus('not_found');
          }
        } else {
          setLookupStatus('error');
        }
      } catch {
        setLookupStatus('error');
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [siret]);

  // Company name search
  useEffect(() => {
    if (!companyName || companyName.length < 3) {
      setCompanySuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Don't search if we just auto-filled
    if (companyData && companyName === (companyData.nom_complet || companyData.nom_raison_sociale)) {
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete/company?q=${encodeURIComponent(companyName)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          const results = data.results || [];
          setCompanySuggestions(results);
          setShowSuggestions(results.length > 0);
        }
      } catch (e) {
        console.error('Company search error:', e);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [companyName]);

  const selectCompany = (company) => {
    setCompanyData(company);
    setShowSuggestions(false);
    setCompanySuggestions([]);
    setLookupStatus('found');
    onCompanyFound?.({
      companyName: company.nom_complet || company.nom_raison_sociale || company.name || '',
      siren: company.siren || '',
      siret: company.siege?.siret || company.siret || '',
      address: company.siege?.adresse || company.adresse || '',
      naf: company.activite_principale || '',
    });
  };

  const statusIndicator = () => {
    if (lookupStatus === 'loading') return (
      <svg className="animate-spin h-4 w-4" style={{ color: '#3b82f6' }} viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    );
    if (lookupStatus === 'found') return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
    );
    if (lookupStatus === 'not_found') return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
    );
    return null;
  };

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Company name with autocomplete */}
      <div className="relative">
        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
          Nom de l'entreprise
        </label>
        <input
          placeholder="Tapez le nom, SIREN ou SIRET..."
          value={companyName}
          onChange={(e) => onChangeCompanyName(e.target.value)}
          onFocus={() => { if (companySuggestions.length > 0) setShowSuggestions(true); focusHandlers.onFocus?.({ target: document.activeElement }); }}
          onBlur={(e) => { focusHandlers.onBlur?.(e); }}
          className={inputClass}
          style={inputStyle}
          autoComplete="off"
        />
        {showSuggestions && companySuggestions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl shadow-xl overflow-hidden"
            style={{
              background: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              maxHeight: 260,
              overflowY: 'auto',
            }}>
            {companySuggestions.map((c, i) => (
              <button key={i} type="button"
                className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors"
                style={{ borderBottom: i < companySuggestions.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37,99,235,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onMouseDown={(e) => { e.preventDefault(); selectCompany(c); }}>
                <span className="text-sm mt-0.5 shrink-0">🏢</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {c.nom_complet || c.nom_raison_sociale || c.name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    SIREN: {c.siren || '—'} {c.siege?.adresse ? `· ${c.siege.adresse}` : c.city ? `· ${c.postalCode || ''} ${c.city}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SIREN / SIRET fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            SIREN (9 chiffres)
          </label>
          <div className="relative">
            <input
              placeholder="123456789"
              value={siren}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 9);
                onChangeSiren(v);
              }}
              className={inputClass}
              style={inputStyle}
              {...focusHandlers}
              maxLength={9}
              autoComplete="off"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {statusIndicator()}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            SIRET (14 chiffres)
          </label>
          <div className="relative">
            <input
              placeholder="12345678901234"
              value={siret}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 14);
                onChangeSiret(v);
              }}
              className={inputClass}
              style={inputStyle}
              {...focusHandlers}
              maxLength={14}
              autoComplete="off"
            />
            {siret && siret.length === 14 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {statusIndicator()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Company found feedback */}
      {lookupStatus === 'found' && companyData && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl fn-animate-in"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <span className="text-lg mt-0.5">🏢</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-400">
              {companyData.nom_complet || companyData.nom_raison_sociale || companyData.denomination}
            </p>
            {companyData.siege?.adresse && (
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{companyData.siege.adresse}</p>
            )}
            {companyData.activite_principale && (
              <p className="text-[11px] text-slate-400">NAF: {companyData.activite_principale}</p>
            )}
          </div>
        </div>
      )}

      {lookupStatus === 'not_found' && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl fn-animate-in"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.12)' }}>
          <span className="text-sm">⚠️</span>
          <p className="text-xs font-medium text-red-400">Entreprise non trouvée dans l'annuaire SIRENE</p>
        </div>
      )}
    </div>
  );
}
