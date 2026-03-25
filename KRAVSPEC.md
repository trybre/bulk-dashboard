# Kravspesifikasjon — Bulk Infrastructure Project Dashboard

**Prosjekt:** NRC Group — Bulk Infrastructure Management Dashboard  
**Versjon:** 1.0  
**Dato:** 18. mars 2026  
**Klassifisering:** Privat og konfidensielt

---

## 1. Formål og omfang

Dashboardet er et internt prosjektoppfølgingsverktøy for Bulk Infrastructure (NRC Group). Det gir prosjektledere og ledelse en samlet oversikt over fremdrift, økonomi, milepæler, risiko og saker (issues) for ett eller flere infrastrukturprosjekter. Data kan lastes inn via forhåndsdefinerte CSV-filer eller ved å laste opp en Excel-arbeidsbok.

---

## 2. Teknisk plattform

| Komponent | Teknologi |
|---|---|
| Rammeverk | Next.js 16 (App Router) |
| UI-bibliotek | React 19 + shadcn/ui + Tailwind CSS v4 |
| Skjemavalidering | Zod v4 |
| CSV-parsing | PapaParse |
| Excel-parsing | SheetJS (xlsx) |
| Ikoner | lucide-react |
| Fonter | Geist Sans / Geist Mono (Google Fonts) |

---

## 3. Datakilder og datahåndtering

### 3.1 CSV-filer (standardkilde)

Fire CSV-filer ligger i `/public/data/` og lastes automatisk ved oppstart:

| Fil | Innhold |
|---|---|
| `projects.csv` | Prosjektinfo, statuser, KPI-er, risikokommentar |
| `budget.csv` | Budsjettlinjer per prosjekt |
| `milestones.csv` | Milepæler per prosjekt |
| `issues.csv` | Saker/risikoer per prosjekt |

### 3.2 Excel-opplasting (alternativ kilde)

Brukeren kan laste opp en `.xlsx`-fil med fire ark (`projects`, `budget`, `milestones`, `issues`) som tilsvarer CSV-strukturen. Data fra Excel lagres i `localStorage` og prioriteres over CSV-filene i alle datahentingsoperasjoner.

### 3.3 Datahåndteringslogikk

- **Prioritering:** Alle datahentingsfunksjoner sjekker `localStorage` for Excel-data først. Dersom Excel-data ikke finnes, hentes CSV-filer.
- **Validering:** Alle datakilder (CSV og Excel) valideres mot Zod-skjemaer. Rader som ikke består validering, filtreres bort.
- **Prosjektfiltrering:** Dashboard-data hentes alltid filtrert på ett aktivt prosjekt av gangen.

### 3.4 Dataskjemaer

#### Prosjekt (`project-schema.ts`)
| Felt | Type | Beskrivelse |
|---|---|---|
| `project_id` | string | Unik identifikator |
| `project_name` | string | Prosjektnavn |
| `company` | string | Selskap/divisjon |
| `project_manager` | string | Prosjektleder |
| `report_date` | string | Rapportdato |
| `overall_status` | `RED` \| `YELLOW` \| `GREEN` | Overordnet status |
| `time_status` | string | Fristatus (tekst) |
| `time_comment` | string | Kommentar til fristatus |
| `cost_status` | string | Kostnadsstatus (tekst) |
| `cost_comment` | string | Kommentar til kostnadsstatus |
| `quality_status` | string | Kvalitetsstatus (tekst) |
| `quality_comment` | string | Kommentar til kvalitetsstatus |
| `completion_rate` | number | Ferdigstillingsgrad (0–1) |
| `variation_orders` | number | Antall endringsordrer |
| `risk_comment` | string | Risikokommentar (linjeskift = punktpunkter) |
| `hs_injuries` | string | Skader (format: `nåværende\|forrige`) |
| `hs_near_misses` | string | Nestenulykker RUH (format: `nåværende\|forrige`) |
| `hs_hipo` | string | HiPo-hendelser (format: `nåværende\|forrige`) |
| `hs_headcount` | string | Antall ansatte (format: `nåværende\|forrige`) |
| `hs_hours_worked` | string | Arbeidede timer (format: `nåværende\|forrige`) |
| `quality_punch_registered` | string | Registrerte punch-punkter (format: `nåværende\|forrige`) |
| `quality_punch_cleared` | string | Lukkede punch-punkter (format: `nåværende\|forrige`) |
| `quality_mc_inspections` | string | MC-inspeksjoner (format: `nåværende\|forrige`) |
| `quality_deviations` | string | Avvik (format: `nåværende\|forrige`) |

