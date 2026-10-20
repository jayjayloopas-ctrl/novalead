import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, BarChart3,
  Check, ChevronDown, CircleHelp, Command, Database, Globe2, Layers3, LockKeyhole,
  LogIn, Menu, MessageSquareText, MousePointer2, Plus, Radar, ShieldCheck,
  Sparkles, Target, TrendingUp, Users, X, Zap
} from 'lucide-react';
import { hasSupabaseConfig, supabase } from './lib/supabase';

const demoLeads = [
  { id: 'demo-1', name: 'Sanne de Vries', company: 'Vries Makelaardij', email: 'sanne@example.nl', phone: '06 12345678', need: 'Woning verkopen', status: 'Nieuw', created_at: new Date(Date.now() - 1000 * 60 * 38).toISOString() },
  { id: 'demo-2', name: 'Milan Jansen', company: 'Jansen Vastgoed', email: 'milan@example.nl', phone: '06 23456789', need: 'Waardebepaling', status: 'Opgevolgd', created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { id: 'demo-3', name: 'Noor Bakker', company: 'Particulier', email: 'noor@example.nl', phone: '06 34567890', need: 'Advies aanvragen', status: 'Nieuw', created_at: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString() },
];

const money = (n) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const dateLabel = (s) => new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(s));

function Logo({ small = false }) {
  return <div className="brand"><div className="brand-mark"><Radar size={small ? 18 : 21} /></div><span>NOVA<span className="brand-light">LEAD</span></span></div>;
}
function Pill({ children, tone = 'violet' }) { return <span className={`pill ${tone}`}>{children}</span>; }

