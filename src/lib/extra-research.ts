export interface MapPlace {
  name: string;
  kind: "attraction" | "historic" | "town";
  tag: string;
  distanceKm: number;
}

export interface LocalSpecies {
  name: string;
  group: "plant" | "animal";
}

export interface LocalEvent {
  title: string;
}

export interface AreaResearch {
  locality: string;
  places: MapPlace[];
  species: LocalSpecies[];
  events: LocalEvent[];
  towns: string[];
}

export interface ResearchedChoice {
  title: string;
  subject: string;
  parentGuide: string;
}

const USER_AGENT = "EduDomLessonPlan/1.0 (family lesson planner)";

const OUTDOOR_GAMES: {
  minAge: number;
  maxAge: number;
  title: (place: string) => string;
  guide: (place: string) => string;
}[] = [
  {
    minAge: 5,
    maxAge: 12,
    title: (place) => `Podchody przy: ${place}`,
    guide: (place) =>
      `Przy ${place} ułóżcie pięć prostych tropów (kolor, kształt, dźwięk). Dziecko idzie pierwsze tylko tam, gdzie rodzic widzi drogę.`,
  },
  {
    minAge: 5,
    maxAge: 10,
    title: (place) => `Pięć kształtów w: ${place}`,
    guide: (place) => `W ${place} znajdźcie pięć różnych kształtów. Dziecko mówi, który jest największy.`,
  },
  {
    minAge: 7,
    maxAge: 14,
    title: (place) => `Mapa skarbu: ${place}`,
    guide: (place) =>
      `Narysujcie prostą mapę dojścia do ${place} i schowajcie jedną wskazówkę po drodze. Skarbem jest coś, co już tam jest.`,
  },
  {
    minAge: 5,
    maxAge: 12,
    title: (place) => `Trzy dźwięki przy: ${place}`,
    guide: (place) =>
      `Przy ${place} zatrzymajcie się i nazwijcie trzy dźwięki. Potem dziecko pokazuje, skąd każdy pochodzi.`,
  },
  {
    minAge: 8,
    maxAge: 15,
    title: (place) => `Pięć pytań o: ${place}`,
    guide: (place) =>
      `Przy ${place} dziecko układa pięć pytań, na które da się odpowiedzieć patrząc, nie zgadując. Rodzic odpowiada tylko na to, co widać.`,
  },
];

export function approxAgeFromGrade(schoolGrade: string | null | undefined): number | null {
  const match = /(\d{1,2})/.exec(schoolGrade ?? "");
  if (!match) return null;
  const grade = Number(match[1]);
  if (grade < 1 || grade > 12) return null;
  return grade + 6;
}

export function placesFromOverpass(
  payload: unknown,
  origin: { lat: number; lon: number }
): { places: MapPlace[]; towns: string[] } {
  const elements = asRecord(payload)?.elements;
  if (!Array.isArray(elements)) return { places: [], towns: [] };
  const places: MapPlace[] = [];
  const towns: string[] = [];
  for (const element of elements) {
    const row = asRecord(element);
    const tags = asRecord(row?.tags);
    const name = text(tags?.name);
    if (!name || name.length < 3 || /parking|sklep|apteka|stacja benzyn/i.test(name)) continue;
    const point = pointOf(row);
    if (!point) continue;
    const distanceKm = distanceBetween(origin, point);
    if (tags?.place === "city" || tags?.place === "town") {
      towns.push(name);
      continue;
    }
    const historic = text(tags?.historic);
    const tourism = text(tags?.tourism);
    if (!historic && !tourism) continue;
    places.push({
      name,
      kind: historic ? "historic" : "attraction",
      tag: historic || tourism,
      distanceKm,
    });
  }
  return {
    places: uniqueByName(places)
      .sort((left, right) => left.distanceKm - right.distanceKm)
      .slice(0, 12),
    towns: [...new Set(towns)].slice(0, 5),
  };
}

export function speciesFromINaturalist(payload: unknown): LocalSpecies[] {
  const results = asRecord(payload)?.results;
  if (!Array.isArray(results)) return [];
  const species: LocalSpecies[] = [];
  for (const result of results) {
    const taxon = asRecord(asRecord(result)?.taxon);
    const name = text(taxon?.preferred_common_name);
    if (!name || name.length < 3) continue;
    const iconic = text(taxon?.iconic_taxon_name);
    const group = iconic === "Plantae" ? "plant" : animalGroups.has(iconic) ? "animal" : null;
    if (!group) continue;
    species.push({ name, group });
  }
  return uniqueSpecies(species).slice(0, 8);
}

export function eventsFromTexts(texts: string[]): LocalEvent[] {
  const events: LocalEvent[] = [];
  for (const raw of texts) {
    const title = raw
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (title.length < 8 || title.length > 90) continue;
    if (!/festiwal|jarmark|festyn|warsztat|wystaw|koncert|piknik|kiermasz|zwiedzanie|wydarze/i.test(title)) continue;
    events.push({ title });
  }
  return uniqueByTitle(events).slice(0, 5);
}

