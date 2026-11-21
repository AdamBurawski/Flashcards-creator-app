import { describe, expect, it } from "vitest";
import {
  composeExtraChoices,
  eventsFromTexts,
  placesFromOverpass,
  researchArea,
  speciesFromINaturalist,
  type AreaResearch,
} from "../extra-research";

const origin = { lat: 49.89, lon: 19.84 };

describe("extra activity research", () => {
  it("reads real places, species and events, then offers a different set next time", async () => {
    const research = await researchArea("Krzywaczka", fakeFetch);
    expect(research.places.map((place) => place.name)).toEqual([
      "Zamek w Lanckoronie",
      "Kopalnia soli w Wieliczce",
      "Wawel",
    ]);
    expect(research.species.map((row) => row.name)).toEqual(["Mniszek lekarski", "Bogatka"]);
    expect(research.events.map((event) => event.title)).toEqual(["Festiwal solny w Wieliczce"]);
    expect(research.towns).toContain("Kraków");

    const first = composeExtraChoices({ locality: "Krzywaczka", ageYears: 7, research, offered: [] });
    expect(first.map((choice) => choice.title)).toEqual([
      "Zamek w Lanckoronie",
      "Zielnik: Mniszek lekarski",
      "Festiwal solny w Wieliczce",
    ]);
    expect(first[0]?.parentGuide).toMatch(/dziedzińcu/);
    expect(first[1]?.parentGuide).toMatch(/Narysujcie/);
    expect(JSON.stringify(first)).not.toMatch(/Matematyka|Polski|Spacer po okolicy/);

    const second = composeExtraChoices({
      locality: "Krzywaczka",
      ageYears: 7,
      research,
      offered: first.map((choice) => choice.title),
    });
    expect(second.map((choice) => choice.title)).toEqual([
      "Kopalnia soli w Wieliczce",
      "Obserwacja: Bogatka",
      "Podchody przy: Wawel",
    ]);
    expect(second[0]?.parentGuide).toMatch(/wejściu|pierwszej komorze/);
  });

  it("keeps a younger child on a short visit and an older one on observation", () => {
    const research: AreaResearch = {
      locality: "Krzywaczka",
      places: [{ name: "Wawel", kind: "historic", tag: "castle", distanceKm: 28 }],
      species: [],
      events: [],
      towns: ["Kraków"],
    };
    const young = composeExtraChoices({ locality: "Krzywaczka", ageYears: 6, research, offered: [] });
    const older = composeExtraChoices({ locality: "Krzywaczka", ageYears: 11, research, offered: [] });
    expect(young[0]?.parentGuide).toMatch(/dziedzińcu/);
    expect(older[0]?.parentGuide).toMatch(/trzy elementy budowli/);
    expect(older[0]?.parentGuide).toMatch(/dziecko prowadzi obserwację/);
  });

  it("drops encyclopedia pages that are not events", () => {
    expect(eventsFromTexts(["Wieliczka", "Festiwal solny w Wieliczce", "Krótki"])).toEqual([
      { title: "Festiwal solny w Wieliczce" },
    ]);
    expect(
      speciesFromINaturalist({ results: [{ taxon: { preferred_common_name: "", iconic_taxon_name: "Plantae" } }] })
    ).toEqual([]);
    expect(
      placesFromOverpass({ elements: [{ tags: { name: "Parking" }, lat: origin.lat, lon: origin.lon }] }, origin).places
    ).toEqual([]);
  });
});

function fakeFetch(url: string): Promise<Response> {
  const body = url.includes("nominatim")
    ? [{ lat: "49.89", lon: "19.84", address: { village: "Krzywaczka", town: "Myślenice" } }]
    : url.includes("overpass")
      ? {
          elements: [
            { tags: { name: "Wawel", historic: "castle" }, lat: 50.06, lon: 19.94 },
            { tags: { name: "Kopalnia soli w Wieliczce", tourism: "attraction" }, lat: 49.98, lon: 20.0 },
            { tags: { name: "Zamek w Lanckoronie", historic: "castle" }, lat: 49.88, lon: 19.84 },
            { tags: { name: "Kraków", place: "city" }, lat: 50.06, lon: 19.94 },
            { tags: { name: "Parking", tourism: "attraction" }, lat: 49.89, lon: 19.84 },
          ],
        }
      : url.includes("inaturalist")
        ? {
            results: [
              { taxon: { preferred_common_name: "Mniszek lekarski", iconic_taxon_name: "Plantae" } },
              { taxon: { preferred_common_name: "Bogatka", iconic_taxon_name: "Aves" } },
              { taxon: { preferred_common_name: "Taraxacum", iconic_taxon_name: "Fungi" } },
            ],
          }
        : url.includes("wikipedia")
          ? { query: { search: [{ title: "Festiwal solny w Wieliczce" }, { title: "Wieliczka" }] } }
          : { Heading: "Wieliczka", RelatedTopics: [] };
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
}
