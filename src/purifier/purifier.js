const purgeContentObjects = async (flotiqApi, options = {}) => {
    const { type, spaceId, ctdName, deleteSchema = false } = options;

    if (type === "space") {
        if (!spaceId) {
            throw new Error("Missing required option: spaceId");
        }

        return flotiqApi.purgeSpace(spaceId);
    }

    if (type === "ctd") {
        if (!ctdName) {
            throw new Error("Missing required option: ctdName");
        }

        return flotiqApi.purgeCtd(ctdName, deleteSchema);
    }

    throw new Error("Unsupported purge type. Use 'space' or 'ctd'.");
};

export default purgeContentObjects;
