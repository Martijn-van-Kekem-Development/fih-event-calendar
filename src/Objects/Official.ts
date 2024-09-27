export class Official {
    private id: string;
    private name: string;
    private role: string;
    private country: string;

    constructor(id: string, name: string, role: string, country: string) {
        this.id = id;
        this.name = name;
        this.role = role;
        this.country = country;
    }

    public getID(): string {
        return this.id;
    }

    public getName(): string {
        return this.name;
    }

    public getRole(): string {
        return this.role;
    }

    public getCountry(): string {
        return this.country;
    }
}
