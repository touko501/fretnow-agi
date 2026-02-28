import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';

const ARTICLES = {
  'fret-lourd': {
    emoji: '🚛',
    title: 'Fret Lourd : Comment NOVA révolutionne le transport de lots',
    subtitle: 'L\'IA qui garantit vos retours chargés et divise votre commission par 2,5',
    date: '28 février 2026',
    readTime: '5 min',
    hero: 'from-blue-600 to-blue-800',
    sections: [
      {
        title: 'Le problème : 58% des camions roulent à moitié vides',
        content: `Chaque jour en France, des milliers de poids lourds effectuent leurs retours à vide. C'est un gaspillage colossal : carburant brûlé pour rien, routes saturées inutilement, marges des transporteurs grignotées. Au niveau mondial, ce problème représente 80 milliards de dollars de pertes annuelles. Les courtiers traditionnels prennent 25% de commission sans résoudre le cœur du problème.`
      },
      {
        title: 'NOVA : l\'IA qui pense comme un logisticien senior',
        content: `NOVA est l'intelligence artificielle qui gère FRETNOW. Elle n'est pas un simple algorithme de matching — c'est un système de 10 agents spécialisés qui travaillent ensemble 24/7. Le MatchingAgent analyse en temps réel les positions des camions, leurs itinéraires, la capacité restante et l'historique des trajets pour trouver le retour chargé optimal. Le PricingAgent calcule un tarif juste basé sur les indices CNR, le prix du gazole en temps réel et les conditions du marché.`
      },
      {
        title: 'Matching multi-critères intelligent',
        content: `Quand un expéditeur publie une mission de fret lourd, NOVA analyse instantanément : la distance entre le camion et le point d'enlèvement, le type de véhicule requis vs disponible (bâché, frigorifique, plateau...), la capacité en tonnes et en palettes, les créneaux horaires compatibles, l'historique de fiabilité du transporteur, et même les conditions météo sur le trajet. En moins de 30 secondes, les 3 meilleurs transporteurs reçoivent l'offre avec un prix déjà optimisé.`
      },
      {
        title: 'Commission 10% vs 25% : le calcul est simple',
        content: `Les courtiers traditionnels prennent entre 20 et 25% de commission, souvent avec des délais de paiement de 60 à 90 jours. FRETNOW prend 10% et paie le transporteur en J+1 après livraison confirmée. Pour un lot à 1000€, le transporteur touche 900€ le lendemain au lieu de 750€ dans 3 mois. C'est cette transparence qui crée la confiance. Et grâce à NOVA, la qualité du matching est supérieure.`
      },
      {
        title: 'Conformité Mobilic intégrée',
        content: `NOVA intègre nativement le système Mobilic du Ministère des Transports. L'agent ComplianceAgent surveille en temps réel les temps de conduite, les pauses obligatoires et les repos journaliers. Avant même de proposer un matching, NOVA vérifie que le conducteur est légalement disponible. Fini les risques d'amendes et les contrôles stressants — la conformité est automatique.`
      }
    ],
    cta: 'Publiez votre première mission de fret',
    ctaRole: 'CHARGEUR'
  },
  'messagerie': {
    emoji: '📦',
    title: 'Messagerie : NOVA optimise vos livraisons colis et palettes',
    subtitle: 'SLA garantis, traçabilité totale et livraison 24-72h avec l\'IA',
    date: '28 février 2026',
    readTime: '4 min',
    hero: 'from-purple-600 to-purple-800',
    sections: [
      {
        title: 'La messagerie traditionnelle : opaque et imprévisible',
        content: `Envoyer des colis ou des palettes entre professionnels reste un parcours semé d'embûches. Délais non respectés, colis perdus, pas de visibilité en temps réel, et des prix qui varient selon l'humeur du commercial. Les entreprises passent des heures au téléphone pour obtenir un simple suivi. NOVA change la donne en apportant l'intelligence artificielle au cœur de la messagerie.`
      },
      {
        title: 'Des SLA garantis par l\'IA',
        content: `NOVA propose 4 niveaux de service (SLA) : Avant 12h, Avant 18h, Same Day et J+1. Chaque SLA est garanti contractuellement. Le PredictionAgent de NOVA analyse les conditions de trafic, la météo, et les performances historiques du transporteur assigné pour ne proposer que des engagements tenable. Si le SLA risque de ne pas être tenu, NOVA déclenche automatiquement un plan B avant qu'il ne soit trop tard.`
      },
      {
        title: 'Traçabilité en temps réel',
        content: `Chaque colis est suivi de l'enlèvement à la livraison. Le destinataire reçoit un lien de suivi automatique avec l'heure estimée d'arrivée, mise à jour dynamiquement par NOVA. La confirmation de livraison avec signature électronique déclenche instantanément le paiement J+1 au transporteur. Plus de litige, plus d'ambiguïté — tout est tracé et horodaté.`
      },
      {
        title: 'Optimisation des tournées multi-colis',
        content: `NOVA ne se contente pas de matcher un colis avec un transporteur. L'IA optimise les tournées entières : regroupement de colis par zone géographique, séquençage optimal des livraisons, et minimisation des kilomètres parcourus. Résultat : des coûts réduits pour l'expéditeur, une meilleure rentabilité pour le transporteur, et une empreinte carbone diminuée.`
      }
    ],
    cta: 'Envoyez votre premier colis',
    ctaRole: 'CHARGEUR'
  },
  'express': {
    emoji: '⚡',
    title: 'Express : NOVA garantit votre livraison en J+1',
    subtitle: 'Pénalités automatiques, prix dynamiques et fiabilité pilotée par l\'IA',
    date: '28 février 2026',
    readTime: '4 min',
    hero: 'from-amber-500 to-orange-600',
    sections: [
      {
        title: 'L\'express B2B : quand chaque heure compte',
        content: `Dans l'industrie, un composant manquant peut arrêter une chaîne de production entière. Dans le e-commerce B2B, une livraison en retard c'est un client perdu. L'express n'est pas un luxe — c'est une nécessité. Mais les acteurs traditionnels de l'express facturent des prix premium sans vraiment garantir les délais. NOVA apporte une solution radicalement différente.`
      },
      {
        title: 'Des pénalités automatiques qui protègent l\'expéditeur',
        content: `Avec FRETNOW Express, le SLA est contractuel. Si le délai n'est pas respecté, une pénalité est automatiquement calculée et créditée au wallet de l'expéditeur. Pas de réclamation à envoyer, pas de procédure. NOVA gère tout : détection du retard, calcul de la pénalité selon les conditions contractuelles, et crédit automatique. Cette automatisation pousse les transporteurs à se surpasser.`
      },
      {
        title: 'Tarification dynamique intelligente',
        content: `Le PricingAgent de NOVA calcule le juste prix en temps réel. Il intègre la distance, l'urgence, la disponibilité des transporteurs dans la zone, le prix du carburant du jour, les conditions météo et le taux de remplissage actuel du réseau. En période de forte demande, les prix s'ajustent naturellement. En période creuse, l'expéditeur bénéficie de tarifs compétitifs. La transparence est totale : chaque composante du prix est visible.`
      },
      {
        title: 'Réseau de transporteurs qualifiés',
        content: `NOVA attribue un score de fiabilité à chaque transporteur, mis à jour après chaque mission. Pour les missions Express, seuls les transporteurs ayant un score supérieur à 90/100 sont sollicités. L'agent RiskAgent évalue en continu la capacité de chaque transporteur à respecter le délai, en tenant compte de sa charge actuelle, de sa localisation et de son historique. Le résultat : un taux de livraison dans les temps supérieur à 97%.`
      }
    ],
    cta: 'Réservez une livraison express',
    ctaRole: 'CHARGEUR'
  },
  'dernier-km': {
    emoji: '🏙️',
    title: 'Dernier Kilomètre : NOVA réinvente la livraison urbaine',
    subtitle: 'E-commerce, ZFE et livraison écologique pilotés par l\'intelligence artificielle',
    date: '28 février 2026',
    readTime: '5 min',
    hero: 'from-emerald-500 to-teal-600',
    sections: [
      {
        title: 'Le dernier kilomètre : le maillon le plus coûteux',
        content: `Le dernier kilomètre représente jusqu'à 53% du coût total de livraison. Zones piétonnes, créneaux de livraison restreints, ZFE (Zones à Faibles Émissions) qui interdisent certains véhicules, et des clients qui exigent des créneaux d'une heure. C'est un casse-tête logistique que les méthodes traditionnelles ne peuvent plus résoudre. C'est exactement là que NOVA excelle.`
      },
      {
        title: 'NOVA et les ZFE : conformité automatique',
        content: `NOVA connaît en temps réel les restrictions ZFE de chaque ville française grâce à l'intégration de transport.data.gouv.fr. Quand un transporteur est assigné à une livraison en zone urbaine, NOVA vérifie automatiquement que son véhicule est autorisé (vignette Crit'Air compatible). Si ce n'est pas le cas, NOVA propose un véhicule alternatif ou une solution de rupture de charge en périphérie. Zéro amende, zéro surprise.`
      },
      {
        title: 'Optimisation des créneaux et des tournées',
        content: `Le PredictionAgent de NOVA analyse les patterns de trafic urbain heure par heure. Il sait qu'à 8h30 le périphérique est saturé, qu'entre 11h et 14h les rues commerçantes sont accessibles, et qu'après 18h les zones résidentielles sont plus faciles. NOVA planifie les tournées de livraison en tenant compte de ces réalités, réduisant le temps passé dans les embouteillages de 35% en moyenne.`
      },
      {
        title: 'L\'expérience destinataire',
        content: `Le client final reçoit un SMS avec un créneau de 30 minutes, mis à jour en temps réel. Il peut reprogrammer depuis son téléphone sans appeler personne. La preuve de livraison est électronique avec photo et signature. Si le destinataire est absent, NOVA propose automatiquement un point relais à proximité ou reprogramme au créneau suivant. Chaque interaction est fluide, automatique et transparente.`
      },
      {
        title: 'Vers une livraison urbaine zéro émission',
        content: `NOVA favorise naturellement les véhicules électriques et les vélos cargo pour le dernier kilomètre urbain. Le système de scoring attribue un bonus aux transporteurs utilisant des véhicules propres, rendant leurs offres plus compétitives. L'objectif de FRETNOW est clair : rendre la livraison urbaine durable sans surcoût pour l'expéditeur, grâce à l'optimisation intelligente des tournées.`
      }
    ],
    cta: 'Optimisez vos livraisons urbaines',
    ctaRole: 'CHARGEUR'
  }
};

