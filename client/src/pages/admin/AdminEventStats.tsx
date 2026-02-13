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

    let text = `*💰 Acerto do Rolê*\n\n` +
      `Fala galera! Fizemos as contas aqui do evento:\n\n`;

    if (houseValue > 0) text += `🏠 *Airbnb/Casa:* R$ ${houseValue.toFixed(2)}\n`;
    if (fixedCost > 0) text += `⚙️ *Outros Custos:* R$ ${fixedCost.toFixed(2)}\n`;
    text += `🍻 *Bebidas:* R$ ${drinksTotal.toFixed(2)}\n`;
    text += `--------------------------\n`;
    text += `💵 *Total Geral:* R$ ${total.toFixed(2)}\n`;
    text += `👥 *Por pessoa (${currentPeople} atuais):* R$ ${perPerson.toFixed(2)}\n`;

    if (perPersonIfFull && totalCapacity > currentPeople) {
      text += `🎯 *Se lotar (${totalCapacity} pessoas):* R$ ${perPersonIfFull.toFixed(2)}\n`;
      text += `_(Economia de R$ ${(perPerson - perPersonIfFull).toFixed(2)} p/ pessoa!)_\n`;
    }

    text += `\n_Pode mandar o Pix aqui pra agilizar!_`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const max = useMemo(() => {
    return Math.max(1, ...(stats?.drink_counts ?? []).map((d) => d.count));
  }, [stats]);

  return (
    <>
      <Header />
      <div className="container" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
        <main className="stack">
          <section className="stack tight" style={{ marginBottom: '24px' }}>
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div>
                <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', textAlign: 'left', margin: 0 }}>
                  Estatísticas do <span className="gradient-text">Evento</span>
                </h1>
                <h2 style={{ fontSize: '20px', fontWeight: 500, opacity: 0.8, marginTop: '4px' }}>
                  {stats?.event?.title}
                </h2>
              </div>
              <div className="row" style={{ gap: '12px' }}>
                <Link to={`/admin/edit/${eventId}`} className="btn secondary small">Editar Evento</Link>
                <Link to="/admin" className="btn secondary small">Voltar</Link>
              </div>
            </div>
          </section>

          <div className="form-card" style={{ padding: '6px', background: 'var(--bg-alt)', borderRadius: 'var(--radius-sm)', marginBottom: '32px' }}>
            <div className="row" style={{ gap: '4px' }}>
              <button 
                onClick={() => setActiveTab("stats")} 
                className={`btn ${activeTab === "stats" ? "primary" : "ghost"}`}
                style={{ flex: 1, borderRadius: '10px', padding: '10px', fontSize: '14px' }}
              >
                Bebidas
              </button>
              <button 
                onClick={() => setActiveTab("registrations")} 
                className={`btn ${activeTab === "registrations" ? "primary" : "ghost"}`}
                style={{ flex: 1, borderRadius: '10px', padding: '10px', fontSize: '14px' }}
              >
                Convidados
              </button>
              <button 
                onClick={() => setActiveTab("shopping")} 
                className={`btn ${activeTab === "shopping" ? "primary" : "ghost"}`}
                style={{ flex: 1, borderRadius: '10px', padding: '10px', fontSize: '14px' }}
              >
                Compras
              </button>
            </div>
          </div>

          {activeTab === "stats" && stats && (
            <section className="stack tight">
              <div className="row between">
                <h2 style={{ fontSize: '24px', fontWeight: 600 }}>Preferências</h2>
                <button className="btn primary-glow" onClick={shareBilling}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                  Compartilhar
                </button>
              </div>
              
              <div className="admin-event-row" style={{ background: 'var(--bg-alt)', border: 'none' }}>
                <div className="row wrap" style={{ gap: '24px' }}>
                  <div className="field" style={{ flex: 1, minWidth: '150px' }}>
                    <label>Airbnb/Casa (R$)</label>
                    <input type="number" value={houseValue} onChange={(e) => updateHouseValue(e.target.value)} />
                  </div>
                  <div className="field" style={{ flex: 1, minWidth: '150px' }}>
                    <label>Outros Custos (R$)</label>
                    <input type="number" value={fixedCost} onChange={(e) => updateFixedCost(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="stack tight">
                {stats?.drink_counts.map((d) => (
                  <div key={d.option_id} className="admin-event-row">
                    <div className="row between">
                      <div style={{ flex: 1 }}>
                        <div className="row" style={{ gap: '8px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 600 }}>{d.name}</span>
                          <span className="muted small">{d.count} votos</span>
                        </div>
                        <div style={{ marginTop: '8px', background: 'var(--bg-alt)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ background: 'var(--primary)', height: '100%', width: `${(d.count / max) * 100}%`, borderRadius: '3px' }} />
                        </div>
                        <div className="muted small" style={{ marginTop: '8px' }}>
                          Estimativa: <strong>{calculateEstimate(d.name, d.count)}</strong>
                        </div>
                      </div>
                      <div className="field" style={{ width: '120px', marginLeft: '32px' }}>
                        <label>Preço/Unid</label>
                        <input 
                          type="number" 
                          placeholder="R$ 0,00" 
                          value={prices[d.option_id] || ""} 
                          onChange={(e) => updatePrice(d.option_id, e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

              {/* REGISTRATIONS TAB */}
              {activeTab === "registrations" && (
                <div className="form-card" style={{ maxWidth: '100%', marginTop: '0' }}>
                  <h3 style={{ marginBottom: '28px' }}>Lista de Inscritos</h3>

                  {registrations.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px' }}>
                      <p className="muted">Nenhum inscrito ainda.</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '14px'
                      }}>
                        <thead>
                          <tr style={{
                            borderBottom: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-alt)'
                          }}>
                            <th style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>Nome</th>
                            <th style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>E-mail</th>
                            <th style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>Telefone</th>
                            <th style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>Bebidas</th>
                            <th style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>Alergias</th>
                            <th style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.map((reg, idx) => (
                            <tr
                              key={reg.id}
                              style={{
                                borderBottom: '1px solid var(--border)',
                                backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-alt)',
                                transition: 'background-color 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--secondary)';
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLTableRowElement).style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'var(--bg-alt)';
                              }}
                            >
                              <td style={{ padding: '16px', fontWeight: 500 }}>{reg.full_name}</td>
                              <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                                <a href={`mailto:${reg.email}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                  {reg.email}
                                </a>
                              </td>
                              <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                                <a href={`tel:${reg.phone}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                  {reg.phone}
                                </a>
                              </td>
                              <td style={{ padding: '16px' }}>
                                {reg.selections.length === 0 ? (
                                  <span className="status-badge draft">Nenhuma</span>
                                ) : (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {reg.selections.map((sel) => (
                                      <span
                                        key={sel.option_id}
                                        style={{
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          background: 'var(--secondary)',
                                          color: 'var(--primary)',
                                          fontSize: '12px',
                                          fontWeight: 600
                                        }}
                                      >
                                        {sel.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                {reg.allergies ? (
                                  <span title={reg.allergies} style={{ cursor: 'help' }}>
                                    {reg.allergies.length > 20 ? reg.allergies.substring(0, 20) + '...' : reg.allergies}
                                  </span>
                                ) : (
                                  <span style={{ opacity: 0.5 }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                {new Date(reg.created_at).toLocaleDateString('pt-BR')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SHOPPING & FINANCE TAB */}
              {activeTab === "shopping" && stats && (
                <div className="stack tight" style={{ padding: 0 }}>
                  {/* UNIFIED HEADER WITH TOTAL COST */}
                  <div className="card" style={{ 
                    background: 'linear-gradient(135deg, #0071e3 0%, #409eff 100%)', 
                    padding: '32px', 
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    marginBottom: '32px',
                    boxShadow: '0 20px 40px rgba(0, 113, 227, 0.3)'
                  }}>
                    <div className="row between wrap" style={{ gap: '24px' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', opacity: 0.9 }}>Finanças do Evento</h3>
                        <p style={{ fontSize: '14px', opacity: 0.8, margin: 0 }}>
                          {Object.values(checkedItems).filter(Boolean).length} de {(stats?.drink_counts || []).filter(d => d.count > 0).length} itens comprados
                        </p>
                        <div style={{ marginTop: '24px' }}>
                          <div style={{ fontSize: '12px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Por Pessoa</div>
                          <div style={{ fontSize: '32px', fontWeight: 800 }}>
                            R$ {(calculateTotalFinance() / Math.max(1, stats?.total_registrations || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          {Number(stats?.event?.capacity || 0) > (stats?.total_registrations || 0) && (
                            <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '8px', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '6px', display: 'inline-block' }}>
                              Se lotar ({Number(stats.event.capacity)} pessoas): 
                              <strong style={{ marginLeft: '4px' }}>
                                R$ {(calculateTotalFinance() / Number(stats.event.capacity)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </strong>
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '12px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Total Geral</div>
                        <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '24px' }}>
                          R$ {calculateTotalFinance().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <button 
                          onClick={shareBilling}
                          className="btn"
                          style={{ 
                            background: 'rgba(255, 255, 255, 0.2)', 
                            color: '#ffffff', 
                            fontSize: '14px', 
                            padding: '10px 20px',
                            fontWeight: 700,
                            borderRadius: '980px',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginLeft: 'auto',
                            backdropFilter: 'blur(10px)'
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                          Cobrar Galera
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="form-card" style={{ maxWidth: '100%', marginTop: '0' }}>
                    <div className="stack tight" style={{ padding: 0 }}>
                      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ 
                          padding: '16px', 
                          background: 'var(--bg-alt)', 
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)'
                        }}>
                          <div className="row between" style={{ marginBottom: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '14px' }}>🏠 Airbnb/Casa</span>
                            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>R$ {houseValue.toFixed(2)}</span>
                          </div>
                          <input 
                            type="number" 
                            value={houseValue || ''}
                            onChange={(e) => updateHouseValue(e.target.value)}
                            placeholder="Ex: 2000.00"
                            style={{ 
                              width: '100%',
                              padding: '8px 12px', 
                              borderRadius: '6px', 
                              border: '1px solid var(--border)',
                              fontSize: '14px'
                            }}
                          />
                        </div>

                        <div style={{ 
                          padding: '16px', 
                          background: 'var(--bg-alt)', 
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)'
                        }}>
                          <div className="row between" style={{ marginBottom: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '14px' }}>⚙️ Outros Custos</span>
                            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>R$ {fixedCost.toFixed(2)}</span>
                          </div>
                          <input 
                            type="number" 
                            value={fixedCost || ''}
                            onChange={(e) => updateFixedCost(e.target.value)}
                            placeholder="Ex: 150.00"
                            style={{ 
                              width: '100%',
                              padding: '8px 12px', 
                              borderRadius: '6px', 
                              border: '1px solid var(--border)',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                      </div>

                      <div className="row between" style={{ marginBottom: '20px', alignItems: 'center' }}>
                        <h3 style={{ margin: 0 }}>Modo Supermercado</h3>
                        <button 
                          onClick={resetChecked}
                          style={{ fontSize: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          Limpar checklist
                        </button>
                      </div>

                      <div className="stack tight" style={{ padding: 0 }}>
                        {(stats?.drink_counts || [])
                          .filter(d => d.count > 0)
                          .sort((a, b) => (checkedItems[a.option_id] ? 1 : 0) - (checkedItems[b.option_id] ? 1 : 0))
                          .map((d) => (
                            <div 
                              key={d.option_id} 
                              className={`row between ${checkedItems[d.option_id] ? 'checked' : ''}`}
                              onClick={() => toggleChecked(d.option_id)}
                              style={{ 
                                padding: '16px', 
                                background: checkedItems[d.option_id] ? 'var(--bg-alt)' : 'var(--card-bg)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                opacity: checkedItems[d.option_id] ? 0.6 : 1,
                                gap: '12px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  border: `2px solid ${checkedItems[d.option_id] ? 'var(--primary)' : 'var(--border)'}`,
                                  background: checkedItems[d.option_id] ? 'var(--primary)' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  {checkedItems[d.option_id] && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '16px', textDecoration: checkedItems[d.option_id] ? 'line-through' : 'none' }}>
                                    {d.name}
                                  </div>
                                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                                    Comprar: <strong style={{ color: 'var(--text)' }}>{calculateEstimate(d.name, d.count)}</strong>
                                  </div>
                                </div>
                              </div>
                              
                              {!checkedItems[d.option_id] && (
                                <div onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right', minWidth: '100px' }}>
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Preço p/ L ou KG</div>
                                  <input 
                                    type="number"
                                    placeholder="0.00"
                                    value={prices[d.option_id] || ''}
                                    onChange={(e) => updatePrice(d.option_id, e.target.value)}
                                    style={{ 
                                      width: '80px', 
                                      padding: '6px', 
                                      borderRadius: '4px', 
                                      border: '1px solid var(--border)',
                                      textAlign: 'right',
                                      fontSize: '14px',
                                      fontWeight: 600
                                    }}
                                  />
                                  <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '4px', color: 'var(--primary)' }}>
                                    R$ {((calculateEstimateValue(d.name, d.count)) * (prices[d.option_id] || 0)).toFixed(2)}
                                  </div>
                                </div>
                              )}
                              {checkedItems[d.option_id] && (
                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)' }}>
                                  R$ {((calculateEstimateValue(d.name, d.count)) * (prices[d.option_id] || 0)).toFixed(2)}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="row" style={{ marginTop: '20px', gap: '12px' }}>
                <Link className="btn secondary" style={{ flex: 1, textAlign: 'center' }} to="/admin">
                  Voltar para Eventos
                </Link>
                <a
                  className="btn ghost"
                  style={{ flex: 1, textAlign: 'center' }}
                  href={`/api/admin/events/${eventId}/registrations`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Exportar Dados (JSON)
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: '6px' }}>
                    <path d="M4 2H10V8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
            </main>
          </div>
        </>
      );
    }
