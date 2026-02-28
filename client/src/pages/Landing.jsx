import { Link } from 'react-router-dom';
export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center text-white font-bold">F</div><span className="text-xl font-bold text-gray-900">FRETNOW</span></div>
          <div className="flex items-center gap-3"><Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2">Connexion</Link><Link to="/register" className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg">Inscription gratuite</Link></div>
        </div>
      </nav>
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6"><span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />Première plateforme de transport gérée par une IA</div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight mb-6">Le fret routier,<br /><span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">intelligent et instantané</span></h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">FRETNOW connecte expéditeurs et transporteurs avec une commission de 10% et un paiement en J+1. Fini les 25% de marge des courtiers.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register?role=CHARGEUR" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg transition-all hover:shadow-lg hover:shadow-blue-600/25">Je suis expéditeur →</Link>
            <Link to="/register?role=TRANSPORTEUR" className="px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl text-lg transition-all hover:shadow-lg">Je suis transporteur →</Link>
          </div>
        </div>
      </section>
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[{v:'10%',l:'Commission',s:'vs 25% courtiers'},{v:'J+1',l:'Paiement',s:'vs 60-90 jours'},{v:'10',l:'Agents IA',s:'24/7 automatisés'},{v:'0€',l:'Trésorerie',s:'nécessaire'}].map((s,i)=>(
            <div key={i}><div className="text-3xl sm:text-4xl font-extrabold text-blue-600 mb-1">{s.v}</div><div className="font-semibold text-gray-900">{s.l}</div><div className="text-sm text-gray-500">{s.s}</div></div>
          ))}
        </div>
      </section>
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">4 verticales, une seule plateforme</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[{i:'🚛',t:'Fret lourd',d:'Lots complets et partiels, retours optimisés.'},{i:'📦',t:'Messagerie',d:'Colis et palettes, 24-72h.'},{i:'⚡',t:'Express',d:'J+1 garanti, SLA et pénalités.'},{i:'🏙️',t:'Dernier km',d:'Livraison urbaine e-commerce.'}].map((f,i)=>(
              <div key={i} className="p-6 bg-white border border-gray-200 rounded-2xl hover:border-blue-200 hover:shadow-lg transition-all"><div className="text-4xl mb-4">{f.i}</div><h3 className="text-lg font-bold text-gray-900 mb-2">{f.t}</h3><p className="text-sm text-gray-500">{f.d}</p></div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-20 px-4 bg-gradient-to-br from-gray-900 to-blue-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-5xl mb-6">🤖</div><h2 className="text-3xl font-bold mb-4">Rencontrez NOVA</h2>
          <p className="text-lg text-blue-200 mb-8 max-w-2xl mx-auto">L'IA qui gère FRETNOW. 10 agents spécialisés travaillent 24/7 pour optimiser matching, pricing et conformité Mobilic.</p>
          <div className="grid sm:grid-cols-3 gap-6 text-left">
            {[{i:'🎯',t:'Matching intelligent',d:'Multi-critères : localisation, véhicule, historique.'},{i:'💰',t:'Prix juste',d:'Tarification dynamique basée sur indices CNR.'},{i:'✅',t:'Mobilic intégré',d:'Conformité temps de travail incluse.'}].map((f,i)=>(
              <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-5"><div className="text-2xl mb-3">{f.i}</div><h3 className="font-semibold mb-1">{f.t}</h3><p className="text-sm text-blue-200">{f.d}</p></div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-20 px-4 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Prêt à transformer votre transport ?</h2>
        <p className="text-gray-500 mb-8">Inscription gratuite. Première mission en 5 minutes.</p>
        <Link to="/register" className="inline-flex px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg">Commencer maintenant →</Link>
      </section>
      <footer className="border-t border-gray-200 py-8 px-4"><div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500"><span>© 2026 FRETNOW AGI</span><div className="flex gap-6"><a href="#">CGV</a><a href="#">Mentions légales</a><a href="#">Contact</a></div></div></footer>
    </div>
  );
}