export function composeExtraChoices(input: {
  locality: string;
  ageYears: number | null;
  research: AreaResearch;
  offered: string[];
}): ResearchedChoice[] {
  const age = input.ageYears;
  const watch = supervision(age);
  const choices: ResearchedChoice[] = [];
  const place = nextChoice(input.research.places, input.offered, (row) => row.name);
  if (place) {
    choices.push({
      title: place.name,
      subject: place.kind === "historic" ? "Historia" : "Wycieczka",
      parentGuide: `${placeGuide(place, age)} ${distanceLine(place.distanceKm, input.locality)} ${watch}`,
    });
  }

  const species = nextChoice(input.research.species, input.offered, (row) => row.name);
  if (species) {
    const drawing = age != null && age < 8;
    choices.push({
      title: species.group === "plant" ? `Zielnik: ${species.name}` : `Obserwacja: ${species.name}`,
      subject: "Przyroda",
      parentGuide:
        species.group === "plant"
          ? `${drawing ? "Narysujcie" : "Obejrzyjcie z bliska"} ${species.name}. Nie zrywajcie roślin, których nie znacie. ${watch}`
          : `Wypatrujcie ${species.name}. Nie łapcie zwierząt i nie schodźcie ze ścieżki. ${watch}`,
    });
  } else if (input.research.places[1]) {
    const second = input.research.places[1];
    choices.push({
      title: `Co tu żyje: ${second.name}`,
      subject: "Przyroda",
      parentGuide: `Przy ${second.name} wypiszcie trzy rośliny albo zwierzęta, które naprawdę widzicie. Nie zgadujcie gatunku. ${watch}`,
    });
  }

  const event = freshChoice(input.research.events, input.offered, (row) => row.title);
  if (event && choices.length < 3) {
    choices.push({
      title: event.title,
      subject: "Wydarzenie",
      parentGuide: `To wynik wyszukiwania wydarzeń, nie termin wpisany z góry. Przed wyjściem sprawdźcie, czy nadal się odbywa. ${watch}`,
    });
  }
  if (choices.length < 3) {
    const gamePlace =
      input.research.places.find(
        (row) => row.name !== place?.name && !input.offered.some((title) => sameIdea(row.name, title))
      )?.name ??
      input.research.places.find((row) => row.name !== place?.name)?.name ??
      input.research.towns[0] ??
      input.locality;
    const games = OUTDOOR_GAMES.filter((game) => age == null || (age >= game.minAge && age <= game.maxAge));
    const game = nextChoice(games.length > 0 ? games : OUTDOOR_GAMES, input.offered, (row) => row.title(gamePlace));
    if (game) {
      choices.push({
        title: game.title(gamePlace),
        subject: "Teren",
        parentGuide: `${game.guide(gamePlace)} ${watch}`,
      });
    }
  }
  return choices.slice(0, 3);
}

