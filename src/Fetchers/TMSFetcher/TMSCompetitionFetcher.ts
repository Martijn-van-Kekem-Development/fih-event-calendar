import {Competition} from "../../Objects/Competition.js";
import {HTMLElement, parse} from "node-html-parser";
import {TMSFetcher} from "./TMSFetcher.js";

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
     * @param stopID The ID of the competition to stop looking.
     *               The parser will stop fetching competitions when this ID is reached.
     *               This parameter is ignored for types other than 'previous' and 'all'.
     *               The competition with the given stop ID will not be included in the result.
     */
    public async fetch(type: "all" | "upcoming" | "previous" | "in-progress", stopID: string = null) {
        let page = 1;
        const competitions: Map<string, Competition> = new Map();

        let index = 0;
        fetchLoop:
            while (true) {
                // Get data from TMS.
                const data = await fetch(
                    type === "in-progress" ?
                        `${this.fetcher.getBaseURL()}/competitions?page=${page}` :
                        `${this.fetcher.getBaseURL()}/competitions?view=${type}&page=${page}`);
                const html = parse(await data.text());
                const rows = html.querySelectorAll("#admin_list_of_competitions table tbody tr");

                // Check no results
                if (rows.length === 1 && rows[0].innerText.trim() === "No results") break;

                // Create competition from every row.
                for (let row of rows) {
                    const item = this.createCompetition(row, index++);

                    // Check if we need to stop
                    if ((type === "previous" || type === "all") && item.getID() === stopID) break fetchLoop;

                    competitions.set(item.getID(), item);
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
        if (!id) throw new Error("Failed to get ID for match.");
        else object.setID(id);

        // Add competition name.
        const name = link.textContent ?? null;
        if (!name) throw new Error("Failed to get name for match.");
        else object.setName(name.trim());

        // Add competition location
        const location = row.querySelector("td:nth-child(4)");
        object.setLocation(location.textContent.trim());

        // Add competition type
        const type = row.querySelector("td:nth-child(5)");
        object.setType(type.textContent.trim());

        return object;
    }
}