export default function App() {
  const [page, setPage] = useState('home');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [leads, setLeads] = useState(demoLeads);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '', company: '', need: 'Woning verkopen', message: '', consent: false });
  const [filter, setFilter] = useState('Alles');

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) { setProfile(null); return; }
    let active = true;
    supabase.from('profiles').select('id, full_name, role').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => { if (active) setProfile(data); });
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!session || !supabase) return;
    refreshLeads();
  }, [session]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3600);
    return () => clearTimeout(timer);
  }, [toast]);

  const refreshLeads = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(200);
    if (!error && data) setLeads(data);
  };

  const isAdmin = profile?.role === 'admin';
  const visibleLeads = useMemo(() => filter === 'Alles' ? leads : leads.filter((lead) => lead.status === filter), [leads, filter]);
  const newLeads = leads.filter((l) => l.status === 'Nieuw').length;

  const notify = (message) => setToast(message);
  const navigate = (next) => { setPage(next); setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const submitLead = async (e) => {
    e.preventDefault();
    if (!leadForm.consent) return notify('Geef eerst toestemming om je aanvraag te verwerken.');
    setLoading(true);
    const payload = {
      name: leadForm.name.trim(), email: leadForm.email.trim(), phone: leadForm.phone.trim() || null,
      company: leadForm.company.trim() || null, need: leadForm.need, message: leadForm.message.trim() || null,
      status: 'Nieuw'
    };
    if (hasSupabaseConfig) {
      const { error } = await supabase.from('leads').insert(payload);
      setLoading(false);
      if (error) return notify(`Aanvraag niet verzonden: ${error.message}`);
    } else {
      setLeads((current) => [{ ...payload, id: `local-${Date.now()}`, created_at: new Date().toISOString() }, ...current]);
      setLoading(false);
    }
    setLeadForm({ name: '', email: '', phone: '', company: '', need: 'Woning verkopen', message: '', consent: false });
    notify('Aanvraag ontvangen. Bedankt!');
    navigate('home');
  };

  const submitAuth = async (e) => {
    e.preventDefault();
    if (!hasSupabaseConfig) return notify('Koppel eerst Supabase via het .env-bestand. Zie README.');
    setLoading(true);
    let result;
    if (authMode === 'signup') {
      result = await supabase.auth.signUp({
        email: authForm.email, password: authForm.password,
        options: { data: { full_name: authForm.name } }
      });
    } else {
      result = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password });
    }
    setLoading(false);
    if (result.error) return notify(result.error.message);
    if (authMode === 'signup' && !result.data.session) {
      notify('Account aangemaakt. Controleer je e-mail om je account te bevestigen.');
    } else {
      notify(authMode === 'signup' ? 'Account aangemaakt.' : 'Je bent ingelogd.');
      navigate('dashboard');
    }
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null); setProfile(null); navigate('home'); notify('Je bent uitgelogd.');
  };

  const updateStatus = async (id, status) => {
    if (!hasSupabaseConfig || String(id).startsWith('demo-') || String(id).startsWith('local-')) {
      setLeads((current) => current.map((l) => l.id === id ? { ...l, status } : l));
      return;
    }
    const { error } = await supabase.from('leads').update({ status }).eq('id', id);
    if (error) notify(`Status niet aangepast: ${error.message}`);
    else refreshLeads();
  };

  const navLinks = [
    ['home', 'Overzicht'], ['features', 'Mogelijkheden'], ['contact', 'Contact']
  ];

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <div className="topbar-inner">
          <button className="logo-button" onClick={() => navigate('home')} aria-label="Naar startpagina"><Logo /></button>
          <nav className={`nav-links ${mobileMenu ? 'open' : ''}`}>
            {navLinks.map(([key, label]) => <button key={key} className={page === key ? 'nav-active' : ''} onClick={() => navigate(key)}>{label}</button>)}
            {session && <button onClick={() => navigate('dashboard')}>Dashboard</button>}
          </nav>
          <div className="top-actions">
            {session ? <><button className="button button-quiet desktop-only" onClick={() => navigate('dashboard')}>Dashboard <ArrowRight size={15}/></button><button className="avatar-button" onClick={signOut} title="Uitloggen"><LogIn size={17}/></button></> :
              <><button className="button button-quiet desktop-only" onClick={() => { setAuthMode('login'); navigate('auth'); }}>Inloggen</button><button className="button button-primary desktop-only" onClick={() => { setAuthMode('signup'); navigate('auth'); }}>Gratis starten <ArrowRight size={15}/></button></>}
            <button className="mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu">{mobileMenu ? <X/> : <Menu/>}</button>
          </div>
        </div>
      </header>

      <main>
        {page === 'home' && <Home navigate={navigate} setAuthMode={setAuthMode} />}
        {page === 'features' && <Features navigate={navigate} />}
        {page === 'contact' && <Contact leadForm={leadForm} setLeadForm={setLeadForm} submitLead={submitLead} loading={loading} />}
        {page === 'auth' && <Auth authMode={authMode} setAuthMode={setAuthMode} authForm={authForm} setAuthForm={setAuthForm} submitAuth={submitAuth} loading={loading} />}
        {page === 'dashboard' && (session ? <Dashboard session={session} profile={profile} isAdmin={isAdmin} leads={visibleLeads} allLeads={leads} filter={filter} setFilter={setFilter} refreshLeads={refreshLeads} updateStatus={updateStatus} signOut={signOut} /> : <Auth authMode="login" setAuthMode={setAuthMode} authForm={authForm} setAuthForm={setAuthForm} submitAuth={submitAuth} loading={loading} />)}
      </main>

      <footer className="footer">
        <div className="footer-inner"><Logo small/><span>Lead intelligence, met aandacht gebouwd.</span><div className="footer-links"><button onClick={() => navigate('contact')}>Contact</button><button onClick={() => navigate('home')}>Privacy</button></div><span className="copyright">© {new Date().getFullYear()} NovaLead</span></div>
      </footer>
      {toast && <div className="toast" role="status"><BadgeCheck size={18}/>{toast}</div>}
    </div>
  );
}

