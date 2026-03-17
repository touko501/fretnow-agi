/**
 * NOVA Chat v3 — Widget React avec personnage SVG anime
 * Import: import NovaChat from './components/NovaChat';
 * Usage: <NovaChat />
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';

const NovaCharFull = ({ expression = 'happy', style = {} }) => (
  <svg style={style} viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="3" r="2.5" fill="#A78BFA" style={{animation:'novaAntennaGlow 3s ease-in-out infinite'}}/>
    <line x1="18" y1="5.5" x2="18" y2="10" strokeWidth="2" stroke="#A78BFA"/>
    <rect x="5" y="10" width="26" height="22" rx="8" ry="8" fill="#6C3AED"/>
    <rect x="9" y="14" width="18" height="14" rx="5" ry="5" fill="#1A1430"/>
    <ellipse cx="14" cy="21" rx="2.5" ry={expression==='thinking'?5:2.8} fill={expression==='happy'?'#FCD34D':'#F59E0B'} style={{transition:'all 0.5s'}}/>
    <ellipse cx="22" cy="21" rx="2.5" ry={expression==='thinking'?5:2.8} fill={expression==='happy'?'#FCD34D':'#F59E0B'} style={{transition:'all 0.5s'}}/>
    <circle cx="15" cy="19.8" r="0.8" fill="white" opacity="0.8"/>
    <circle cx="23" cy="19.8" r="0.8" fill="white" opacity="0.8"/>
    <path d={expression==='thinking'?'M 14 28 Q 18 27 22 28':'M 13 26 Q 18 31 23 26'} fill="none" stroke={expression==='happy'?'#FCD34D':'#F59E0B'} strokeWidth="1.8" strokeLinecap="round" style={{transition:'all 0.5s'}}/>
    <ellipse cx="10" cy="24" rx="2.5" ry="1.5" fill={expression==='happy'?'rgba(245,158,11,0.3)':'rgba(245,158,11,0.15)'} style={{transition:'fill 0.5s'}}/>
    <ellipse cx="26" cy="24" rx="2.5" ry="1.5" fill={expression==='happy'?'rgba(245,158,11,0.3)':'rgba(245,158,11,0.15)'} style={{transition:'fill 0.5s'}}/>
  </svg>
);

const NovaCharMini = ({ style = {} }) => (
  <svg style={style} viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
    <circle fill="#A78BFA" cx="18" cy="5" r="2" opacity="0.8"/>
    <line x1="18" y1="7" x2="18" y2="11" stroke="#A78BFA" strokeWidth="1.5" opacity="0.8"/>
    <rect fill="#6C3AED" x="7" y="11" width="22" height="18" rx="7"/>
    <rect fill="#1A1430" x="10" y="14" width="16" height="12" rx="4"/>
    <ellipse fill="#F59E0B" cx="14.5" cy="20" rx="2" ry="2.2"/>
    <ellipse fill="#F59E0B" cx="21.5" cy="20" rx="2" ry="2.2"/>
    <circle fill="white" cx="15.3" cy="19" r="0.6" opacity="0.7"/>
    <circle fill="white" cx="22.3" cy="19" r="0.6" opacity="0.7"/>
    <path d="M 13.5 24 Q 18 28 22.5 24" fill="none" stroke="#F59E0B" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const KB = {
  commission:{kw:['commission','prix','cout','tarif','combien','cher','gratuit','payer','frais'],r:"Excellente question ! Commission de **seulement 10%** vs 25%+ chez les courtiers. Pour 1000EUR : courtier=750EUR, FRETNOW=**900EUR**. Inscription **100% gratuite** !",q:['Et le paiement ?',"M'inscrire",'Comparer']},
  paiement:{kw:['paiement','paye','j+1','delai','argent','tresorerie','virement'],r:"Notre atout #1 ! Paye en **J+1**. 1) Expediteur prepaye 2) Vous livrez 3) Virement le lendemain. Fini les 60-90 jours !",q:["Securise ?",'Commission ?',"M'inscrire"]},
  inscription:{kw:['inscrire','inscription','commencer','rejoindre','compte'],r:"Inscription **gratuite, 2 minutes** ! Allez sur **fretnow-agi.onrender.com/register**. Lancement **1er avril 2026**.",q:['Transporteur','Expediteur','Avantages ?']},
  ia:{kw:['ia','intelligence','artificielle','agent','agents','nova','matching','algorithme'],r:"**10 agents IA** 24/7 : Matcher, Pricing (CNR), Scout, Analyst, Risk, Predict... Et moi **NOVA**, AI Managing Partner !",q:['Retour charge ?','Commission ?',"M'inscrire !"]},
  transporteur:{kw:['transporteur','chauffeur','camion','routier','vehicule'],r:"Transporteur ? Parfait ! **Retour charge garanti** par l'IA, **J+1**, **10%** commission, **Mobilic integre**, **0EUR d'avance**.",q:["M'inscrire ?","J+1 ?","Zones ?"]},
  expediteur:{kw:['expediteur','expedier','chargeur','envoyer','livrer','livraison'],r:"FRETNOW revolutionne votre logistique ! **Matching en secondes**, tracking GPS, preuve digitale, **10%** seulement, 4 types de transport.",q:['Types de fret ?','Poster mission ?','Delais ?']},
  securite:{kw:['secur','confiance','fiable','fraude','sequestre','garanti'],r:"Securite maximale ! Sequestre bancaire, Agent Risk IA, verification SIRET/KBIS, tracking GPS, preuve digitale infalsifiable.",q:['Sequestre ?',"M'inscrire",'Commission ?']},
  comparaison:{kw:['difference','comparer','courtier','concurrent','avantage','vs','pourquoi'],r:"FRETNOW vs Courtiers : Commission **10%** vs 25%+, Paiement **J+1** vs 60-90j, Matching **10 agents IA** vs Manuel, Mobilic **integre** vs Non dispo.",q:["M'inscrire !","L'IA","Comment ?"]},
};

function findKBMatch(input) {
  const n = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let best = null, bs = 0;
  for (const [k, d] of Object.entries(KB)) {
    let sc = 0;
    for (const w of d.kw) if (n.includes(w.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) sc += w.length;
    if (sc > bs) { bs = sc; best = k; }
  }
  return best;
}

function fallbackRespond(input) {
  const n = input.toLowerCase();
  if (n.match(/bonjour|salut|hello|hey|coucou/)) return { text: "Bonjour ! Je suis **NOVA**, l'assistante IA de FRETNOW. Comment puis-je vous aider ?", quickReplies: ['Transporteur','Expediteur','FRETNOW ?'] };
  if (n.match(/merci|parfait|super|genial|top/)) return { text: "Avec plaisir ! Je suis la **24h/24**. Inscription gratuite sur **fretnow-agi.onrender.com** !", quickReplies: ["M'inscrire !","Autre question"] };
  if (n.match(/qui es[- ]tu|ton nom|nova/)) return { text: "Je suis **NOVA** — Agent IA #009, AI Managing Partner de FRETNOW. Je coordonne 10 agents IA pour le fret routier !", quickReplies: ['Agents IA','Commission','Comment ?'] };
  const m = findKBMatch(input);
  if (m) return { text: KB[m].r, quickReplies: KB[m].q };
  return { text: "Je peux vous renseigner sur : **commission 10%**, **paiement J+1**, **10 agents IA**, types de transport, securite. Que souhaitez-vous ?", quickReplies: ['Tarifs','J+1','IA',"M'inscrire"] };
}

function formatText(t) { return t ? t.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#F59E0B;font-weight:600">$1</strong>').replace(/\n/g, '<br/>') : ''; }

const typingPhrases = ["NOVA reflechit...","Consultation des agents IA...","Analyse en cours...","Preparation de la reponse..."];

const CSS = `
@keyframes novaFabBreathe{0%,100%{box-shadow:0 4px 24px rgba(108,58,237,0.35),0 0 0 0 rgba(108,58,237,0.3)}50%{box-shadow:0 4px 28px rgba(108,58,237,0.35),0 0 0 12px rgba(108,58,237,0)}}
@keyframes novaFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes novaCharBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes novaDot{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-4px)}}
@keyframes novaBlink{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes novaAntennaGlow{0%,100%{fill:#A78BFA}50%{fill:#F59E0B}}
@keyframes novaBadgePop{0%{transform:scale(0)}60%{transform:scale(1.3)}100%{transform:scale(1)}}
.nova-msgs-area::-webkit-scrollbar{width:3px}.nova-msgs-area::-webkit-scrollbar-thumb{background:rgba(139,92,246,.12);border-radius:3px}
`;

export default function NovaChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingPhrase, setTypingPhrase] = useState(typingPhrases[0]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showBadge, setShowBadge] = useState(true);
  const [quickReplies, setQuickReplies] = useState([]);
  const [expression, setExpression] = useState('happy');
  const [sessionId, setSessionId] = useState(null);
  const [focused, setFocused] = useState(false);
  const msgsRef = useRef(null);
  const textareaRef = useRef(null);
  const stylesRef = useRef(false);

  useEffect(() => { if (stylesRef.current) return; stylesRef.current = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); return () => { try { document.head.removeChild(s); } catch(e){} }; }, []);
  useEffect(() => { if (msgsRef.current) requestAnimationFrame(() => { msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }); }, [messages, isTyping, quickReplies, showWelcome]);
  useEffect(() => { if (isOpen && textareaRef.current) textareaRef.current.focus(); }, [isOpen]);

  const timeStr = useCallback(() => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), []);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isTyping) return;
    const userMsg = { role: 'user', content: text.trim(), time: timeStr() };
    setMessages(prev => [...prev, userMsg]);
    setShowWelcome(false); setQuickReplies([]); setInputVal('');
    setIsTyping(true); setExpression('thinking');
    setTypingPhrase(typingPhrases[Math.floor(Math.random() * typingPhrases.length)]);
    const apiMessages = [...messages, userMsg].map(m => ({ role: m.role === 'nova' ? 'assistant' : 'user', content: m.content }));
    let response = null;
    try {
      const res = await fetch('/api/nova/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: apiMessages, sessionId }) });
      if (res.ok) { const data = await res.json(); response = { text: data.response, quickReplies: [] }; if (data.sessionId) setSessionId(data.sessionId); }
    } catch (e) {}
    if (!response) response = fallbackRespond(text);
    const delay = Math.min(500 + response.text.length * 1.2, 2500);
    await new Promise(r => setTimeout(r, delay));
    setIsTyping(false); setExpression('happy');
    setMessages(prev => [...prev, { role: 'nova', content: response.text, time: timeStr() }]);
    if (response.quickReplies?.length) setTimeout(() => setQuickReplies(response.quickReplies), 200);
  }, [isTyping, messages, sessionId, timeStr]);

  const handleQuickAction = (text) => { setQuickReplies([]); setShowWelcome(false); sendMessage(text); };

  const s = {
    fab: { position:'fixed',bottom:24,right:24,zIndex:10000,width:68,height:68,border:'none',cursor:'pointer',background:'none',padding:0 },
    fabInner: (o) => ({ width:'100%',height:'100%',borderRadius:o?16:'50%',background:'linear-gradient(135deg,#6C3AED,#8B5CF6)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 24px rgba(108,58,237,0.35)',position:'relative',animation:o?'none':'novaFabBreathe 4s ease-in-out infinite',transform:o?'scale(.9)':'scale(1)',transition:'all .3s' }),
    badge: { position:'absolute',top:-3,right:-3,width:22,height:22,borderRadius:'50%',background:'#F59E0B',color:'#0B0816',fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',border:'2.5px solid #0B0816',animation:'novaBadgePop .5s ease' },
    win: (o) => ({ position:'fixed',bottom:104,right:24,zIndex:9999,width:400,maxWidth:'calc(100vw - 20px)',height:650,maxHeight:'calc(100vh - 130px)',background:'#130F22',border:'1px solid rgba(139,92,246,0.12)',borderRadius:24,display:'flex',flexDirection:'column',overflow:'hidden',opacity:o?1:0,transform:o?'translateY(0) scale(1)':'translateY(24px) scale(.92)',pointerEvents:o?'all':'none',transition:'all .4s cubic-bezier(.175,.885,.32,1.275)',boxShadow:'0 32px 100px rgba(0,0,0,.6)',fontFamily:"'Inter',-apple-system,sans-serif" }),
  };

  return (
    <>
      <button style={s.fab} onClick={() => { setIsOpen(p => { if (!p) setShowBadge(false); return !p; }); }} aria-label="Chat NOVA">
        <div style={s.fabInner(isOpen)}>
          {isOpen ? <svg viewBox="0 0 24 24" style={{width:24,height:24,fill:'white'}}><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg> : <NovaCharMini style={{width:38,height:38}}/>}
          {showBadge && !isOpen && <span style={s.badge}>1</span>}
        </div>
      </button>
      <div style={s.win(isOpen)}>
        <div style={{padding:'16px 18px',background:'linear-gradient(180deg,#1A1430,#130F22)',borderBottom:'1px solid rgba(139,92,246,0.12)',display:'flex',alignItems:'center',gap:14,flexShrink:0}}>
          <NovaCharFull expression={expression} style={{width:48,height:48,flexShrink:0,filter:'drop-shadow(0 2px 8px rgba(108,58,237,0.3))'}}/>
          <div style={{flex:1}}>
            <h3 style={{fontSize:15,fontWeight:800,display:'flex',alignItems:'center',gap:6,color:'#F8FAFC',margin:0}}>NOVA <span style={{fontSize:8,fontWeight:700,textTransform:'uppercase',padding:'2px 6px',borderRadius:4,background:'rgba(108,58,237,.2)',color:'#8B5CF6'}}>Agent #009</span><span style={{fontSize:8,fontWeight:700,textTransform:'uppercase',padding:'2px 6px',borderRadius:4,background:'rgba(16,185,129,.12)',color:'#10B981'}}>Claude AI</span></h3>
            <p style={{fontSize:11,color:'#10B981',marginTop:2,display:'flex',alignItems:'center',gap:5}}><span style={{width:5,height:5,borderRadius:'50%',background:'#10B981',animation:'novaBlink 2s infinite',display:'inline-block'}}/>En ligne</p>
          </div>
          <div style={{display:'flex',gap:4}}>
            <button onClick={(e) => { e.stopPropagation(); setMessages([]); setQuickReplies([]); setShowWelcome(true); setExpression('happy'); setSessionId(null); }} style={{width:30,height:30,borderRadius:8,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)',color:'#A5B4C8',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center'}}>&#x1F504;</button>
            <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} style={{width:30,height:30,borderRadius:8,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)',color:'#A5B4C8',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
        </div>
        <div ref={msgsRef} className="nova-msgs-area" style={{flex:1,overflowY:'auto',padding:'18px 14px',display:'flex',flexDirection:'column',gap:14,scrollBehavior:'smooth'}}>
          {showWelcome && (
            <div style={{background:'linear-gradient(135deg,rgba(108,58,237,.08),rgba(245,158,11,.05))',border:'1px solid rgba(139,92,246,0.12)',borderRadius:16,padding:20,textAlign:'center',animation:'novaFadeUp .5s ease'}}>
              <NovaCharFull expression="happy" style={{width:80,height:80,margin:'0 auto 12px',display:'block',animation:'novaCharBounce 3s ease-in-out infinite'}}/>
              <h4 style={{fontSize:16,fontWeight:800,marginBottom:6,background:'linear-gradient(135deg,#8B5CF6,#F59E0B)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Salut, moi c'est NOVA !</h4>
              <p style={{fontSize:12.5,color:'#A5B4C8',lineHeight:1.6}}>Assistante IA de FRETNOW.<br/>Je vous aide a comprendre notre plateforme et a trouver les meilleures solutions pour votre fret.</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center',marginTop:12}}>
                {[{l:'Transporteur',q:'Je suis transporteur'},{l:'Expediteur',q:'Je suis expediteur'},{l:'Decouvrir',q:"Qu'est-ce que FRETNOW ?"},{l:'Tarifs',q:'Quelle est votre commission ?'}].map(i => (
                  <button key={i.q} onClick={() => handleQuickAction(i.q)} style={{padding:'6px 12px',borderRadius:20,background:'rgba(108,58,237,.08)',border:'1px solid rgba(108,58,237,.2)',color:'#8B5CF6',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{i.l}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => {const isN = msg.role === 'nova'; return (
            <div key={i} style={{display:'flex',gap:8,maxWidth:'90%',animation:'novaFadeUp .35s ease',alignSelf:isN?'flex-start':'flex-end',flexDirection:isN?'row':'row-reverse'}}>
              <div style={{width:28,height:28,borderRadius:9,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',marginTop:2,overflow:'hidden',background:isN?'linear-gradient(135deg,#6C3AED,#8B5CF6)':'rgba(245,158,11,.12)',padding:isN?3:0,fontSize:13}}>{isN?<NovaCharMini style={{width:'100%',height:'100%'}}/>:'👤'}</div>
              <div><div style={{padding:'11px 14px',borderRadius:16,fontSize:13,lineHeight:1.65,wordWrap:'break-word',...(isN?{background:'#1A1430',border:'1px solid rgba(139,92,246,0.12)',borderTopLeftRadius:4,color:'#F8FAFC'}:{background:'linear-gradient(135deg,#6C3AED,#5B21B6)',borderTopRightRadius:4,color:'white'})}} dangerouslySetInnerHTML={{__html:formatText(msg.content)}}/><div style={{fontSize:9,color:'#64748B',marginTop:3,textAlign:isN?'left':'right'}}>{msg.time}</div></div>
            </div>
          );})}
          {quickReplies.length > 0 && (
            <div style={{display:'flex',flexWrap:'wrap',gap:6,padding:'2px 0 4px 36px',animation:'novaFadeUp .4s ease'}}>
              {quickReplies.map((qr, i) => (<button key={i} onClick={() => handleQuickAction(qr)} style={{padding:'7px 13px',borderRadius:20,background:'rgba(108,58,237,.07)',border:'1px solid rgba(108,58,237,.2)',color:'#8B5CF6',fontSize:11.5,cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>{qr}</button>))}
            </div>
          )}
          {isTyping && (
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'0 14px',animation:'novaFadeUp .3s ease'}}>
              <div style={{width:28,height:28,borderRadius:9,background:'linear-gradient(135deg,#6C3AED,#8B5CF6)',display:'flex',alignItems:'center',justifyContent:'center',padding:3,flexShrink:0}}><NovaCharMini style={{width:'100%',height:'100%'}}/></div>
              <div><div style={{background:'#1A1430',border:'1px solid rgba(139,92,246,0.12)',borderRadius:16,borderTopLeftRadius:4,padding:'12px 16px',display:'flex',gap:4}}>{[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:'50%',background:'#8B5CF6',animation:`novaDot 1.4s infinite ${i*0.2}s`}}/>)}</div><div style={{fontSize:10,color:'#64748B',fontStyle:'italic',marginTop:2}}>{typingPhrase}</div></div>
            </div>
          )}
        </div>
        <div style={{padding:'12px 14px',borderTop:'1px solid rgba(139,92,246,0.12)',background:'rgba(11,8,22,.5)',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'flex-end',gap:8,background:'#1A1430',border:'1px solid rgba(139,92,246,0.12)',borderRadius:14,padding:'5px 5px 5px 14px',transition:'all .2s',...(focused?{borderColor:'#8B5CF6',boxShadow:'0 0 0 3px rgba(108,58,237,.08)'}:{})}}>
            <textarea ref={textareaRef} rows={1} placeholder="Demandez-moi ce que vous voulez..." value={inputVal} onChange={(e) => { setInputVal(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,80)+'px'; }} onKeyDown={(e) => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputVal); if (textareaRef.current) textareaRef.current.style.height='auto'; } }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} disabled={isTyping} style={{flex:1,background:'none',border:'none',outline:'none',color:'#F8FAFC',fontFamily:'inherit',fontSize:13,resize:'none',lineHeight:1.5,maxHeight:80,padding:'7px 0'}}/>
            <button onClick={() => sendMessage(inputVal)} disabled={isTyping || !inputVal.trim()} style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#6C3AED,#8B5CF6)',border:'none',cursor:isTyping||!inputVal.trim()?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:isTyping||!inputVal.trim()?.35:1}}><svg viewBox="0 0 24 24" style={{width:16,height:16,fill:'white'}}><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
          </div>
        </div>
        <div style={{textAlign:'center',padding:6,fontSize:9,color:'#64748B'}}>Propulse par <a href="https://fretnow-agi.onrender.com" target="_blank" rel="noopener noreferrer" style={{color:'#8B5CF6',textDecoration:'none'}}>FRETNOW AGI</a> × Claude AI — NOVA v3</div>
      </div>
    </>
  );
}