**Merk om KPI-format:** Alle H&S- og kvalitets-KPI-er lagres som `"nåværende|forrige"` (f.eks. `"5|3"`) og splittes av hjelpefunksjonen `parsePair()` for visning.

#### Budsjett (`budget-schema.ts`)
| Felt | Type | Beskrivelse |
|---|---|---|
| `project_id` | string | Prosjektreferanse |
| `budget_post` | string | Budsjettpost/kategori |
| `budget_nok` | number | Opprinnelig budsjett (NOK) |
| `additional_nok` | number | Tilleggsbudsjett (NOK) |
| `budget_incl_additional_nok` | number | Revidert budsjett (NOK) |
| `paid_nok` | number | Betalt til dato (NOK) |
| `eac_nok` | number | Estimat ved ferdigstillelse (EAC, NOK) |

#### Milepæl (`milestone-schema.ts`)
| Felt | Type | Beskrivelse |
|---|---|---|
| `project_id` | string | Prosjektreferanse |
| `milestone_nr` | number | Milepælnummer |
| `name` | string | Milepælnavn |
| `date` | string | Planlagt dato |
| `status` | `OK` \| `MIDLERTIDIG` | Status (OK = fullført, MIDLERTIDIG = provisorisk/pågående) |

#### Sak/issue (`issue-schema.ts`)
| Felt | Type | Beskrivelse |
|---|---|---|
| `project_id` | string | Prosjektreferanse |
| `issue_nr` | number | Saksnummer |
| `problem` | string | Beskrivelse av problem |
| `handling_plan` | string | Handlingsplan (valgfritt) |
| `responsible` | string | Ansvarlig person |
| `deadline` | string | Frist |

---

## 4. Navigasjon og URL-styring

- Aktivt prosjekt er lagret i URL-parameteren `?project=<project_id>`, noe som muliggjør direktelenking og bruk av nettleserens fremover/tilbake-knapper.
- Ved oppstart velges første tilgjengelige prosjekt automatisk dersom ingen URL-parameter er satt.
- Klikk på et prosjekt i sidemeny oppdaterer URL-parameteren og laster inn tilhørende data.

---

## 5. Sideoppsett

Dashboardet er delt i to hoveddeler:

```
┌──────────────┬─────────────────────────────────────────────────┐
│              │  ProjectHeader                                   │
│              ├───────────────────────┬─────────────────────────┤
│   Sidebar    │  SuccessCriteriaPanel │  BudgetOverviewChart    │
│  (256 px)    ├───────────────────────┴─────────────────────────┤
│              │  IssuesRiskTable                                 │
│              ├─────────────────────────────────────────────────┤
│              │  MilestoneTimeline                               │
└──────────────┴─────────────────────────────────────────────────┘
```

---

## 6. Komponentbeskrivelser

### 6.1 Sidebar

**Fil:** `components/dashboard/Sidebar.tsx`

**Funksjon:** Venstre navigasjonspanel med mørk teal-bakgrunn (fast bredde 256 px).

**Innhold:**
- Logo og applikasjonstittel ("bulk / Project Monitor")
- Liste over alle tilgjengelige prosjekter
  - Hvert prosjekt vises med navn og fargekodet statuspunkt (grønn / gul / rød)
  - Aktivt prosjekt er markert med en animert pulserende statuspunkt
  - Klikk på et prosjekt bytter aktivt prosjekt (oppdaterer URL)