function Home({ navigate, setAuthMode }) {
  return <div className="page-enter">
    <section className="hero container">
      <div className="hero-copy">
        <div className="eyebrow"><span className="pulse-dot"/> LEAD INTELLIGENCE PLATFORM <span className="eyebrow-line"/></div>
        <h1>Goede leads.<br/><span className="gradient-text">Slimmere groei.</span></h1>
        <p className="hero-subtitle">Breng aanvragen, opvolging en kansen samen in één overzichtelijk platform. Minder ruis. Meer focus op de volgende klant.</p>
        <div className="hero-buttons"><button className="button button-primary button-large" onClick={() => navigate('contact')}>Ontdek de mogelijkheden <ArrowRight size={17}/></button><button className="button button-quiet button-large" onClick={() => navigate('features')}><MousePointer2 size={16}/> Bekijk platform</button></div>
        <div className="hero-proof"><div className="proof-avatars"><span>J</span><span>M</span><span>A</span><span>+</span></div><div><strong>Gebouwd voor ambitieuze teams</strong><small>Van eerste aanvraag tot opvolging</small></div><div className="proof-separator"/><div className="proof-stat"><strong>24/7</strong><small>Inzicht in aanvragen</small></div></div>
      </div>
      <div className="hero-visual">
        <div className="orbit orbit-a"/><div className="orbit orbit-b"/>
        <div className="visual-topline"><span><span className="pulse-dot"/> LIVE OVERZICHT</span><span className="visual-dots">•••</span></div>
        <div className="metric-grid">
          <div className="metric-card main-metric"><div className="metric-label"><span>Totale aanvragen</span><span className="metric-icon"><Users size={16}/></span></div><div className="metric-number">1.284</div><div className="metric-foot"><span className="positive"><ArrowUpRight size={14}/> 18,6%</span><span>t.o.v. vorige periode</span></div><div className="sparkline"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div>
          <div className="metric-card"><div className="metric-label"><span>Conversie</span><Target size={16}/></div><div className="metric-number">8,42<span className="metric-unit">%</span></div><div className="mini-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="metric-foot"><span className="positive"><ArrowUpRight size={13}/> 2,4%</span><span>deze maand</span></div></div>
        </div>
        <div className="activity-card"><div className="activity-head"><div><span className="small-overline">RECENTE ACTIVITEIT</span><h3>Nieuwe kansen</h3></div><span className="live-badge"><span className="pulse-dot"/> Live</span></div>
          {[['SV','Sanne de Vries','Woning verkopen','2 min'],['MJ','Milan Jansen','Waardebepaling','18 min'],['NB','Noor Bakker','Advies aanvragen','43 min']].map((x,i)=><div className="activity-row" key={x[0]}><div className={`lead-avatar avatar-${i}`}>{x[0]}</div><div className="activity-person"><strong>{x[1]}</strong><span>{x[2]}</span></div><span className="activity-time">{x[3]}</span><span className="activity-status"/></div>)}
        </div>
        <div className="floating-chip chip-top"><span className="chip-icon"><Zap size={15}/></span><div><strong>Nieuwe lead</strong><small>Net binnengekomen</small></div><span className="chip-check"><Check size={13}/></span></div>
        <div className="floating-chip chip-bottom"><div className="chip-ring"><TrendingUp size={17}/></div><div><strong>Groei in zicht</strong><small>Alle kansen in beeld</small></div></div>
      </div>
    </section>
    <section className="trust-strip container"><span>ÉÉN HELDER OVERZICHT</span><div><Layers3/> Aanvragen organiseren</div><div><Activity/> Slim opvolgen</div><div><ShieldCheck/> Zorgvuldig omgaan met data</div><div><BarChart3/> Inzicht in voortgang</div></section>
    <section className="section container" id="features"><div className="section-heading"><div><div className="eyebrow">EEN SLIMMERE WERKWIJZE</div><h2>Van eerste klik naar<br/><span className="gradient-text">echte connectie.</span></h2></div><p>Een sterke basis om aanvragen te ontvangen, te begrijpen en op te volgen — met ruimte om mee te groeien.</p></div>
      <div className="feature-grid"><Feature icon={<Radar/>} number="01" title="Vang kansen op" text="Een duidelijk contactformulier maakt het eenvoudig om interesse om te zetten in een concrete aanvraag."/><Feature icon={<Database/>} number="02" title="Alles op één plek" text="Breng aanvragen en contactinformatie samen in een overzichtelijk dashboard."/><Feature icon={<TrendingUp/>} number="03" title="Blijf in beweging" text="Volg de status van iedere aanvraag en zie welke stap als volgende nodig is."/></div>
    </section>
    <section className="cta-section container"><div className="cta-glow"/><div className="cta-content"><Pill><Sparkles size={13}/> JOUW VOLGENDE STAP</Pill><h2>Klaar om kansen<br/>zichtbaar te maken?</h2><p>Start met een aanvraag en ontdek hoe NovaLead je proces kan structureren.</p><button className="button button-primary button-large" onClick={() => navigate('contact')}>Neem contact op <ArrowRight size={16}/></button></div><div className="cta-art"><div className="cta-orb"><Command size={54}/></div><div className="cta-orbit one"/><div className="cta-orbit two"/></div></section>
  </div>;
}

