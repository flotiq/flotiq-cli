import { jest } from "@jest/globals";
import purgeContentObjects from "../src/purifier/purifier.js";

describe("purifier", () => {
    it("should purge space using purgeSpace method", async () => {
        const flotiqApi = {
            purgeSpace: jest.fn().mockResolvedValue({ status: 200 }),
            purgeCtd: jest.fn(),
        };

        await purgeContentObjects(flotiqApi, {
            type: "space",
            spaceId: "space_1",
        });

        expect(flotiqApi.purgeSpace).toHaveBeenCalledWith("space_1");
        expect(flotiqApi.purgeCtd).not.toHaveBeenCalled();
    });

    it("should purge ctd using purgeCtd method", async () => {
        const flotiqApi = {
            purgeSpace: jest.fn(),
            purgeCtd: jest.fn().mockResolvedValue({ status: 200 }),
        };

        await purgeContentObjects(flotiqApi, {
            type: "ctd",
            ctdName: "blogpost",
            deleteSchema: true,
        });

        expect(flotiqApi.purgeCtd).toHaveBeenCalledWith("blogpost", true);
        expect(flotiqApi.purgeSpace).not.toHaveBeenCalled();
    });

    it("should throw for unsupported purge type", async () => {
        const flotiqApi = {
            purgeSpace: jest.fn(),
            purgeCtd: jest.fn(),
        };

        await expect(purgeContentObjects(flotiqApi, {})).rejects.toThrow(
            "Unsupported purge type. Use 'space' or 'ctd'."
        );
    });
});
