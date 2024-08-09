import {Competition} from "../../Objects/Competition.js";
import {Club, Match} from "../../Objects/Match.js";
import {KNHBFetcher} from "./KNHBFetcher.js";
import {DateHelper} from "../../Utils/DateHelper.js";
import {KNHBAbbreviations} from "../../Utils/KNHBAbbreviations.js";
import {APIHelper} from "../../Utils/APIHelper.js";

export class KNHBMatchFetcher {
    /**
     * The KNHB fetcher class.
     * @protected
     */
    protected fetcher: KNHBFetcher;

    /**
     * Constructor for KNHBMatchFetcher.
     * @param fetcher
     */
    constructor(fetcher: KNHBFetcher) {
        this.fetcher = fetcher;
    }

    /**
     * Get the matches in a given competition.
     * @param type The type of matches to fetch.
     * @param competition The competition to get the matches for.
     */
    public async fetch(type: "upcoming" | "official", competition: Competition) {
        const matches: Map<string, Match> = new Map();
        let index = 1;
        let page = 1

        while (true) {
            const json = await this.makeRequest(type, page, competition);

            for (const match of json.data) {
                const item = this.createMatch(competition, match, index++);
                matches.set(item.getID(), item);
            }

            if (json.links.next) page++;
            else break;
        }

        return matches;
    }

    /**
     * Make a request to the web server.
     * @param type The type of matches to fetch.
     * @param page The page number to fetch.
     * @param competition The competition to fetch the matches for.
     * @param tryCount The amount of tries that have past.
     * @private
     */
    private async makeRequest(type: "upcoming" | "official", page: number, competition: Competition, tryCount: number = 0) {
        const data = await fetch(this.fetcher.getBaseURL() +
            `/competitions/${competition.getID()}/matches/${type}?page=${page}`);

        if (data.status !== 200) {
            // Request failed
            if (tryCount < 3) {
                console.warn(`[KNHBMatchFetcher] Request failed (${data.status}, URL: ${data.url}), retrying...`);
                await APIHelper.delay(data.status === 429 ? 15000 : 1000);
                return await this.makeRequest(type, page, competition, tryCount++);
            } else {
                // Give up
                throw new Error("[KNHBMatchFetcher] Request failed after 3 tries.");
            }
        }

        return await data.json();
    }

    /**
     * Create a match object from an KNHB row.
     * @param competition
     * @param match
     * @param index
     */
    public createMatch(competition: Competition, match: KNHBMatch, index: number): Match {
        const object = new Match();
        object.setCompetition(competition);
        object.setID(match.id);
        object.setIndex(index);
        object.setMatchDate(DateHelper.KNHBtoUTC(match.datetime));
        object.setVenue(match.location.description);

        // Add teams
        const homeClub: Club = match.home_team.club_name === null ? null : {
            id: KNHBAbbreviations.getClubId(match.home_team.club_name),
            name: match.home_team.club_name
        };
        const awayClub: Club = match.away_team.club_name === null ? null : {
            id: KNHBAbbreviations.getClubId(match.away_team.club_name),
            name: match.away_team.club_name
        };
        object.setHomeTeam(match.home_team.id, match.home_team.name, homeClub);
        object.setAwayTeam(match.away_team.id, match.away_team.name, awayClub);

        // Add gender
        const gender = KNHBAbbreviations.getGender(competition.getName());
        object.setGender(gender);

        // Add completed state
        if (match.status === "Official") {
            object.setCompleted(true);
            if (match.home_score && match.away_score) {
                let scoreString = `${match.home_score} - ${match.away_score}`;
                if (match.home_shootout && match.away_shootout) {
                    scoreString += ` (${match.home_shootout} - ${match.away_shootout} SO)`;
                }

                object.setScore(scoreString);
            }}

        return object;
    }
}

interface KNHBMatch {
    id: string,
    location: KNHBLocation,
    home_score?: number,
    home_shootout?: number,
    home_team: KNHBTeam,
    away_score?: number,
    away_shootout?: number,
    away_team: KNHBTeam,
    datetime: string,
    status: "Official" | "Upcoming"
}

interface KNHBLocation {
    city?: string,
    street?: string,
    house_number: string,
    description?: string
}

interface KNHBTeam {
    club_name?: string,
    id: string,
    name: string
}