// Liste des articles
function BlogList() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center text-white font-bold">F</div>
            <span className="text-xl font-bold text-gray-900">FRETNOW</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2">Connexion</Link>
            <Link to="/register" className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg">Inscription</Link>
          </div>
        </div>
      </nav>

      <div className="pt-28 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" /> Blog FRETNOW
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
            Comment <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">NOVA</span> transforme le transport
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Découvrez comment notre intelligence artificielle révolutionne chaque verticale du transport routier.
          </p>
        </div>

        {/* Section NOVA intro */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="bg-gradient-to-br from-gray-900 to-blue-900 rounded-2xl p-8 sm:p-12 text-white">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="text-6xl">🤖</div>
              <div>
                <h2 className="text-2xl font-bold mb-3">Qui est NOVA ?</h2>
                <p className="text-blue-200 leading-relaxed">
                  NOVA est l'IA qui pilote FRETNOW. Elle est composée de 10 agents spécialisés : matching, pricing, 
                  lead generation, communication, conversion, risque, prédiction, analyse, compliance Mobilic et marketing. 
                  Ces agents travaillent ensemble 24h/24, 7j/7, pour optimiser chaque aspect du transport routier. 
                  NOVA n'est pas cachée — elle est le visage transparent de FRETNOW, et vous pouvez lui parler directement.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Articles grid */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          {Object.entries(ARTICLES).map(([slug, article]) => (
            <Link to={`/blog/${slug}`} key={slug}
              className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300">
              <div className={`bg-gradient-to-br ${article.hero} p-8 text-white`}>
                <div className="text-5xl mb-3">{article.emoji}</div>
                <h3 className="text-xl font-bold leading-snug">{article.title}</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-500 text-sm mb-4 leading-relaxed">{article.subtitle}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{article.readTime} de lecture</span>
                  <span className="text-blue-600 font-medium text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Lire l'article →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <footer className="border-t border-gray-200 py-8 px-4 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>© 2026 FRETNOW AGI — Propulsé par NOVA 🤖</span>
          <div className="flex gap-6">
            <Link to="/">Accueil</Link>
            <Link to="/register">S'inscrire</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Article individuel
function BlogArticle() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const article = ARTICLES[slug];

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Article non trouvé</h1>
          <Link to="/blog" className="text-blue-600 hover:underline">← Retour au blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center text-white font-bold">F</div>
            <span className="text-xl font-bold text-gray-900">FRETNOW</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/blog" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2">Blog</Link>
            <Link to="/register" className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg">Inscription</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className={`bg-gradient-to-br ${article.hero} pt-28 pb-16 px-4`}>
        <div className="max-w-3xl mx-auto text-white">
          <button onClick={() => navigate('/blog')} className="text-white/70 hover:text-white text-sm mb-6 inline-flex items-center gap-1">
            ← Retour au blog
          </button>
          <div className="text-6xl mb-4">{article.emoji}</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4">{article.title}</h1>
          <p className="text-lg opacity-80 mb-6">{article.subtitle}</p>
          <div className="flex items-center gap-4 text-sm opacity-70">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs">🤖</span>
              NOVA — IA FRETNOW
            </span>
            <span>•</span>
            <span>{article.date}</span>
            <span>•</span>
            <span>{article.readTime} de lecture</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        {article.sections.map((section, i) => (
          <div key={i} className="mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">{section.title}</h2>
            <p className="text-gray-600 leading-relaxed text-base">{section.content}</p>
          </div>
        ))}

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 text-center border border-blue-100">
          <div className="text-4xl mb-3">🚀</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Prêt à essayer ?</h3>
          <p className="text-gray-500 mb-6 text-sm">Inscription gratuite. Commission 10% seulement. Paiement J+1.</p>
          <Link to={`/register?role=${article.ctaRole}`}
            className="inline-flex px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg">
            {article.cta} →
          </Link>
        </div>

        {/* Other articles */}
        <div className="mt-16">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Autres articles</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(ARTICLES).filter(([s]) => s !== slug).slice(0, 2).map(([s, a]) => (
              <Link to={`/blog/${s}`} key={s}
                className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-200 hover:shadow-md transition-all">
                <span className="text-2xl">{a.emoji}</span>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm leading-snug">{a.title}</h4>
                  <span className="text-xs text-gray-400 mt-1">{a.readTime}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-200 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>© 2026 FRETNOW AGI — Propulsé par NOVA 🤖</span>
          <div className="flex gap-6">
            <Link to="/">Accueil</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/register">S'inscrire</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Blog() {
  const { slug } = useParams();
  return slug ? <BlogArticle /> : <BlogList />;
}
