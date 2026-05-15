import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, PlayCircle, Leaf, Truck, Star, Shield, Users, BarChart3, Recycle, Zap, Calendar, RefreshCw, Building2, Package } from 'lucide-react'

const CATS = ['?? Organiques', '?? Plastiques', '?? Papier/Carton', '?? Verre', '?? Métaux', '?? Électroniques', '?? Dangereux', '??? Encombrants', '??? Ménagers']

export default function LandingPage() {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language?.startsWith('en')

  const STEPS = [
    { n: '01', icon: '??', title: isEn ? 'Create your request' : 'Créez votre demande',       desc: isEn ? 'Select waste type, address and time slot in seconds.' : 'Sélectionnez le type de déchet, votre adresse et le créneau souhaité en quelques secondes.' },
    { n: '02', icon: '??', title: isEn ? 'Collector assigned'  : 'Collecteur assigné',         desc: isEn ? 'Our system automatically assigns the nearest available collector.' : 'Notre système assigne automatiquement le collecteur le plus proche et disponible.' },
    { n: '03', icon: '?', title: isEn ? 'Collection & confirm': 'Collecte & confirmation',    desc: isEn ? 'The collector arrives, collects your waste and you get instant confirmation.' : 'Le collecteur arrive, collecte vos déchets et vous recevez une confirmation instantanée.' },
  ]

  const SERVICES = [
    { icon: Zap,       title: isEn ? 'Immediate pickup'    : 'Collecte immédiate',      desc: isEn ? 'A collector available in minutes for urgent needs.'        : 'Un collecteur disponible en quelques minutes pour vos besoins urgents.',       featured: true },
    { icon: Calendar,  title: isEn ? 'Scheduled pickup'    : 'Collecte planifiée',      desc: isEn ? 'Choose your preferred date and time in advance.'           : "Choisissez votre date et heure préférée à l'avance." },
    { icon: RefreshCw, title: isEn ? 'Recurring plan'      : 'Abonnement récurrent',    desc: isEn ? 'Automatic weekly or monthly service.'                      : 'Service hebdomadaire ou mensuel automatique.' },
    { icon: Building2, title: isEn ? 'Business & offices'  : 'Entreprises & bureaux',   desc: isEn ? 'Tailor-made solutions with monthly billing.'               : 'Solutions sur mesure avec facturation mensuelle.' },
    { icon: Package,   title: isEn ? 'Large volumes'       : 'Gros volumes',            desc: isEn ? 'Bulky items, moves and construction waste.'               : 'Encombrants, déménagements et déchets de chantier.' },
    { icon: Recycle,   title: isEn ? 'Recyclables'         : 'Recyclables',             desc: isEn ? 'Specialized collection for paper, plastic, glass & metals.': 'Collecte spécialisée pour papier, plastique, verre et métaux.' },
  ]

  const TESTIMONIALS = [
    { name: 'Marie Kouassi',    role: 'Particulier, Douala',    text: isEn ? 'Impeccable service! The collector was on time and very professional. Highly recommend!' : "Service impeccable ! Le collecteur était à l'heure et très professionnel. Je recommande vivement !", score: 5, init: 'MK' },
    { name: 'Jean Nkemdirim',   role: 'Restaurateur, Yaoundé', text: isEn ? "Thanks to EcoGarbage, our restaurant is finally free of waste management problems. The monthly plan is perfect!" : "Grâce à EcoGarbage, notre restaurant est enfin débarrassé des problèmes de gestion des déchets. L'abonnement mensuel est parfait !", score: 5, init: 'JN', featured: true },
    { name: 'Mbah Armstrong',   role: 'Particulier, Buea',      text: isEn ? 'Very easy to use app. Real-time tracking is really handy to know when the collector arrives.' : "Application très facile à utiliser. Le suivi en temps réel est vraiment pratique pour savoir quand le collecteur arrive.", score: 4, init: 'AB' },
  ]

  const PLANS = [
    { name: isEn ? 'Free' : 'Gratuit', price: '0', period: isEn ? 'forever' : 'pour toujours', features: isEn ? ['2 pickups/month','Household waste','Email support'] : ['2 collectes/mois','Déchets ménagers','Support email'], popular: false },
    { name: 'Standard', price: '4 500', period: 'FCFA / mois', features: isEn ? ['10 pickups/month','All waste types','GPS tracking','Immediate pickup','Priority support'] : ['10 collectes/mois','Tous types de déchets','Suivi GPS temps réel','Collecte immédiate','Support prioritaire'], popular: true },
    { name: 'Premium',  price: '9 900', period: 'FCFA / mois', features: isEn ? ['Unlimited pickups','All waste types','Maximum priority','Auto-recurrence','24/7 support'] : ['Collectes illimitées','Tous types de déchets','Priorité maximale','Récurrence automatique','Support 24h/7'], popular: false },
  ]

  const stats = [
    ['12k+', isEn ? 'Users'       : 'Utilisateurs'],
    ['98%',  isEn ? 'Satisfaction': 'Satisfaction'],
    ['500+', isEn ? 'Collectors'  : 'Collecteurs'],
  ]

  return (
    <div>
      {/* HERO */}
      <section className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden bg-[#f7faf8]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-[600px] h-[600px] rounded-full -top-48 -right-24 opacity-25"
            style={{ background: 'radial-gradient(circle, #27AE60 0%, transparent 70%)', filter: 'blur(80px)' }} />
          <div className="absolute w-[400px] h-[400px] rounded-full -bottom-24 -left-12 opacity-20"
            style={{ background: 'radial-gradient(circle, #C8EDDA 0%, transparent 70%)', filter: 'blur(80px)' }} />
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle, #C8EDDA 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="max-w-6xl mx-auto px-6 relative z-10 grid md:grid-cols-2 gap-16 items-center w-full">
          <div>
            <div className="inline-flex items-center gap-2 bg-white border border-[#C8EDDA] px-4 py-2 rounded-full text-sm font-semibold text-[#1A8A3C] shadow-green-sm mb-6">
              <Leaf size={14} /> {t('landing.hero.badge')}
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-black leading-tight mb-5 text-gray-900">
              {t('landing.hero.title')}<br />
              <span style={{ background: 'linear-gradient(135deg,#1A8A3C,#27AE60)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {t('landing.hero.titleHighlight')}
              </span>
            </h1>
            <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-lg">
              {t('landing.hero.desc')}
            </p>
            <div className="flex flex-wrap gap-4 mb-10">
              <Link to="/register" className="btn-primary text-base px-8 py-4 shadow-green-md">
                <ArrowRight size={18} /> {t('landing.hero.cta')}
              </Link>
              <button className="btn-ghost text-base px-6 py-4 border border-gray-200">
                <PlayCircle size={18} /> {t('landing.hero.learnMore')}
              </button>
            </div>
            <div className="flex items-center gap-8">
              {stats.map(([v, l]) => (
                <div key={l}>
                  <p className="text-2xl font-display font-bold text-gray-900">{v}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Phone mockup */}
          <div className="hidden md:flex justify-center items-center relative">
            <div className="relative">
              <div className="w-[260px] h-[520px] bg-gray-900 rounded-[44px] p-4 shadow-[0_40px_80px_rgba(0,0,0,0.3)]">
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-800 rounded-full z-10" />
                <div className="w-full h-full bg-[#f7faf8] rounded-[34px] overflow-hidden">
                  <div className="p-5 pt-12 flex flex-col gap-3 h-full">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-[#1A8A3C] rounded-lg flex items-center justify-center"><Leaf size={14} className="text-white" /></div>
                      <span className="font-display font-bold text-sm">EcoGarbage</span>
                    </div>
                    <div className="bg-white rounded-2xl p-3 shadow-green-sm flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#E8F5EE] rounded-xl flex items-center justify-center">??</div>
                      <div>
                        <p className="text-xs font-bold">{isEn ? 'Scheduled pickup' : 'Collecte planifiée'}</p>
                        <p className="text-[10px] text-gray-400">{isEn ? 'Today 2:00 PM' : "Aujourd'hui 14h00"}</p>
                      </div>
                      <span className="ml-auto text-[10px] font-bold bg-[#E8F5EE] text-[#1A8A3C] px-2 py-1 rounded-full">{isEn ? 'On way' : 'En route'}</span>
                    </div>
                    <div className="bg-white rounded-2xl p-3 shadow-green-sm flex-1" style={{ background: 'linear-gradient(135deg,#e8f5ee,#d4edda)', minHeight: 90 }}>
                      <div className="w-full h-full relative">
                        <span className="absolute top-2 left-3 text-lg">??</span>
                        <div className="absolute top-5 left-7 right-10 h-0.5 bg-[#1A8A3C] opacity-40" />
                        <span className="absolute right-6 top-4 text-sm animate-bounce">??</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[['8',isEn?'Pickups':'Collectes'],['4.9',isEn?'Rating':'Note'],['0kg','CO2']].map(([n,l]) => (
                        <div key={l} className="bg-white rounded-xl p-2.5 text-center shadow-green-sm">
                          <p className="text-sm font-display font-bold">{n}</p>
                          <p className="text-[9px] text-gray-400 mt-0.5">{l}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#1A8A3C] rounded-xl py-3 text-center text-white text-xs font-bold mt-auto">
                      + {isEn ? 'New request' : 'Nouvelle demande'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -left-16 bottom-24 bg-white rounded-xl px-4 py-2.5 shadow-green-md flex items-center gap-2 text-sm font-semibold animate-bounce">
                ? <span>{isEn ? 'Pickup confirmed!' : 'Collecte confirmée!'}</span>
              </div>
              <div className="absolute -right-14 top-24 bg-white rounded-xl px-4 py-2.5 shadow-green-md flex items-center gap-2 text-sm font-semibold" style={{ animation: 'float2 3s ease-in-out infinite' }}>
                ? <span>4.9/5 Excellent</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="section-badge">{isEn ? 'How it works' : 'Comment ça marche'}</div>
            <h2 className="text-4xl font-display font-bold">{isEn ? 'Simple, fast, effective' : 'Simple, rapide, efficace'}</h2>
            <p className="text-gray-400 mt-3">{isEn ? 'In 3 steps, your waste is collected cleanly' : 'En 3 étapes seulement, vos déchets sont collectés proprement'}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="card p-8 text-center hover:border-[#1A8A3C]/30 hover:-translate-y-1 transition-all">
                <p className="font-display font-black text-6xl text-[#E8F5EE] mb-4">{s.n}</p>
                <div className="text-4xl mb-4">{s.icon}</div>
                <h3 className="text-lg font-display font-bold mb-3">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24 bg-[#f7faf8]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="section-badge">{isEn ? 'Our services' : 'Nos services'}</div>
            <h2 className="text-4xl font-display font-bold">{isEn ? 'A solution for every need' : 'Une solution pour chaque besoin'}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {SERVICES.map((s, i) => (
              <div key={i} className={`rounded-2xl p-7 transition-all hover:-translate-y-1 ${s.featured ? 'bg-[#1A8A3C] text-white' : 'card hover:border-[#1A8A3C]/30'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${s.featured ? 'bg-white/20' : 'bg-[#E8F5EE]'}`}>
                  <s.icon size={22} className={s.featured ? 'text-white' : 'text-[#1A8A3C]'} />
                </div>
                <h3 className={`text-lg font-display font-bold mb-2 ${s.featured ? 'text-white' : ''}`}>{s.title}</h3>
                <p className={`text-sm leading-relaxed ${s.featured ? 'text-white/75' : 'text-gray-400'}`}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="section-badge">{isEn ? 'Categories' : 'Catégories'}</div>
          <h2 className="text-4xl font-display font-bold mb-10">{isEn ? 'We collect all types of waste' : 'Nous collectons tout type de déchets'}</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {CATS.map(c => (
              <span key={c} className="bg-[#f7faf8] border border-gray-200 hover:border-[#1A8A3C] hover:bg-[#E8F5EE] hover:text-[#1A8A3C] transition-all px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-[#f7faf8]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="section-badge">{isEn ? 'Testimonials' : 'Témoignages'}</div>
            <h2 className="text-4xl font-display font-bold">{isEn ? 'They trust us' : 'Ils nous font confiance'}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-center">
            {TESTIMONIALS.map((tm, i) => (
              <div key={i} className={`rounded-2xl p-7 transition-all ${tm.featured ? 'bg-[#1A8A3C] scale-105 shadow-green-lg' : 'card'}`}>
                <div className={`flex gap-0.5 mb-4 ${tm.featured ? 'text-yellow-300' : 'text-yellow-400'}`}>
                  {'?'.repeat(tm.score)}{'?'.repeat(5 - tm.score)}
                </div>
                <p className={`text-sm leading-relaxed italic mb-5 ${tm.featured ? 'text-white/85' : 'text-gray-500'}`}>"{tm.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${tm.featured ? 'bg-white/20 text-white' : 'bg-[#E8F5EE] text-[#1A8A3C]'}`}>{tm.init}</div>
                  <div>
                    <p className={`text-sm font-semibold ${tm.featured ? 'text-white' : ''}`}>{tm.name}</p>
                    <p className={`text-xs ${tm.featured ? 'text-white/60' : 'text-gray-400'}`}>{tm.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="section-badge">{isEn ? 'Pricing' : 'Tarifs'}</div>
            <h2 className="text-4xl font-display font-bold">{isEn ? 'Choose your plan' : 'Choisissez votre forfait'}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto items-start">
            {PLANS.map(p => (
              <div key={p.name} className={`rounded-2xl p-8 relative ${p.popular ? 'bg-[#1A8A3C] shadow-green-lg scale-105' : 'card border-2'}`}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 text-xs font-black px-4 py-1 rounded-full">
                    ? {isEn ? 'POPULAR' : 'POPULAIRE'}
                  </div>
                )}
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${p.popular ? 'text-white/60' : 'text-gray-400'}`}>{p.name}</p>
                <p className={`text-4xl font-display font-black mb-1 ${p.popular ? 'text-white' : 'text-gray-900'}`}>{p.price}</p>
                <p className={`text-sm mb-6 ${p.popular ? 'text-white/60' : 'text-gray-400'}`}>{p.period}</p>
                <ul className="flex flex-col gap-3 mb-7">
                  {p.features.map(f => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${p.popular ? 'text-white/85' : 'text-gray-600'}`}>
                      <span className={p.popular ? 'text-green-300' : 'text-[#1A8A3C]'}>?</span>{f}
                    </li>
                  ))}
                </ul>
                <Link to="/register"
                  className={`w-full justify-center flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${p.popular ? 'bg-white text-[#1A8A3C] hover:bg-gray-50' : 'btn-outline'}`}>
                  {isEn ? 'Choose this plan' : 'Choisir ce forfait'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="about" className="py-24 bg-[#f7faf8]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-[#1A8A3C] rounded-3xl p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            <div className="relative z-10">
              <h2 className="text-4xl font-display font-bold text-white mb-4">
                {isEn ? 'Ready to join the green revolution?' : 'Prêt à rejoindre la révolution verte ?'}
              </h2>
              <p className="text-white/70 text-lg mb-8">
                {isEn ? 'Sign up for free and make your first collection today.' : "Inscrivez-vous gratuitement et effectuez votre première collecte dès aujourd'hui."}
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/register" className="bg-white text-[#1A8A3C] font-bold px-8 py-4 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2">
                  <Users size={18} /> {isEn ? 'Create a free account' : 'Créer un compte gratuit'}
                </Link>
                <Link to="/login" className="border-2 border-white/40 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/10 transition-all">
                  {t('auth.login.submit')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