function Feature({ icon, number, title, text }) { return <article className="feature-card"><div className="feature-card-top"><span className="feature-icon">{icon}</span><span className="feature-number">{number}</span></div><h3>{title}</h3><p>{text}</p><span className="feature-arrow"><ArrowUpRight size={17}/></span></article>; }

function Features({ navigate }) {
  const items = [
    { icon: <MessageSquareText/>, title: 'Aanvragen ontvangen', text: 'Een heldere route voor bezoekers om hun vraag, contactgegevens en voorkeuren achter te laten.' },
    { icon: <BarChart3/>, title: 'Dashboard', text: 'Bekijk aanvragen, filter op status en houd zicht op wat nog aandacht nodig heeft.' },
    { icon: <LockKeyhole/>, title: 'Account en toegang', text: 'Registreer gebruikers en bescherm gegevens met database-regels en toegangsrechten.' },
    { icon: <ShieldCheck/>, title: 'Beheer met rollen', text: 'Een beheerdersrol kan aanvragen bekijken en statussen bijwerken. Rechten worden server-side afgedwongen.' },
    { icon: <Zap/>, title: 'Snel en responsive', text: 'Een mobielvriendelijke interface met subtiele bewegingen en duidelijke interacties.' },
    { icon: <Globe2/>, title: 'Klaar om te publiceren', text: 'Bouw lokaal en publiceer later via een gratis hostingplatform met omgevingsvariabelen.' },
  ];
  return <section className="container inner-page page-enter"><div className="eyebrow"><span className="pulse-dot"/> PLATFORM</div><h1 className="inner-title">Alles om leads<br/><span className="gradient-text">in beweging te brengen.</span></h1><p className="inner-intro">Een praktische basis voor het verzamelen en opvolgen van aanvragen, zonder de ruimte voor verdere groei te verliezen.</p><div className="feature-grid feature-grid-wide">{items.map((x,i)=><article className="feature-card feature-detail" key={x.title}><span className="feature-icon">{x.icon}</span><span className="feature-number">0{i+1}</span><h3>{x.title}</h3><p>{x.text}</p></article>)}</div><div className="center-action"><button className="button button-primary button-large" onClick={() => navigate('contact')}>Stel je vraag <ArrowRight size={16}/></button></div></section>;
}

