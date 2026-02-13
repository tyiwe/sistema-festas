import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiGet } from "../../api";

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
      <header className="topbar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Link className="brand" to="/admin">Painel</Link>
          <nav className="nav" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Link to="/admin" style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.8 }}>Eventos</Link>
            <Link to={`/admin/events/${eventId}/options`} style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.8 }}>Bebidas</Link>
          </nav>
        </div>
      </header>

      <div className="container">
        <main className="stack">
          <section style={{ textAlign: 'center', paddingTop: '16px' }}>
            <h1 style={{ fontSize: '40px' }}>Gerenciamento do Evento</h1>
            <p className="muted" style={{ marginTop: '4px' }}>Acompanhe as inscrições e preferências dos seus convidados.</p>
          </section>

          {error && (
            <div style={{
              padding: '14px 20px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 59, 48, 0.06)',
              border: '1px solid rgba(255, 59, 48, 0.15)',
              color: '#ff3b30',
              fontSize: '15px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="segmented" style={{ marginBottom: '24px' }}>
            <button
              className={`segItem ${activeTab === "stats" ? "active" : ""}`}
              onClick={() => setActiveTab("stats")}
            >
              Estatísticas
            </button>
            <button
              className={`segItem ${activeTab === "registrations" ? "active" : ""}`}
              onClick={() => setActiveTab("registrations")}
            >
              Inscritos ({registrations.length})
            </button>
            <button
              className={`segItem ${activeTab === "shopping" ? "active" : ""}`}
              onClick={() => setActiveTab("shopping")}
            >
              Lista & Financeiro
            </button>
          </div>

          {!stats || (registrations.length === 0 && activeTab === "registrations") ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid var(--border)',
                borderTopColor: 'var(--primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px'
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p className="muted">Carregando dados...</p>
            </div>
          ) : (
            <div className="stack tight" style={{ padding: 0 }}>
              {/* STATS TAB */}
              {activeTab === "stats" && stats && (
                <>
                  {/* Stat Cards */}
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="stat-card">
                      <div className="stat-label">Total de Inscritos</div>
                      <div className="stat-value">{stats?.total_registrations ?? 0}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Opções Ativas</div>
                      <div className="stat-value">{(stats?.drink_counts || []).filter(d => d.is_available).length}</div>
                    </div>
                  </div>

                  {/* Drink Preferences Chart */}
                  <div className="form-card" style={{ maxWidth: '100%', marginTop: '12px' }}>
                    <h3 style={{ marginBottom: '28px' }}>Preferências de Consumo</h3>

                    <div className="stack tight" style={{ padding: 0, gap: '20px' }}>
                      {(stats?.drink_counts || []).length === 0 ? (
                        <div className="empty-state" style={{ padding: '40px' }}>
                          <p className="muted">Nenhum dado de preferência disponível ainda.</p>
                        </div>
                      ) : (
                        (stats?.drink_counts || []).map((d) => (
                          <div key={d.option_id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="row between">
                              <div className="row" style={{ gap: '8px' }}>
                                <span style={{ fontWeight: 500, fontSize: '15px' }}>{d.name}</span>
                                {!d.is_available && (
                                  <span className="status-badge draft" style={{ fontSize: '10px' }}>Inativo</span>
                                )}
                              </div>
                              <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--primary)' }}>{d.count}</span>
                            </div>
                            <div className="progress-bar-bg">
                              <div
                                className="progress-bar-fill"
                                style={{ width: `${(d.count / max) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
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
                                backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.01)',
                                transition: 'background-color 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--bg-alt)';
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLTableRowElement).style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.01)';
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
                                          background: 'rgba(0, 113, 227, 0.1)',
                                          color: 'var(--primary)',
                                          fontSize: '12px',
                                          fontWeight: 500
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
                  <div className="form-card" style={{ maxWidth: '100%', marginTop: '0', background: 'var(--primary)', color: 'white', border: 'none' }}>
                    <div className="row between" style={{ alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ marginBottom: '4px', color: 'white' }}>Resumo do Rolê</h3>
                        <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
                          {Object.values(checkedItems).filter(Boolean).length} de {(stats?.drink_counts || []).filter(d => d.count > 0).length} itens comprados
                        </p>
                        <div style={{ marginTop: '16px' }}>
                          <div style={{ fontSize: '11px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Por Pessoa</div>
                          <div style={{ fontSize: '24px', fontWeight: 800 }}>
                            R$ {(calculateTotalFinance() / Math.max(1, stats?.total_registrations || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          {Number(stats?.event?.capacity || 0) > (stats?.total_registrations || 0) && (
                            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                              Se lotar ({Number(stats.event.capacity)} pessoas): 
                              <strong style={{ marginLeft: '4px' }}>
                                R$ {(calculateTotalFinance() / Number(stats.event.capacity)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </strong>
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '11px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Geral</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>
                          R$ {calculateTotalFinance().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <button 
                          onClick={shareBilling}
                          className="btn"
                          style={{ 
                            background: 'white', 
                            color: 'var(--primary)', 
                            fontSize: '12px', 
                            padding: '8px 12px',
                            fontWeight: 700,
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginLeft: 'auto'
                          }}
                        >
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
                                background: checkedItems[d.option_id] ? 'var(--bg-alt)' : 'white',
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
                                  border: `2px solid ${checkedItems[d.option_id] ? 'var(--primary)' : '#ccc'}`,
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
            </div>
          )}
        </main>
      </div>
    </>
  );
}