- Tellemerke som viser totalt antall prosjekter
- Excel-opplastingswidget (`ExcelUpload`) nederst
- Bunntekst: "Classification: Private & Confidential"

---

### 6.2 Excel-opplasting (`ExcelUpload`)

**Fil:** `components/dashboard/ExcelUpload.tsx`

**Funksjon:** Lar brukeren laste opp en Excel-fil som erstatter CSV-filene som datakilde.

**Funksjoner:**
- **Dra-og-slipp:** Brukeren kan dra en `.xlsx`- eller `.xls`-fil direkte til opplastingsområdet.
- **Klikk-for-å-velge:** Alternativt kan brukeren klikke på opplastingsområdet for å åpne en filvelger.
- **Filvalidering:** Kun filer med MIME-type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` eller `application/vnd.ms-excel` godtas.
- **Parsing og lagring:** Etter valgt fil kalles `parseExcelFile()`, som leser alle fire ark og lagrer data i `localStorage`.
- **Tilstandsvisning:**
  - Viser filnavn og en X-knapp for å fjerne data (tilbakestil til CSV) når Excel-data er lastet.
  - Viser en lasteindikator under parsing.
  - Viser feilmelding dersom opplasting mislykkes.
- **Last ned mal:** En "Download template"-knapp genererer og laster ned en tom `bulk_dashboard_template.xlsx` med riktige arkstrukturer, eksempelrader og formaterte overskrifter via `downloadTemplate()`.
- **Tilbakestilling:** X-knappen kaller `clearStoredExcelData()` og utløser full dataoppdatering til CSV-fallback.

---

### 6.3 Prosjekthode (`ProjectHeader`)

**Fil:** `components/dashboard/ProjectHeader.tsx`

**Funksjon:** Øverste header-linje for det aktive prosjektet.

**Viser:**
- Seksjonsmerke: "Infra Projects"
- Tittel: "Bulk Infrastructure | Management Report"
- Prosjektnavn og formatert rapportdato
- Prosjektleder og rå rapportdato
- Overordnet statusbadge med farge (GRØNN / GUL / RØD) og trendpil
- Merkevare-wordmark: "bulk / Infrastructure"

---

### 6.4 Suksesskriterier-panel (`SuccessCriteriaPanel`)

**Fil:** `components/dashboard/SuccessCriteriaPanel.tsx`

**Funksjon:** Venstre kort i øverste innholdsseksjon. Viser de tre vektede suksesskriteriene.

| Kriterium | Vekt |
|---|---|
| Tid | 45 % |
| Kostnad | 45 % |
| Kvalitet | 10 % |

For hvert kriterium vises:
- En fargekodet statussirkel (grønn / gul / rød) basert på `statusToColor()`
- Statuskommentar som punktliste (linjeskift tolkes som separate punkter)

---

### 6.5 Budsjettoversikt og KPI-er (`BudgetOverviewChart`)

**Fil:** `components/dashboard/BudgetOverviewChart.tsx`

**Funksjon:** Høyre hovedelement i øverste innholdsseksjon. Kombinerer finansiell oversikt og KPI-er.

**Underkomponenter:**

#### 6.5.1 Finansielt stolpediagram (`FinancialsBarChart`)
Håndtegnet SVG-stolpediagram med fire stolper (alle i BNOK):
- Bokført PTD (betalt til dato)
- Opprinnelig budsjett
- Revidert budsjett
- Gjeldende estimat (EAC)

Inkluderer fargeforklaring.

#### 6.5.2 KPI-fliser
- **Ferdigstillingsgrad** — fremhevet prosentverdi
- **Budsjettavvik %** — beregnes fra budsjettposter
- **Antall endringsordrer** — fra prosjektdata

#### 6.5.3 H&S KPI-rader
Viser nåværende verdi og forrige periodes verdi side om side:
- Personskader
- Nestenulykker (RUH) / HiPo-hendelser
- Antall ansatte
- Arbeidede timer

#### 6.5.4 Kvalitets-KPI-rader
Viser nåværende og forrige periodes verdier:
- Registrerte punch-punkter
- Lukkede punch-punkter
- MC-inspeksjoner
- Avvik

---

### 6.6 Budsjett-KPI-kort (`BudgetKpiCards`)

**Fil:** `components/dashboard/BudgetKpiCards.tsx`

**Funksjon:** Fire summartkort som viser finansiell status basert på totalen/"SUM"-raden i budsjettdata.

| Kort | Innhold |
|---|---|
| Totalt budsjett | Revidert budsjett inkl. tillegg (MNOK) |
| Betalt til dato | Kumulativt betalt (MNOK) |
| Betalingsrate | Betalt / revidert budsjett (%) |
| Gjenstående | Revidert budsjett minus betalt (MNOK) |

**Merknad:** Denne komponenten er tilgjengelig men er ikke brukt direkte i `page.tsx` pr. i dag (KPI-logikken er i stedet innbakt i `BudgetOverviewChart`).

---

### 6.7 Milepæltidslinje (`MilestoneTimeline`)

**Fil:** `components/dashboard/MilestoneTimeline.tsx`

**Funksjon:** Visuell tidslinje og detaljert liste over alle milepæler for aktivt prosjekt.

**Funksjoner:**
- **SVG-tidslinje:** Horisontalt spor med milepælpunkter
  - Grønn fylt sirkel = fullført (`OK`)
  - Gul/amber ring = provisorisk/pågående (`MIDLERTIDIG`)
  - En stiplet blå "I DAG"-markør vises på dagens dato
- **Sveveverktøytips:** Viser milepælnavn og dato ved hover
- **Tellemerke:** Antall fullførte og gjenstående milepæler vises i teal-toppteksten
- **Sammenleggbar tabell:** Under tidslinjen vises alle milepæler i en tabell med:
  - Nummer, navn, dato og statusbadge
  - Tabellen kan skjules/vises via en ekspander

---

### 6.8 Saker og risiko (`IssuesRiskTable`)

**Fil:** `components/dashboard/IssuesRiskTable.tsx`

**Funksjon:** To-kolonne kortvisning for risiko og sakshåndtering.

#### 6.8.1 Risiko og utfordringer (venstre)

- Viser prosjektets `risk_comment` som punktliste
- **Inline redigering:** En blyantikon vises ved hover
  - Klikk åpner et textarea der risikobeskrivelsen kan redigeres direkte
  - Endringer lagres per prosjekt i `localStorage` under nøkkelen `risk_comment_{projectId}`
  - Redigert innhold prioriteres over data fra CSV/Excel
  - Avbryt kaster endringer; lagre-knapp persister

#### 6.8.2 Saksregister (høyre)

Sorterbar tabell med aktive saker/risikoer:

| Kolonne | Innhold |
|---|---|
| # | Saksnummer |
| Problem | Problemtekst (avkortet) |
| Ansvarlig | Avatar med initialer (deterministisk farge per navn) |
| Frist | Dato; vises som rød badge dersom utløpt eller "ASAP" |

**Detaljvisning:** Klikk på en saksrad åpner en ekspandert detaljvisning med:
- Fullt prosjektnavn og -nummer
- Fullstendig problemtekst
- Handlingsplan (`handling_plan`)
- Vedlikeholdsperson og frist

---

### 6.9 Overordnet statusbadge (`OverallStatusBadge`)

**Fil:** `components/dashboard/OverallStatusBadge.tsx`

**Funksjon:** Gjenbrukbar komponent som viser et fargebannermerke for prosjektstatus.

| Status | Farge | Etikett |
|---|---|---|
| `GREEN` | Grønn | "On Track" |
| `YELLOW` | Gul | "Deviation" |
| `RED` | Rød | "At Risk" |

Kan inkludere valgfri beskrivelsestekst. Brukes også inne i `ProjectHeader`.

---

## 7. Hjelpefunksjoner og verktøy

### 7.1 `statusToColor(status: string)`
Konverterer en statustekst (f.eks. "OK", "Avvik", "KritisK") til fargestreng `'green' | 'yellow' | 'red'`. Brukes av `SuccessCriteriaPanel` og andre komponenter.

### 7.2 `parsePair(val: string)`
Splitter en `"nåværende|forrige"`-streng til et to-elements tuppel `[string, string]`. Benyttes overalt der H&S- og kvalitets-KPI-er vises.

### 7.3 `formatMnok(nok: number)`
Konverterer et NOK-beløp til MNOK-streng med én desimal (f.eks. `1_250_000` → `"1.3"`).

### 7.4 `fetchDashboardData(projectId)`
Henter alle fire datakategorier parallelt og returnerer et `DashboardData`-objekt med `project`, `milestones`, `budget` og `issues` — filtrert til kun det aktive prosjektet.

---

## 8. Lastetilstander og feilhåndtering

- **Skeleton-animasjoner:** Mens data hentes vises en `ContentSkeleton`-komponent med plassholderelementer for alle kortseksjoner.
- **Feilvisning:** Ved hentingsfeil vises en `Alert`-komponent med rød varseltekst, feilmeldingen og en "Try again"-knapp som utløser nytt hentingsforsøk.
- **Suspense:** Siden er innpakket i `<Suspense>` for å håndtere asynkron ruteinitialisering (URL-parametre).

---

## 9. Lagring og persistens

| Data | Lagringssted |
|---|---|
| Excel-fildata (alle fire ark) | `localStorage` (nøkkel per ark) |
| Redigerte risikokommentarer | `localStorage` (`risk_comment_{projectId}`) |
| Aktivt prosjekt | URL-parameter `?project=` |

---

## 10. Tilgjengelighet og brukeropplevelse

- Sveveverktøytips (`TooltipProvider`) er globalt tilgjengelig for alle komponenter
- Animert pulserende dot indikerer aktivt prosjekt i sidemenyen
- Avatarer for ansvarlige personer bruker deterministisk fargevalg basert på navn (konsekvent farge per person)
- Fristdatoer markeres automatisk med rød badge dersom de er passert eller angitt som "ASAP"
- Innholdet er designet for stor skjerm (desktop-first), med fast sidebreddeoppsett

---

## 11. Excel-malstruktur

Excel-malen (`bulk_dashboard_template.xlsx`) inneholder fire ark med følgende kolonner:

| Ark | Kolonner |
|---|---|
| `projects` | project_id, project_name, company, project_manager, report_date, overall_status, time_status, time_comment, cost_status, cost_comment, quality_status, quality_comment, completion_rate, variation_orders, risk_comment, hs_injuries, hs_near_misses, hs_hipo, hs_headcount, hs_hours_worked, quality_punch_registered, quality_punch_cleared, quality_mc_inspections, quality_deviations |
| `budget` | project_id, budget_post, budget_nok, additional_nok, budget_incl_additional_nok, paid_nok, eac_nok |
| `milestones` | project_id, milestone_nr, name, date, status |
| `issues` | project_id, issue_nr, problem, handling_plan, responsible, deadline |

---

## 12. Begrensninger og kjente mangler (per v1.0)

| # | Beskrivelse |
|---|---|
| 1 | `BudgetKpiCards`-komponenten er ikke koblet til `page.tsx` og brukes ikke i gjeldende layout. |
| 2 | Redigerte risikokommentarer i `localStorage` overskriver ikke Excel-data ved neste Excel-opplasting. |
| 3 | Dashboardet er ikke responsivt for mobilskjerm — breddeoppsettet er optimalisert for desktop. |
| 4 | Det er ingen autentiseringsmekanisme; tilgangskontroll forutsettes håndtert på nettverks-/infrastrukturnivå. |
| 5 | Alle dataoperasjoner er klientsidige; det finnes ingen backend-API eller databaseintegrasjon. |