function Contact({ leadForm, setLeadForm, submitLead, loading }) {
  const set = (key, value) => setLeadForm((old) => ({ ...old, [key]: value }));
  return <section className="container inner-page contact-layout page-enter"><div className="contact-copy"><div className="eyebrow"><span className="pulse-dot"/> CONTACT & AANVRAGEN</div><h1 className="inner-title">Elke goede samenwerking<br/><span className="gradient-text">begint met contact.</span></h1><p className="inner-intro">Vertel ons waar je naar op zoek bent. Laat je gegevens achter en je aanvraag wordt veilig verwerkt zodra de database is ingesteld.</p><div className="contact-benefit"><span><Check size={16}/></span><div><strong>Duidelijke aanvraag</strong><p>Je geeft zelf aan waar je hulp bij zoekt.</p></div></div><div className="contact-benefit"><span><ShieldCheck size={16}/></span><div><strong>Bewust met gegevens</strong><p>Je aanvraag wordt alleen verwerkt voor opvolging van je vraag.</p></div></div><div className="contact-note"><CircleHelp size={17}/> Dit formulier is een startpunt. Voeg vóór livegang je bedrijfsgegevens en privacyverklaring toe.</div></div>
    <form className="form-card" onSubmit={submitLead}><div className="form-card-heading"><div><span className="small-overline">NIEUWE AANVRAAG</span><h2>Vertel ons meer</h2></div><span className="form-symbol"><MessageSquareText/></span></div><div className="form-grid"><label>Naam <input required maxLength="100" value={leadForm.name} onChange={e=>set('name',e.target.value)} placeholder="Je volledige naam"/></label><label>E-mailadres <input type="email" required maxLength="254" value={leadForm.email} onChange={e=>set('email',e.target.value)} placeholder="jij@bedrijf.nl"/></label><label>Telefoonnummer <span className="optional">optioneel</span><input maxLength="40" value={leadForm.phone} onChange={e=>set('phone',e.target.value)} placeholder="06 12345678"/></label><label>Bedrijf <span className="optional">optioneel</span><input maxLength="120" value={leadForm.company} onChange={e=>set('company',e.target.value)} placeholder="Bedrijfsnaam"/></label><label className="full-field">Waar gaat je aanvraag over? <div className="select-wrap"><select value={leadForm.need} onChange={e=>set('need',e.target.value)}><option>Woning verkopen</option><option>Waardebepaling</option><option>Advies aanvragen</option><option>Zakelijke samenwerking</option><option>Anders</option></select><ChevronDown size={16}/></div></label><label className="full-field">Bericht <span className="optional">optioneel</span><textarea rows="3" maxLength="2000" value={leadForm.message} onChange={e=>set('message',e.target.value)} placeholder="Waar kunnen we je mee helpen?"/></label></div><label className="consent-row"><input type="checkbox" checked={leadForm.consent} onChange={e=>set('consent',e.target.checked)} required/><span>Ik geef toestemming om mijn gegevens te gebruiken om op deze aanvraag te reageren. <small>Voeg vóór publicatie een link naar je privacyverklaring toe.</small></span></label><button className="button button-primary button-large full-button" disabled={loading}>{loading ? 'Verzenden…' : 'Verstuur aanvraag'} <ArrowRight size={16}/></button><p className="form-footnote"><LockKeyhole size={13}/> Deel geen gevoelige of vertrouwelijke informatie.</p></form>
  </section>;
}

function Auth({ authMode, setAuthMode, authForm, setAuthForm, submitAuth, loading }) {
  const signup = authMode === 'signup';
  const set = (key,value) => setAuthForm(old => ({ ...old, [key]: value }));
  return <section className="container auth-page page-enter"><div className="auth-art"><div className="auth-art-orb"><Radar size={52}/></div><div className="auth-art-ring ring1"/><div className="auth-art-ring ring2"/><div className="auth-art-copy"><Pill><LockKeyhole size={13}/> VEILIGE TOEGANG</Pill><h2>Jouw werk.<br/><span className="gradient-text">Jouw overzicht.</span></h2><p>Log in om aanvragen op te volgen en je dashboard te bekijken.</p></div></div><form className="form-card auth-card" onSubmit={submitAuth}><div className="form-card-heading"><div><span className="small-overline">{signup ? 'START JE ACCOUNT' : 'WELKOM TERUG'}</span><h2>{signup ? 'Account maken' : 'Inloggen'}</h2></div><span className="form-symbol"><LockKeyhole/></span></div><p className="auth-description">{hasSupabaseConfig ? 'Gebruik je e-mailadres en wachtwoord.' : 'Demo-interface: configureer Supabase om accounts en data echt op te slaan.'}</p>{signup && <label>Naam <input required maxLength="100" value={authForm.name} onChange={e=>set('name',e.target.value)} placeholder="Je naam"/></label>}<label>E-mailadres <input type="email" required value={authForm.email} onChange={e=>set('email',e.target.value)} placeholder="jij@bedrijf.nl" autoComplete="email"/></label><label>Wachtwoord <input type="password" required minLength="8" value={authForm.password} onChange={e=>set('password',e.target.value)} placeholder="Minimaal 8 tekens" autoComplete={signup ? 'new-password' : 'current-password'}/></label><button className="button button-primary button-large full-button" disabled={loading}>{loading ? 'Even wachten…' : signup ? 'Account aanmaken' : 'Inloggen'} <ArrowRight size={16}/></button><div className="auth-switch">{signup ? 'Heb je al een account?' : 'Nog geen account?'} <button type="button" onClick={() => setAuthMode(signup ? 'login' : 'signup')}>{signup ? 'Inloggen' : 'Gratis registreren'}</button></div><div className="security-line"><ShieldCheck size={14}/> Toegang wordt gecontroleerd door Supabase</div></form></section>;
}

