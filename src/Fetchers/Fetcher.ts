import { Competition } from "../Objects/Competition.js";
import { Match } from "../Objects/Match.js";
import { ICS } from "../ICS.js";
import { Official } from "../Objects/Official.js";

export abstract class Fetcher {
    /**
     * The base URL for this fetcher.
     * @protected
     */
    protected baseURL: string;

    /**
     * The id of this fetcher.
     * @protected
     */
    protected options: FetcherOptions;

    /**
     * Constructor for Fetcher
     * @param baseURL The base URL.
     * @param options The options for this fetcher.
     */
    protected constructor(baseURL: string, options: FetcherOptions) {
        this.options = options;
        this.baseURL = baseURL;
    }

    /**
     * Get the base URL for this fetcher.
     */
    public getBaseURL(): string {
        return this.baseURL;
    }

    /**
     * Get the abbreviation of this fetcher.
     */
    public getAbbr(): string {
        return this.options.abbreviation;
    }

    /**
     * Get the options of this fetcher.
     */
    public getOptions(): FetcherOptions {
        return this.options;
    }

    /**
     * Get the index of this fetcher.
     */
    public getIndex(): number {
        return this.options.index;
    }

    /**
     * Get the id of this fetcher.
     */
    public getID(): string {
        return this.options.id;
    }

    /**
     * Start the fetcher.
     */
    public async start(): Promise<Competition[]> {
        const result = await this.fetch();
        await ICS.storeFilePaths(this);
        return result;
    }

    /**
     * Send a log message from this fetcher.
     * @param type The type of message to log.
     * @param message The message itself.
     * @protected
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public log(type: "error" | "info" | "warn", ...message: any[]): void {
        console[type](`[Fetcher - ${this.getID()}]`, ...message);
    }

    /**
     * Run this fetcher.
     */
    protected abstract fetch(): Promise<Competition[]>;

    /**
     * Fetch the competitions and map them by their ID.
     */
    protected abstract fetchCompetitions(): Promise<Map<string, Competition>>;

    /**
     * Fetch the matches by a competition.
     * @param competition The competition.
     * @param matchOfficials The officials for the matches (optional).
     */
    protected abstract fetchMatches(
        competition: Competition,
        matchOfficials?: Map<string, Official[]>):
        Promise<Map<string, Match>>;

    /**
     * Specifies what description to append to each match
     * event when this fetcher is used.
     * @param competition The competition object.
     * @param match The match object.
     * @param html Whether to add HTML.
     */
    public abstract descriptionToAppend(competition: Competition, match: Match,
                                        html: boolean): string[];
}

export interface FetcherOptions {
    id: string,
    abbreviation: string,
    index: number,
    name: string
}