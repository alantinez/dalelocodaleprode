// Auto-load World Cup Results from openfootball
// Runs every 20 minutes via GitHub Actions

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENFOOTBALL_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

// Mapeo: nombre openfootball (inglés) → código de equipo
const NAME_TO_CODE = {
  'Mexico':                    'MEX',
  'South Africa':              'RSA',
  'South Korea':               'KOR',
  'Czech Republic':            'CZE',
  'Czechia':                   'CZE',
  'Bosnia and Herzegovina':    'BIH',
  'Bosnia-Herzegovina':        'BIH',
  'Canada':                    'CAN',
  'Qatar':                     'QAT',
  'Switzerland':               'SUI',
  'Brazil':                    'BRA',
  'Scotland':                  'SCO',
  'Haiti':                     'HAI',
  'Morocco':                   'MAR',
  'Australia':                 'AUS',
  'United States':             'USA',
  'USA':                       'USA',
  'Paraguay':                  'PAR',
  'Turkey':                    'TUR',
  'Türkiye':                   'TUR',
  'Germany':                   'GER',
  'Ivory Coast':               'CIV',
  "Côte d'Ivoire":             'CIV',
  'Curaçao':                   'CUW',
  'Ecuador':                   'ECU',
  'Japan':                     'JPN',
  'Netherlands':               'NED',
  'Sweden':                    'SWE',
  'Tunisia':                   'TUN',
  'Belgium':                   'BEL',
  'Egypt':                     'EGY',
  'Iran':                      'IRN',
  'New Zealand':               'NZL',
  'Saudi Arabia':              'KSA',
  'Cape Verde':                'CPV',
  'Spain':                     'ESP',
  'Uruguay':                   'URU',
  'France':                    'FRA',
  'Iraq':                      'IRQ',
  'Norway':                    'NOR',
  'Senegal':                   'SEN',
  'Algeria':                   'ALG',
  'Argentina':                 'ARG',
  'Austria':                   'AUT',
  'Jordan':                    'JOR',
  'Colombia':                  'COL',
  'Portugal':                  'POR',
  'Congo DR':                  'COD',
  'DR Congo':                  'COD',
  'Uzbekistan':                'UZB',
  'Croatia':                   'CRO',
  'Ghana':                     'GHA',
  'England':                   'ENG',
  'Panama':                    'PAN',
};

async function supabaseRpc(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

async function main() {
  console.log('🌍 Fetching openfootball data...');
  const res = await fetch(OPENFOOTBALL_URL);
  if (!res.ok) { console.error('Failed to fetch openfootball:', res.status); process.exit(1); }
  
  const data = await res.json();
  const matches = data.matches ?? [];
  
  const finished = matches.filter(m => m.score?.ft);
  console.log(`✅ ${finished.length} finished matches found`);

  let saved = 0, skipped = 0, errors = 0;

  for (const m of finished) {
    const homeCode = NAME_TO_CODE[m.team1];
    const awayCode = NAME_TO_CODE[m.team2];

    if (!homeCode || !awayCode) {
      console.warn(`⚠️  Unknown team: "${m.team1}" or "${m.team2}"`);
      continue;
    }

    const [homeScore, awayScore] = m.score.ft;
    const result = await supabaseRpc('auto_save_result_service', {
      p_home_code: homeCode,
      p_away_code: awayCode,
      p_home_score: homeScore,
      p_away_score: awayScore,
    });

    if (!result.ok) {
      console.error(`❌ Error ${homeCode} vs ${awayCode}:`, result.body);
      errors++;
    } else if (result.body.includes('ALREADY_SAVED') || result.body.includes('NOT_FOUND')) {
      skipped++;
    } else {
      console.log(`⚽ Saved: ${m.team1} ${homeScore}-${awayScore} ${m.team2}`);
      saved++;
    }
  }

  console.log(`\n📊 Done — saved: ${saved}, skipped: ${skipped}, errors: ${errors}`);
  
  // Si hubo guardados nuevos, recalcular logros
  if (saved > 0) {
    await supabaseRpc('unlock_achievements_all', {});
    console.log('🏅 Logros recalculados');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