function Dashboard({ session, profile, isAdmin, leads, allLeads, filter, setFilter, refreshLeads, updateStatus, signOut }) {
  const [tab, setTab] = useState('leads');
  const [search, setSearch] = useState('');
  const [showAdminInfo, setShowAdminInfo] = useState(false);
  const filtered = leads.filter(l => [l.name,l.email,l.company,l.need].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase()));
  const newCount = allLeads.filter(l=>l.status === 'Nieuw').length;
  return <section className="container dashboard-page page-enter"><div className="dashboard-heading"><div><div className="eyebrow"><span className="pulse-dot"/> WORKSPACE</div><h1>Jouw <span className="gradient-text">overzicht.</span></h1><p>Welkom{profile?.full_name ? `, ${profile.full_name}` : ''}. Dit is de plek voor je aanvragen en opvolging.</p></div><div className="dashboard-actions"><Pill tone={isAdmin ? 'green' : 'violet'}>{isAdmin ? 'Beheerder' : 'Gebruiker'}</Pill><button className="button button-quiet" onClick={refreshLeads}><Activity size={15}/> Vernieuwen</button><button className="button button-quiet" onClick={signOut}>Uitloggen</button></div></div>
    {!hasSupabaseConfig && <div className="setup-warning"><CircleHelp size={18}/><div><strong>Demo-modus</strong><p>De getoonde voorbeeldleads worden niet gedeeld of opgeslagen. Stel Supabase in om echte accounts en leads te gebruiken.</p></div></div>}
    <div className="dashboard-stat-grid"><Stat icon={<Users/>} label="Alle aanvragen" value={allLeads.length} note="In dit overzicht"/><Stat icon={<Plus/>} label="Nieuw" value={newCount} note="Wachten op opvolging"/><Stat icon={<TrendingUp/>} label="Opgevolgd" value={allLeads.filter(l=>l.status==='Opgevolgd').length} note="Status bijgewerkt"/><Stat icon={<Target/>} label="Conversie" value="—" note="Koppel resultaatdata"/></div>
    <div className="dashboard-main"><aside className="dashboard-sidebar"><span className="sidebar-label">WERKRUIMTE</span><button className={tab==='leads'?'sidebar-active':''} onClick={()=>setTab('leads')}><Users size={17}/> Leads <span>{allLeads.length}</span></button><button className={tab==='analytics'?'sidebar-active':''} onClick={()=>setTab('analytics')}><BarChart3 size={17}/> Analyse</button>{isAdmin && <><span className="sidebar-label sidebar-spacer">BEHEER</span><button className={tab==='admin'?'sidebar-active':''} onClick={()=>setTab('admin')}><ShieldCheck size={17}/> Beheerderspaneel</button></>}<div className="sidebar-bottom"><div className="sidebar-user"><div className="user-initial">{(profile?.full_name || session.user.email || 'N')[0].toUpperCase()}</div><div><strong>{profile?.full_name || 'Mijn account'}</strong><small>{session.user.email}</small></div></div></div></aside>
      <div className="dashboard-content">
        {tab==='leads' && <><div className="content-heading"><div><span className="small-overline">PIPELINE</span><h2>Leadbeheer</h2></div><Pill>{allLeads.length} aanvragen</Pill></div><div className="table-controls"><div className="search-box"><Radar size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Zoek op naam, e-mail of bedrijf…"/></div><div className="select-wrap compact-select"><select value={filter} onChange={e=>setFilter(e.target.value)}><option>Alles</option><option>Nieuw</option><option>Opgevolgd</option><option>Gesloten</option></select><ChevronDown size={14}/></div></div><div className="lead-table-wrap"><table className="lead-table"><thead><tr><th>Contact</th><th>Interesse</th><th>Datum</th><th>Status</th></tr></thead><tbody>{filtered.map((lead)=><tr key={lead.id}><td><div className="table-person"><span className="table-avatar">{(lead.name||'?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()}</span><div><strong>{lead.name}</strong><small>{lead.email}</small></div></div></td><td><span className="need-label">{lead.need}</span>{lead.company && <small className="table-company">{lead.company}</small>}</td><td className="date-cell">{dateLabel(lead.created_at)}</td><td><div className="status-control"><span className={`status-dot ${lead.status==='Nieuw'?'status-new':lead.status==='Opgevolgd'?'status-progress':'status-closed'}`}/><select aria-label={`Status van ${lead.name}`} value={lead.status} onChange={e=>updateStatus(lead.id,e.target.value)}><option>Nieuw</option><option>Opgevolgd</option><option>Gesloten</option></select></div></td></tr>)}{!filtered.length && <tr><td colSpan="4" className="empty-table">Geen aanvragen gevonden.</td></tr>}</tbody></table></div><div className="table-footer"><span>Toont {filtered.length} van {allLeads.length} aanvragen</span><span><span className="pulse-dot"/> Actueel overzicht</span></div></>}
        {tab==='analytics' && <><div className="content-heading"><div><span className="small-overline">INZICHT</span><h2>Analyse</h2></div></div><div className="analytics-card"><div className="analytics-placeholder"><BarChart3 size={34}/><h3>Je cijfers beginnen hier</h3><p>De basis telt {allLeads.length} aanvragen. Voeg later bron, campagne en resultaat toe om conversies betrouwbaar te meten.</p></div><div className="analytics-rows"><div><span>Nieuwe aanvragen</span><strong>{newCount}</strong></div><div><span>Opgevolgd</span><strong>{allLeads.filter(l=>l.status==='Opgevolgd').length}</strong></div><div><span>Gesloten</span><strong>{allLeads.filter(l=>l.status==='Gesloten').length}</strong></div></div></div></>}
        {tab==='admin' && isAdmin && <><div className="content-heading"><div><span className="small-overline">ADMINISTRATIE</span><h2>Beheerderspaneel</h2></div><Pill tone="green"><ShieldCheck size={12}/> Adminrechten</Pill></div><div className="admin-panel"><div className="admin-icon"><ShieldCheck size={25}/></div><h3>Beheer en veiligheid</h3><p>Je bent ingelogd met een beheerdersrol. Database policies bepalen welke acties daadwerkelijk zijn toegestaan.</p><button className="button button-quiet" onClick={()=>setShowAdminInfo(!showAdminInfo)}>{showAdminInfo?'Verberg beveiligingsinfo':'Bekijk beveiligingsinfo'} <ArrowRight size={15}/></button>{showAdminInfo && <div className="admin-info"><strong>Belangrijk vóór livegang</strong><ul><li>Stel de adminrol alleen in via de Supabase SQL-editor.</li><li>Schakel e-mailbevestiging in en gebruik sterke wachtwoorden.</li><li>Controleer RLS-beleid en voeg spambeveiliging toe.</li><li>De anon key mag in de browser; gebruik nooit de service-role key in frontendcode.</li></ul></div>}</div><div className="admin-summary"><div><span>Accountsessie</span><strong>{session.user.email}</strong></div><div><span>Rol</span><strong>Administrator</strong></div><div><span>Leads in overzicht</span><strong>{allLeads.length}</strong></div></div></>}
      </div>
    </div><p className="dashboard-disclaimer"><LockKeyhole size={13}/> Alleen geautoriseerde gebruikers kunnen gegevens bekijken. Zet vóór productie je rollen, privacyverklaring en spambeveiliging goed.</p>
  </section>;
}
function Stat({ icon, label, value, note }) { return <div className="dashboard-stat"><div className="stat-top"><span className="stat-icon">{icon}</span><span className="stat-label">{label}</span></div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>; }