import { describe, expect, test } from "vitest";
import { Official } from "../../../src/Objects/Official.js";

describe("Official tests", () => {
    const official = new Official("1", "John Doe", "Umpire", "USA");

    test("getID()", () => {
        expect(official.getID()).toBe("1");
    });

    test("getName()", () => {
        expect(official.getName()).toBe("John Doe");
    });

    test("getRole()", () => {
        expect(official.getRole()).toBe("Umpire");
    });

    test("getCountry()", () => {
        expect(official.getCountry()).toBe("USA");
    });
});
