const user_bets = [
  {"id":1784652695284,"match":"Reto Escalera (Día 1): Aluminij vs Sheriff Tiraspol","market":"Sheriff Tiraspol o Empate","odd":1.21,"stake":5,"status":"won","date":"2026-07-16"},
  {"id":1784652695285,"match":"Reto Escalera (Día 2): Alianza Lima vs Sport Huancayo","market":"Alianza Lima o Empate","odd":1.03,"stake":6.05,"status":"won","date":"2026-07-20"},
  {"id":1784653437721,"match":"Bolivar - Guabira","market":"Hándicap 1 (0) Bolivar - Guabira","odd":1.03,"stake":6.05,"status":"won","date":"2026-07-21"},
  {"id":1784653506063,"match":"NK Aluminij - Sheriff Tiraspol","market":"2X NK Aluminij - Sheriff Tiraspol","odd":1.21,"stake":5,"status":"won","date":"2026-07-21"},
  {"id":1784653536600,"match":"Bolivar - Guabira","market":"Hándicap 1 (0) Bolivar - Guabira","odd":1.03,"stake":6.05,"status":"won","date":"2026-07-21"},
  {"id":1784653582991,"match":"Fluminense - Red Bull Bragantino","market":"1X Fluminense - Red Bull Bragantino","odd":1.235,"stake":5,"status":"won","date":"2026-07-21"},
  {"id":1784653582997,"match":"Reto Escalera (Día 3): Fluminense - Red Bull Bragantino","market":"1X Fluminense - Red Bull Bragantino","odd":1.235,"stake":5,"status":"won","date":"2026-07-21"},
  {"id":1784653635840,"match":"NJ-NY Gotham (F) - Seattle Reign (F)","market":"1X NJ-NY Gotham (F) - Seattle Reign (F)","odd":1.058,"stake":7.41,"status":"won","date":"2026-07-21"},
  {"id":1784653635847,"match":"Reto Escalera (Día 4): NJ-NY Gotham (F) - Seattle Reign (F)","market":"1X NJ-NY Gotham (F) - Seattle Reign (F)","odd":1.058,"stake":7.41,"status":"won","date":"2026-07-21"},
  {"id":1784653682511,"match":"Independiente del Valle - Emelec","market":"Hándicap 1 (0) Independiente del Valle - Emelec","odd":1.07,"stake":7.87,"status":"won","date":"2026-07-21"},
  {"id":1784653682520,"match":"Reto Escalera (Día 5): Independiente del Valle - Emelec","market":"Hándicap 1 (0) Independiente del Valle - Emelec","odd":1.07,"stake":7.87,"status":"won","date":"2026-07-21"},
  {"id":1784653946608,"match":"San Antonio Bulo Bulo - ABB","market":"1X San Antonio Bulo Bulo - ABB","odd":1.144,"stake":8.42,"status":"won","date":"2026-07-21"},
  {"id":1784653946616,"match":"Reto Escalera (Día 6): San Antonio Bulo Bulo - ABB","market":"1X San Antonio Bulo Bulo - ABB","odd":1.144,"stake":8.42,"status":"won","date":"2026-07-21"},
  {"id":1784654219950,"match":"Reto Escalera (Día 7): Ararat - Armenia - Shamrock Rovers","market":"Doble oportunidad: 1X","odd":1.336,"stake":9.6,"status":"won","date":"2026-07-21"},
  {"id":1784654438054,"match":"Fenerbahce vs Gornik Zabrze + Clyde - Annan Athletic","market":"Resultado Final (1X2): Fenerbahce / Más/Menos 2.5 Goles: Más de 2.5 Goles","odd":1.692,"stake":5,"status":"won","date":"2026-07-21"},
  {"id":1784654458974,"match":"FC Thun vs Dinamo Zagreb + Kilmarnock vs Hamilton Academical + Raith Rovers vs Peterhead + Atlético-MG vs Bahia + Ararat-Armenia vs Shamrock Rovers + Dunfermline Athletic vs Cove Rangers + Partick Thistle vs Stenhousemuir","market":"Doble Oportunidad: Dinamo Zagreb o Empate / Resultado Final (1X2): Kilmarnock / Resultado Final (1X2): Raith Rovers / Doble Oportunidad: Atlético-MG o Empate / Doble Oportunidad: Ararat-Armenia o Empate / Resultado Final (1X2): Dunfermline Athletic / Resultado Final (1X2): Partick Thistle","odd":4.47,"stake":1,"status":"won","date":"2026-07-21"},
  {"id":1784654494254,"match":"Comerciantes Unidos - Alianza Lima","market":"Doble oportunidad: 2X","odd":1.2,"stake":8.42,"status":"won","date":"2026-07-21"},
  {"id":1784671071043,"match":"Toluca vs Pumas UNAM + Universidad Católica (Quito) vs Barcelona SC","market":"Handicap 1(0): Toluca o Empate / Handicap 1(0): Universidad Católica (Quito) o Empate","odd":1.64,"stake":5,"status":"lost","date":"2026-07-21"},
  {"id":1784730485910,"match":"San Jose Earthquakes vs Orlando City SC + Flora vs Mgarr United","market":"Doble Oportunidad: San Jose Earthquakes o Empate / Más/Menos 2.5 Goles: Más de 2.5 Goles","odd":1.88,"stake":5,"status":"lost","date":"2026-07-22"},
  {"id":1784750417376,"match":"Reto Escalera (Día 8): Vardar - Riga FC","market":"2x Riga FC","odd":1.311,"stake":12.8256,"status":"won","date":"2026-07-22"},
  {"id":1784750452591,"match":"Inter Miami CF vs Chicago Fire FC + Zeleznicar Pancevo vs Braga + FC Cincinnati vs Vancouver Whitecaps + Portland Hearts of Pine vs Union Omaha","market":"Más/Menos 2.5 Goles: Más de 2.5 Goles / Resultado Final (1X2): Braga / Doble Oportunidad: Vancouver Whitecaps o Empate / Más/Menos 2.5 Goles: Más de 2.5 Goles","odd":4.22,"stake":1,"status":"lost","date":"2026-07-22"},
  {"id":1784815936179,"match":"FC Lugano vs Dukagjini + Hajduk Split vs Pafos","market":"Resultado Final (1X2): FC Lugano / Córners (Saques de Esquina): Más de 7.5 Córners","odd":1.61,"stake":5,"status":"won","date":"2026-07-23"},
  {"id":1784816900060,"match":"Reto Escalera (Día 9): Hajduk Split vs Pafos","market":"Hajduk Split o Empate","odd":1.28,"stake":16.814361599999998,"status":"won","date":"2026-07-23"},
  {"id":1784817057612,"match":"FK Liepaja vs Austria Vienna + Independiente Santa Fe vs Caracas FC + Defensa y Justicia vs Aldosivi","market":"Córners (Saques de Esquina): Más de 8.5 Córners / Córners (Saques de Esquina): Más de 8.5 Córners / Córners (Saques de Esquina): Más de 8.5 Córners","odd":3.09,"stake":1,"status":"lost","date":"2026-07-23"},
  {"id":1784831699974,"match":"Montreal Roses FC vs AFC Toronto","market":"Más de 2.5 goles","odd":1.78,"stake":5,"status":"lost","date":"2026-07-23"},
  {"id":1784834257928,"match":"St. Gallen - Benfica","market":"Más de 3","odd":1.575,"stake":5,"status":"voided","date":"2026-07-23"},
  {"id":1784904599257,"match":"2 de Mayo vs Rubio Ñú","market":"Córners (Total del Partido): Más de 8 Córners","odd":1.736,"stake":5,"status":"lost","date":"2026-07-24"},
  {"id":1784904690361,"match":"Alianza Atlético vs Los Chankas","market":"Ambos Equipos Anotan: Sí","odd":1.84,"stake":2.5,"status":"won","date":"2026-07-24"},
  {"id":1784909180329,"match":"Mineros de Zacatecas vs Correcaminos UAT + Västerås SK vs Örgryte IS + Vélez Sarsfield vs Instituto (Córdoba)","market":"Córners (Total del Partido): Más de 8.5 Córners / Córners (Total del Partido): Más de 7.5 Córners / Córners (Total del Partido): Más de 8.5 Córners","odd":3.839,"stake":1,"status":"lost","date":"2026-07-24"},
  {"id":1784909680914,"match":"Deportivo Cali vs Jaguares de Córdoba","market":"Córners (Total del Partido): Más de 8.5 Córners","odd":1.554,"stake":5,"status":"won","date":"2026-07-24"},
  {"id":1784922007019,"match":"Reto Escalera (Día 10): Portland Thorns FC vs Gotham FC","market":"Más de 2.5 Goles","odd":1.35,"stake":21.52,"status":"won","date":"2026-07-24"},
  {"id":1784984049803,"match":"Santos Laguna U21 vs Atlas FC U21","market":"Ambos Equipos Anotan: Sí","odd":1.49,"stake":4.65,"status":"lost","date":"2026-07-25"},
  {"id":1784995107601,"match":"CA Lanús vs San Lorenzo","market":"Total de Goles (Asian 2.0): Más de 2 Goles (Asian 2.0 — Empate a 2 devuelve apuesta)","odd":2.27,"stake":4.65,"status":"lost","date":"2026-07-25"},
  {"id":1784995170454,"match":"Estudiantes de Río Cuarto vs Tigre","market":"Total de Goles (Asian 2.0): Más de 2 Goles (Asian 2.0 — Empate a 2 devuelve apuesta)","odd":2.27,"stake":4.65,"status":"lost","date":"2026-07-25"},
  {"id":1784995237755,"match":"Recoleta FC vs Sportivo San Lorenzo","market":"Más de 8 corners","odd":1.508,"stake":5,"status":"won","date":"2026-07-25"},
  {"id":1785080406789,"match":"Orense SC vs Independiente del Valle + CD Fuerte San Francisco U20 vs C.D. Platense Zacatecoluca U20","market":"Handicap 2(0): Independiente del Valle / Handicap 2(+1) : C.D. Platense Zacatecoluca U20 o Empate","odd":1.624,"stake":5,"status":"lost","date":"2026-07-26"},
  {"id":1785080497192,"match":"Aucas vs Macará + Londrina vs Grêmio Novorizontino","market":"Doble Oportunidad: Aucas o Empate / Doble Oportunidad: Grêmio Novorizontino o Empate","odd":1.525,"stake":5,"status":"lost","date":"2026-07-26"},
  {"id":1785090602918,"match":"Remo vs Vitória + Cruzeiro vs Botafogo","market":"Doble Oportunidad: Remo o Empate / Doble Oportunidad: Cruzeiro o Empate","odd":1.66,"stake":5,"status":"lost","date":"2026-07-26"},
  {"id":1785159585278,"match":"LDU vs Barcelona","market":"Menos 10.5 corners","odd":1.8,"stake":5,"status":"lost","date":"2026-07-27"},
  {"id":1785276517855,"match":"San Francisco Giants - Milwaukee Brewers","market":"Gana Milwaukee Brewers","odd":1.713,"stake":5,"status":"won","date":"2026-07-28"},
  {"id":1785338519798,"match":"Reto Escalera (Día 11): FC København vs Polissya Zhytomyr","market":"FC København o Empate","odd":1.205,"stake":29.05,"status":"won","date":"2026-07-29"},
  {"id":1785355908627,"match":"Zane Stevens vs Moerani Bouzige","market":"Juegos del Jugador (Individual): Zane Stevens Más de 9.5 Juegos","odd":1.93,"stake":3,"status":"won","date":"2026-07-29"},
  {"id":1785337966792,"match":"FK Kauno Žalgiris vs Klaksvíkar Ítróttarfelag + Mirassol vs Remo","market":"Doble Oportunidad: FK Kauno Žalgiris o Empate / Córners del Equipo (Individual): Mirassol Más de 4.5 Córners","odd":1.503,"stake":4,"status":"won","date":"2026-07-29"},
  {"id":1785338354949,"match":"Górnik Zabrze vs Fenerbahçe + Arsenal de Sarandí Reserve vs Villa Dalmine Reserve","market":"Córners del Equipo (Individual): Fenerbahçe Más de 4.5 Córners / Córners del Equipo (Individual): Arsenal de Sarandí Reserve Más de 4.5 Córners","odd":1.786,"stake":4,"status":"won","date":"2026-07-29"},
  {"id":1785377483063,"match":"Reto Escalera (Día 12): Vitoria vs Palmeiras","market":"Palmeiras +0.5","odd":1.115,"stake":35.005250000000004,"status":"won","date":"2026-07-30"},
  {"id":1785469497431,"match":"FC Nordsjælland vs GAIS + Sportivo Barracas Reserves vs Leandro Nicéforo Alem Reserve","market":"Doble Oportunidad: FC Nordsjælland o Empate / Córners del Equipo (Individual): Sportivo Barracas Reserves Más de 4.5 Córners","odd":1.62,"stake":4,"status":"lost","date":"2026-07-31"},
  {"id":1785469514933,"match":"Sportivo Barracas Reserves vs Leandro Nicéforo Alem Reserve + CSD Flandria Reserve vs Sportivo Italiano Reserve","market":"Córners del Equipo (Individual): Sportivo Barracas Reserves Más de 4.5 Córners / Córners del Equipo (Individual): CSD Flandria Reserve Más de 4.5 Córners","odd":2.04,"stake":4,"status":"lost","date":"2026-07-31"},
  {"id":1785469532618,"match":"Atlètic Club Escaldes vs FC Vaduz + CSD Flandria Reserve vs Sportivo Italiano Reserve","market":"Córners del Equipo (Individual): FC Vaduz Más de 4.5 Córners / Córners del Equipo (Individual): CSD Flandria Reserve Más de 4.5 Córners","odd":1.89,"stake":4,"status":"lost","date":"2026-07-31"},
  {"id":1785469576094,"match":"Reto Escalera (Día 13): Dynamo City vs Lenz","market":"Doble Oprtunidad 1X","odd":1.188,"stake":39.030853750000006,"status":"won","date":"2026-07-31"}
];

const escalera_history = [
  {"date":"2026-07-16","maxDay":1,"finalCapital":5,"result":"Perdido"},
  {"date":"2026-07-30","maxDay":12,"finalCapital":44.04,"result":"Ganado"},
  {"date":"2026-07-30","maxDay":12,"finalCapital":35.005250000000004,"result":"Ganado"},
  {"date":"2026-07-30","maxDay":12,"finalCapital":39.03,"result":"Ganado"}
];

const payload = {
  ub: user_bets,
  user_bets: JSON.stringify(user_bets),
  sb: '51.521142897',
  starting_bankroll: '51.521142897',
  eh: escalera_history,
  escalera_history: JSON.stringify(escalera_history),
  ts: 9999999999999, // Far future timestamp so every device considers it authoritative
  sync_ts: 9999999999999
};

fetch('https://sportintel.vercel.app/api/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => console.log('SUCCESSFULLY SEEDED USER DATA TO VERCEL KV:', data))
.catch(err => console.error('ERROR SEEDING:', err));
