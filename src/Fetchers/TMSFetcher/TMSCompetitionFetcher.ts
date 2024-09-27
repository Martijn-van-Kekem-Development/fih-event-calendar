import { Competition } from "../../Objects/Competition.js";
import { HTMLElement, parse } from "node-html-parser";
import { TMSFetcher } from "./TMSFetcher.js";
import { APIHelper } from "../../Utils/APIHelper";
import { Official } from "../../Objects/Official.js";

export class TMSCompetitionFetcher {
    /**
     * The TMS fetcher class.
     * @protected
     */
    protected fetcher: TMSFetcher;

    /**
     * Constructor for TMSCompetitionFetcher.
     * @param fetcher
     */
    constructor(fetcher: TMSFetcher) {
        this.fetcher = fetcher;
    }

    /**
     * Get the competitions.
     * @param type The type of competitions to get.
     * @param options The index to start the first match at
     */
    public async fetch(type: "upcoming" | "previous" | "in-progress",
                       options: { index: number }) {

        let page = 1;
        const competitions: Map<string, Competition> = new Map();

        while (true) {
            // Get data from TMS.
            const baseURL = this.fetcher.getBaseURL();
            const data = await APIHelper.fetch(
                type === "in-progress"
                    ? `${baseURL}/competitions?page=${page}`
                    : `${baseURL}/competitions?view=${type}&page=${page}`,
                this.fetcher);

            const html = parse(await data.text());
            const rows = html.querySelectorAll(
                "#admin_list_of_competitions table tbody tr");

            // Check no results
            if (rows.length === 1 && rows[0].innerText.trim() === "No results")
                break;

            // Create competition from every row.
            for (const row of rows) {
                const item = this.createCompetition(row, options.index++);
                // Get the competition ID
                const competitionId = item.getID();
                const officialsMap = await this.fetchOfficials(competitionId);
                // Get officials for the competition
                const officials = officialsMap.get(item.getID()) || [];
                item.setOfficials(officials);
                competitions.set(competitionId, item);
            }

            // Continue with next page.
            page++;
        }

        return competitions;
    }

    /**
     * Create a competition object from an FIH row.
     * @param row
     * @param index
     */
    public createCompetition(row: HTMLElement, index: number): Competition {
        const object = new Competition(this.fetcher, index);
        const link = row.querySelector("td:nth-child(2) a[href]");

        // Add competition ID.
        const id = link.getAttribute("href").split("/").slice(-1)[0] ?? null;
        if (!id) throw new Error("Failed to get ID for competition.");
        else object.setID(id);

        // Add competition name.
        const name = link.textContent ?? null;
        if (!name) throw new Error("Failed to get name for competition.");
        else object.setName(name.trim());

        // Add competition location
        const location = row.querySelector("td:nth-child(4)");
        object.setLocation(location.textContent.trim());

        // Add competition type
        const type = row.querySelector("td:nth-child(5)");
        object.setType(type.textContent.trim());

        return object;
    }

    public async fetchOfficials(
            competitionId: string): Promise<Map<string, Official[]>> {
            const baseURL = this.fetcher.getBaseURL();
            const url = `${baseURL}/competitions/${competitionId}/officials`;
            console.log(`Fetching officials from URL: ${url}`);

            const data = await APIHelper.fetch(url, this.fetcher);
            const htmlText = await data.text();
            const html = parse(htmlText);
            const matchOfficials: Map<string, Official[]> = new Map();

            // Find all appointment tabs
            const appointmentTabs = html.querySelectorAll(
                ".nav-pills li a[data-toggle=\"tab\"]");
            console.log(`Found ${appointmentTabs.length} appointment tabs`);

            for (const tab of appointmentTabs) {
                const tabId = tab.getAttribute("href")?.replace("#", "");
                if (!tabId) continue;

                const appointmentsTab = html.querySelector(`#${tabId}`);
                if (!appointmentsTab) {
                    console.log(`No appointments tab found for ${tabId}`);
                    continue;
                }

                const table = appointmentsTab.querySelector("table");
                if (!table) {
                    console.log(`No appointments table found for ${tabId}`);
                    continue;
                }

                const rows = table.querySelectorAll("tr");
                console.log(
                    `Found ${rows.length} rows in appointments for ${tabId}`);

                for (let i = 1; i < rows.length; i++) {
                    // Start from 1 to skip header row
                    const columns = rows[i].querySelectorAll("td");
                    if (columns.length >= 6) {
                        const matchId = columns[1]
                            .querySelector("a")?.getAttribute("href");
                        const matchIdValue = matchId ? matchId.split("/").pop() : "";
                        const officials: Official[] = [];

                        // Process Umpires from separate <td> elements
                        const umpire1 = columns[2].querySelector("a");
                        if (umpire1) {
                            const name = umpire1.textContent.trim();
                            const id = umpire1
                                .getAttribute("href")?.split("/").pop() || "";
                            const country = umpire1
                                .textContent.match(/\((.*?)\)/)?.[1] || "";
                            officials
                                .push(new Official(id, name, "Umpire", country));
                        }

                        const umpire2 = columns[3].querySelector("a");
                        if (umpire2) {
                            const name = umpire2.textContent.trim();
                            const id = umpire2
                                .getAttribute("href")?.split("/").pop() || "";
                            const country = umpire2
                                .textContent.match(/\((.*?)\)/)?.[1] || "";
                            officials
                                .push(new Official(id, name, "Umpire", country));
                        }

                        // Process Reserve/Video column
                        this.processOfficialColumn(columns[4],
                            "Reserve/Video Umpire", officials);
                        // Process Scoring/Timing column
                        this.processOfficialColumn(columns[5],
                            "Scoring/Timing Official", officials);
                        // Process Technical Officer column
                        this.processOfficialColumn(columns[6],
                            "Technical Officer", officials);

                        if (matchIdValue && officials.length > 0) {
                            matchOfficials.set(matchIdValue, officials);
                        }
                    }
                }
            }

        return matchOfficials;
    }

    private processOfficialColumn(
            column: HTMLElement,
            role: string,
            officials: Official[]) {
            // Ensure the column is valid
            if (!column) {
                return; // Exit if column is not valid
            }

            // Select all anchor tags within the column
            const nameLinks = column.querySelectorAll("a");
            for (const nameLink of nameLinks) {
                const name = nameLink.textContent.trim();
                const id = nameLink.getAttribute("href")?.split("/").pop() || "";
                const country = nameLink.textContent.match(/\((.*?)\)/)?.[1] || "";

                // Push the official details into the officials array
                officials.push(new Official(id, name, role, country));
            }
    }
}