export async function researchArea(
  locality: string,
  fetchImpl: typeof fetch = fetch,
  now = new Date()
): Promise<AreaResearch> {
  const empty = { locality, places: [], species: [], events: [], towns: [] };
  const found = await getJson(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(locality)}`,
    fetchImpl
  );
  const hit = Array.isArray(found) ? asRecord(found[0]) : null;
  const lat = Number(hit?.lat);
  const lon = Number(hit?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return empty;
  const address = asRecord(hit?.address);
  const namedTown = text(address?.city) || text(address?.town) || text(address?.municipality) || locality;
  const month = now.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
  const query = `[out:json][timeout:12];(nwr["name"]["tourism"~"^(attraction|museum|viewpoint|gallery)$"](around:40000,${lat},${lon});nwr["name"]["historic"~"^(castle|manor|ruins|church|monastery)$"](around:40000,${lat},${lon});node["name"]["place"~"^(city|town)$"](around:45000,${lat},${lon}););out center tags 40;`;
  const [mapPayload, speciesPayload, wikiPayload, duckPayload] = await Promise.all([
    getJson(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, fetchImpl),
    getJson(
      `https://api.inaturalist.org/v1/observations/species_counts?lat=${lat}&lng=${lon}&radius=25&per_page=12&locale=pl&quality_grade=research`,
      fetchImpl
    ),
    getJson(
      `https://pl.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`wydarzenia ${namedTown} ${month}`)}&srlimit=5&format=json&utf8=1`,
      fetchImpl
    ),
    getJson(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(`wydarzenia ${namedTown} ${month}`)}&format=json&no_html=1&skip_disambig=1`,
      fetchImpl
    ),
  ]);
  const mapped = placesFromOverpass(mapPayload, { lat, lon });
  const towns = [...new Set([namedTown, ...mapped.towns])];
  const wikiTitles = Array.isArray(asRecord(asRecord(wikiPayload)?.query)?.search)
    ? ((asRecord(asRecord(wikiPayload)?.query)?.search as unknown[]) ?? []).map((row) => text(asRecord(row)?.title))
    : [];
  const duck = asRecord(duckPayload);
  const duckTexts = [text(duck?.Heading), ...relatedTexts(duck?.RelatedTopics)].filter((row): row is string =>
    Boolean(row)
  );
  return {
    locality,
    places: mapped.places,
    species: speciesFromINaturalist(speciesPayload),
    events: eventsFromTexts([...wikiTitles, ...duckTexts]),
    towns,
  };
}

const animalGroups = new Set([
  "Aves",
  "Mammalia",
  "Insecta",
  "Animalia",
  "Amphibia",
  "Reptilia",
  "Arachnida",
  "Actinopterygii",
]);

function supervision(age: number | null): string {
  if (age != null && age >= 10) return "Rodzic pilnuje drogi i wejścia, dziecko prowadzi obserwację.";
  return "Zajęcie trwa około 25 minut. Rodzic jest cały czas obok.";
}

function placeGuide(place: MapPlace, age: number | null): string {
  const young = age == null || age < 8;
  if (place.tag === "castle" || place.tag === "ruins" || place.tag === "manor") {
    return young
      ? `Przy ${place.name} zostańcie na dziedzińcu albo pod murami. Dziecko rysuje jedną wieżę.`
      : `Przy ${place.name} dziecko pokazuje trzy elementy budowli i mówi, do czego mogły służyć.`;
  }
  if (place.tag === "museum" || place.tag === "gallery") {
    return `W ${place.name} wejdźcie tylko do jednej sali. Dziecko wybiera jeden przedmiot i mówi, do czego służył.`;
  }
  if (/kopalni|mine/i.test(place.name)) {
    return young
      ? `Przy ${place.name} zróbcie krótką wizytę przy wejściu albo w pierwszej komorze. Dziecko szuka czegoś zrobionego z soli albo kamienia.`
      : `W ${place.name} wybierzcie jeden krótki odcinek trasy. Dziecko opowiada, co ludzie tu wydobywali.`;
  }
  if (place.tag === "viewpoint")
    return `Z ${place.name} dziecko pokazuje trzy rzeczy: co jest blisko, co daleko i co jest najwyższe.`;
  return `Przy ${place.name} dziecko wybiera jedną rzecz, którą potrafi opisać: kolor, kształt albo wiek.`;
}

function distanceLine(distanceKm: number, locality: string): string {
  if (!Number.isFinite(distanceKm)) return "";
  return `Około ${Math.max(1, Math.round(distanceKm))} km od ${locality}.`;
}

function freshChoice<T>(items: T[], offered: string[], label: (item: T) => string): T | null {
  return items.find((item) => !offered.some((title) => sameIdea(label(item), title))) ?? null;
}

function nextChoice<T>(items: T[], offered: string[], label: (item: T) => string): T | null {
  return freshChoice(items, offered, label) ?? (items.length === 0 ? null : items[offered.length % items.length]);
}

function sameIdea(left: string, right: string): boolean {
  const a = norm(left);
  const b = norm(right);
  if (a.length < 4 || b.length < 4) return a === b;
  return a.includes(b) || b.includes(a);
}

function norm(value: string): string {
  return value
    .toLocaleLowerCase("pl")
    .replace(/[^a-ząćęłńóśźż0-9]+/gi, " ")
    .trim();
}

function uniqueByName(places: MapPlace[]): MapPlace[] {
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = norm(place.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueSpecies(species: LocalSpecies[]): LocalSpecies[] {
  const seen = new Set<string>();
  return species.filter((row) => {
    const key = norm(row.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueByTitle(events: LocalEvent[]): LocalEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = norm(event.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pointOf(row: Record<string, unknown> | null): { lat: number; lon: number } | null {
  const center = asRecord(row?.center);
  const lat = Number(row?.lat ?? center?.lat);
  const lon = Number(row?.lon ?? center?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function distanceBetween(from: { lat: number; lon: number }, to: { lat: number; lon: number }): number {
  const radius = 6371;
  const lat = ((to.lat - from.lat) * Math.PI) / 180;
  const lon = ((to.lon - from.lon) * Math.PI) / 180;
  const a =
    Math.sin(lat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) * Math.cos((to.lat * Math.PI) / 180) * Math.sin(lon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

function relatedTexts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const record = asRecord(row);
    const nested = relatedTexts(record?.Topics);
    const textValue = text(record?.Text);
    return textValue ? [textValue, ...nested] : nested;
  });
}

async function getJson(url: string, fetchImpl: typeof fetch): Promise<unknown | null> {
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
