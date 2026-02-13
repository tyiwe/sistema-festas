import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiGet } from "../../api";
import Header from "../../components/Header";

type DrinkCount = {
  option_id: string;
  name: string;
  count: number;
  is_available: boolean;
};

type Stats = {
  total_registrations: number;
  drink_counts: DrinkCount[];
  event: {
    id: string;
    title: string;
    capacity: number;
  };
};

type Registration = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  allergies: string | null;
  notes: string | null;
  created_at: string;
  selections: Array<{
    option_id: string;
    name: string;
    type: string;
  }>;
};

type RegistrationsResponse = {
  registrations: Registration[];
};

export default function AdminEventStats() {
  const { id } = useParams();
  const eventId = String(id);

  const [stats, setStats] = useState<Stats | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"stats" | "registrations" | "shopping">("stats");
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [fixedCost, setFixedCost] = useState<number>(0);
  const [houseValue, setHouseValue] = useState<number>(0);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiGet<Stats>(`/admin/events/${eventId}/stats`)
      .then(setStats)
      .catch((e: any) => setError(String(e?.message ?? e)));

    apiGet<RegistrationsResponse>(`/admin/events/${eventId}/registrations`)
      .then((data) => setRegistrations(data.registrations))
      .catch((e: any) => setError(String(e?.message ?? e)));

    // Load persistent data
    const savedPrices = localStorage.getItem(`event_${eventId}_prices`);
    if (savedPrices) try { setPrices(JSON.parse(savedPrices)); } catch (e) {}

    const savedFixed = localStorage.getItem(`event_${eventId}_fixed_cost`);
    if (savedFixed) setFixedCost(parseFloat(savedFixed) || 0);

    const savedHouse = localStorage.getItem(`event_${eventId}_house_value`);
    if (savedHouse) setHouseValue(parseFloat(savedHouse) || 0);

    const savedChecked = localStorage.getItem(`event_${eventId}_checked`);
    if (savedChecked) try { setCheckedItems(JSON.parse(savedChecked)); } catch (e) {}
  }, [eventId]);

  const updatePrice = (optionId: string, price: string) => {
    const newPrices = { ...prices, [optionId]: parseFloat(price) || 0 };
    setPrices(newPrices);
    localStorage.setItem(`event_${eventId}_prices`, JSON.stringify(newPrices));
  };

  const updateFixedCost = (val: string) => {
    const num = parseFloat(val) || 0;
    setFixedCost(num);
    localStorage.setItem(`event_${eventId}_fixed_cost`, num.toString());
  };

  const updateHouseValue = (val: string) => {
    const num = parseFloat(val) || 0;
    setHouseValue(num);
    localStorage.setItem(`event_${eventId}_house_value`, num.toString());
  };

  const toggleChecked = (optionId: string) => {
    const newChecked = { ...checkedItems, [optionId]: !checkedItems[optionId] };
    setCheckedItems(newChecked);
    localStorage.setItem(`event_${eventId}_checked`, JSON.stringify(newChecked));
  };

  const resetChecked = () => {
    if (window.confirm("Deseja desmarcar todos os itens?")) {
      setCheckedItems({});
      localStorage.removeItem(`event_${eventId}_checked`);
    }
  };

  const calculateEstimateValue = (name: string, count: number) => {
    const n = name.toLowerCase();
    if (n.includes('cerveja')) return count * 2.0;
    if (n.includes('gin') || n.includes('vodka') || n.includes('whisky') || n.includes('destilado') || n.includes('cachaça') || n.includes('cachaca') || n.includes('tequila') || n.includes('rum') || n.includes('conhaque')) return count * 0.1;
    if (n.includes('refrigerante') || n.includes('refri') || n.includes('coca') || n.includes('guaraná') || n.includes('guarana') || n.includes('sprite') || n.includes('fanta')) return count * 0.6;
    if (n.includes('suco')) return count * 0.5;
    if (n.includes('vinho') || n.includes('espumante')) return count * 0.25;
    if (n.includes('água') || n.includes('agua')) return count * 0.4;
    if (n.includes('energético') || n.includes('energetico')) return count * 0.8;
    if (n.includes('gelo')) return Math.ceil(count * 2.5);
    if (n.includes('tônica') || n.includes('tonica')) return count * 0.5;
    return count * 1.0;
  };

  const calculateEstimate = (name: string, count: number) => {
    const val = calculateEstimateValue(name, count);
    if (name.toLowerCase().includes('gelo')) return `${val} KG`;
    return val >= 1 ? `${val.toFixed(1)} L` : `${(val * 1000).toFixed(0)} ML`;
  };

  const calculateDrinksTotal = () => {
    if (!stats) return 0;
    const total = (stats.drink_counts || []).reduce((acc, d) => {
      const pricePerUnit = prices[d.option_id] || 0;
      const volume = calculateEstimateValue(d.name, d.count);
      return acc + (volume * pricePerUnit);
    }, 0);
    return Math.round(total * 100) / 100;
  };

  const calculateTotalFinance = () => {
    return Math.round((calculateDrinksTotal() + fixedCost + houseValue) * 100) / 100;
  };

  const shareBilling = () => {
    if (!stats || (stats.total_registrations || 0) === 0) return;
    
    const drinksTotal = calculateDrinksTotal();
    const fixedTotal = fixedCost + houseValue;
    const total = drinksTotal + fixedTotal;
    
    const currentPeople = stats.total_registrations || 1;
    const perPerson = total / currentPeople;
    
    const totalCapacity = Number(stats.event?.capacity || 0);
    // Use absolute capacity if available, otherwise fallback to currentPeople
    const divisorIfFull = totalCapacity > 0 ? totalCapacity : currentPeople;
    const perPersonIfFull = total / divisorIfFull;

    console.log('--- DEBUG shareBilling ---');
    console.log('Total Geral:', total);
    console.log('Total de Inscritos (currentPeople):', currentPeople);
    console.log('Capacidade Total (totalCapacity):', totalCapacity);
    console.log('Vagas Restantes:', totalCapacity - currentPeople);
    console.log('Divisor Usado para "Se Lotar":', divisorIfFull);
    console.log('Cálculo Efetuado: total / divisorIfFull =', total, '/', divisorIfFull, '=', perPersonIfFull);
    console.log('--------------------------');

    let text = `💰 Acerto do Rolê\n\n` +
      `Fala galera! Fizemos as contas aqui do evento:\n\n`;

    if (houseValue > 0) text += `Airbnb/Casa: R$ ${houseValue.toFixed(2)}\n`;
    if (fixedCost > 0) text += `Outros Custos: R$ ${fixedCost.toFixed(2)}\n`;
    text += `Bebidas: R$ ${drinksTotal.toFixed(2)}\n`;
    text += `--------------------------\n`;
    text += `Total Geral: R$ ${total.toFixed(2)}\n`;
    text += `Por pessoa (${currentPeople} atuais): R$ ${perPerson.toFixed(2)}\n`;

    if (perPersonIfFull && totalCapacity > currentPeople) {
      text += `Se lotar (${totalCapacity} pessoas): R$ ${perPersonIfFull.toFixed(2)}\n`;
      text += `(Economia de R$ ${(perPerson - perPersonIfFull).toFixed(2)} p/ pessoa!)\n`;
    }

    text += `\n_Pode mandar o Pix aqui pra agilizar!_`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text.replace('💰 ', ''))}`, '_blank');
  };

  const max = useMemo(() => {
    return Math.max(1, ...(stats?.drink_counts ?? []).map((d) => d.count));
  }, [stats]);

  return (
    <>
      <Header title="Estatísticas" />
      <div className="container fade-in" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
        <main className="stack">
          <section className="stack tight stagger-1" style={{ marginBottom: '24px' }}>
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div>
                <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 5vw, 40px)', textAlign: 'left', margin: 0 }}>
                  Estatísticas do <span className="gradient-text">Evento</span>
                </h1>
                <h2 style={{ fontSize: '20px', fontWeight: 600, opacity: 0.8, marginTop: '4px' }}>
                  {stats?.event?.title}
                </h2>
              </div>
              <div className="row" style={{ gap: '12px' }}>
                <Link to={`/admin/edit/${eventId}`} className="btn small" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>Editar Evento</Link>
                <Link to="/admin" className="btn small" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>Painel</Link>
              </div>
            </div>
          </section>

          <div className="card stagger-2" style={{ padding: '4px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', marginBottom: '32px' }}>
            <div className="row" style={{ gap: '4px' }}>
              <button 
                onClick={() => setActiveTab("stats")} 
                className={`btn ${activeTab === "stats" ? "primary" : "ghost"}`}
                style={{ flex: 1, borderRadius: '10px', padding: '10px', fontSize: '14px', border: 'none' }}
              >
                Bebidas
              </button>
              <button 
                onClick={() => setActiveTab("registrations")} 
                className={`btn ${activeTab === "registrations" ? "primary" : "ghost"}`}
                style={{ flex: 1, borderRadius: '10px', padding: '10px', fontSize: '14px', border: 'none' }}
              >
                Convidados
              </button>
              <button 
                onClick={() => setActiveTab("shopping")} 
                className={`btn ${activeTab === "shopping" ? "primary" : "ghost"}`}
                style={{ flex: 1, borderRadius: '10px', padding: '10px', fontSize: '14px', border: 'none' }}
              >
                Compras
              </button>
            </div>
          </div>

          {activeTab === "stats" && stats && (
            <section className="stack tight stagger-3">
              <div className="row between" style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Preferências</h2>
                <button className="btn primary" onClick={shareBilling}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                  Compartilhar
                </button>
              </div>
              
              <div className="card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', marginBottom: '24px' }}>
                <div className="card-content">
                  <div className="row wrap" style={{ gap: '24px' }}>
                    <div className="field" style={{ flex: 1, minWidth: '200px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Airbnb/Casa (R$)</label>
                      <input type="number" value={houseValue} onChange={(e) => updateHouseValue(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="field" style={{ flex: 1, minWidth: '200px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Outros Custos (R$)</label>
                      <input type="number" value={fixedCost} onChange={(e) => updateFixedCost(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="stack" style={{ gap: '16px' }}>
                {stats?.drink_counts.map((d) => (
                  <div key={d.option_id} className="card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                    <div className="card-content">
                      <div className="row between wrap" style={{ gap: '20px' }}>
                        <div style={{ flex: 1, minWidth: '250px' }}>
                          <div className="row" style={{ gap: '12px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '18px', fontWeight: 700 }}>{d.name}</span>
                            <span className="status-badge" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>{d.count} votos</span>
                          </div>
                          <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                            <div style={{ background: 'var(--primary)', height: '100%', width: `${(d.count / max) * 100}%`, borderRadius: '4px', boxShadow: '0 0 10px var(--primary)' }} />
                          </div>
                          <div className="card-meta">
                            <span>Estimativa: <strong>{calculateEstimate(d.name, d.count)}</strong></span>
                          </div>
                        </div>
                        <div className="field" style={{ width: '150px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Preço/Unid</label>
                          <input 
                            type="number" 
                            placeholder="R$ 0,00" 
                            value={prices[d.option_id] || ""} 
                            onChange={(e) => updatePrice(d.option_id, e.target.value)} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* REGISTRATIONS TAB */}
          {activeTab === "registrations" && (
            <div className="card stagger-3" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
              <div className="card-content">
                <h3 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: 700 }}>Lista de Inscritos</h3>

                {registrations.length === 0 ? (
                  <div className="empty-state" style={{ padding: '60px' }}>
                    <p className="muted">Nenhum inscrito ainda.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', margin: '0 -24px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--glass-bg)', borderBottom: '1px solid var(--glass-border)' }}>
                          <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Convidado</th>
                          <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contato</th>
                          <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bebidas</th>
                          <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alergias</th>
                          <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrations.map((reg) => (
                          <tr key={reg.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s ease' }} className="table-row-hover">
                            <td style={{ padding: '16px 24px' }}>
                              <div style={{ fontWeight: 600, fontSize: '15px' }}>{reg.full_name}</div>
                            </td>
                            <td style={{ padding: '16px 24px' }}>
                              <div style={{ fontSize: '14px' }}>
                                <a href={`mailto:${reg.email}`} className="link-btn" style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>{reg.email}</a>
                                <a href={`tel:${reg.phone}`} className="link-btn" style={{ fontSize: '13px' }}>{reg.phone}</a>
                              </div>
                            </td>
                            <td style={{ padding: '16px 24px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {reg.selections.length === 0 ? (
                                  <span className="status-badge draft">Nenhuma</span>
                                ) : (
                                  reg.selections.map((sel) => (
                                    <span key={sel.option_id} className="status-badge published" style={{ fontSize: '11px', padding: '4px 8px' }}>
                                      {sel.name}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '16px 24px' }}>
                              <div style={{ fontSize: '13px', color: reg.allergies ? 'var(--error)' : 'var(--text-muted)' }}>
                                {reg.allergies || "—"}
                              </div>
                            </td>
                            <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '13px', color: 'var(--text-muted)' }}>
                              {new Date(reg.created_at).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

              {/* SHOPPING & FINANCE TAB */}
              {activeTab === "shopping" && stats && (
                <div className="stack tight stagger-3" style={{ padding: 0 }}>
                  {/* UNIFIED HEADER WITH TOTAL COST */}
                  <div className="card" style={{ 
                    background: 'linear-gradient(135deg, var(--primary) 0%, #409eff 100%)', 
                    padding: '32px', 
                    color: 'white',
                    border: 'none',
                    borderRadius: '24px',
                    marginBottom: '32px',
                    boxShadow: '0 20px 40px rgba(0, 113, 227, 0.15)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Decorative glow */}
                    <div style={{ position: 'absolute', top: '-50%', right: '-20%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(60px)' }} />
                    
                    <div className="row between wrap" style={{ gap: '32px', position: 'relative', zIndex: 1 }}>
                      <div style={{ flex: 1, minWidth: '240px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', opacity: 0.9 }}>Finanças do Evento</h3>
                        <p style={{ fontSize: '14px', opacity: 0.8, margin: 0 }}>
                          {Object.values(checkedItems).filter(Boolean).length} de {(stats?.drink_counts || []).filter(d => d.count > 0).length} itens comprados
                        </p>
                        <div style={{ marginTop: '24px' }}>
                          <div style={{ fontSize: '12px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Por Pessoa</div>
                          <div style={{ fontSize: '36px', fontWeight: 800 }}>
                            R$ {(calculateTotalFinance() / Math.max(1, stats?.total_registrations || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          {Number(stats?.event?.capacity || 0) > (stats?.total_registrations || 0) && (
                            <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '12px', background: 'rgba(255,255,255,0.15)', padding: '8px 16px', borderRadius: '980px', display: 'inline-block', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                              🎯 Se lotar ({Number(stats.event.capacity)} pessoas): 
                              <strong style={{ marginLeft: '6px' }}>
                                R$ {(calculateTotalFinance() / Number(stats.event.capacity)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </strong>
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '12px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Total Geral</div>
                        <div style={{ fontSize: '42px', fontWeight: 800, marginBottom: '24px' }}>
                          R$ {calculateTotalFinance().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <button 
                          onClick={shareBilling}
                          className="btn"
                          style={{ 
                            background: 'white', 
                            color: 'var(--primary)', 
                            fontSize: '14px', 
                            padding: '12px 24px',
                            fontWeight: 700,
                            borderRadius: '980px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginLeft: 'auto',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                          Cobrar Galera
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', marginBottom: '32px' }}>
                    <div className="card-content">
                      <div className="cols-2" style={{ gap: '24px', marginBottom: '32px' }}>
                        <div className="field">
                          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Airbnb/Casa (R$)</label>
                          <input 
                            type="number" 
                            value={houseValue || ''}
                            onChange={(e) => updateHouseValue(e.target.value)}
                            placeholder="Ex: 2000.00"
                          />
                        </div>

                        <div className="field">
                          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Outros Custos (R$)</label>
                          <input 
                            type="number" 
                            value={fixedCost || ''}
                            onChange={(e) => updateFixedCost(e.target.value)}
                            placeholder="Ex: 150.00"
                          />
                        </div>
                      </div>

                      <div className="row between" style={{ marginBottom: '24px', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Modo Supermercado</h3>
                        <button 
                          onClick={resetChecked}
                          className="link-btn"
                          style={{ fontSize: '13px' }}
                        >
                          Limpar checklist
                        </button>
                      </div>

                      <div className="stack" style={{ gap: '12px' }}>
                        {(stats?.drink_counts || [])
                          .filter(d => d.count > 0)
                          .sort((a, b) => (checkedItems[a.option_id] ? 1 : 0) - (checkedItems[b.option_id] ? 1 : 0))
                          .map((d) => (
                            <div 
                              key={d.option_id} 
                              onClick={() => toggleChecked(d.option_id)}
                              className={`card ${checkedItems[d.option_id] ? 'checked' : ''}`}
                              style={{ 
                                background: checkedItems[d.option_id] ? 'rgba(255,255,255,0.02)' : 'var(--glass-bg)',
                                border: '1px solid var(--glass-border)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                opacity: checkedItems[d.option_id] ? 0.5 : 1
                              }}
                            >
                              <div className="card-content" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                  <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    border: `2px solid ${checkedItems[d.option_id] ? 'var(--primary)' : 'var(--glass-border)'}`,
                                    background: checkedItems[d.option_id] ? 'var(--primary)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 0.2s ease'
                                  }}>
                                    {checkedItems[d.option_id] && (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    )}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '16px', textDecoration: checkedItems[d.option_id] ? 'line-through' : 'none', color: checkedItems[d.option_id] ? 'var(--text-muted)' : 'var(--text)' }}>
                                      {d.name}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                      Comprar: <strong style={{ color: checkedItems[d.option_id] ? 'var(--text-muted)' : 'var(--text)' }}>{calculateEstimate(d.name, d.count)}</strong>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="row" style={{ gap: '20px', alignItems: 'center' }}>
                                  {!checkedItems[d.option_id] && (
                                    <div onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700, letterSpacing: '0.02em' }}>Preço Unitário</div>
                                      <div className="field" style={{ marginBottom: 0 }}>
                                        <input 
                                          type="number"
                                          placeholder="0.00"
                                          value={prices[d.option_id] || ''}
                                          onChange={(e) => updatePrice(d.option_id, e.target.value)}
                                          style={{ 
                                            width: '90px', 
                                            padding: '6px 10px', 
                                            textAlign: 'right',
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            height: '32px'
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  <div style={{ minWidth: '80px', textAlign: 'right' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700, letterSpacing: '0.02em' }}>Subtotal</div>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: checkedItems[d.option_id] ? 'var(--text-muted)' : 'var(--primary)' }}>
                                      R$ {((calculateEstimateValue(d.name, d.count)) * (prices[d.option_id] || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="row stagger-4" style={{ marginTop: '40px', gap: '16px' }}>
                <Link className="btn" style={{ flex: 1, textAlign: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }} to="/admin">
                  Voltar para Eventos
                </Link>
                <a
                  className="btn ghost"
                  style={{ flex: 1, textAlign: 'center', border: '1px solid var(--glass-border)' }}
                  href={`/api/admin/events/${eventId}/registrations`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Exportar Dados (JSON)
                </a>
              </div>
            </main>
          </div>
        </>
      );
    }

