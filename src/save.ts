import * as cache from "@actions/cache";
import * as core from "@actions/core";

import { Events, Inputs, State } from "./constants";
import * as utils from "./utils/actionUtils";

async function run(): Promise<void> {
    try {
        if (utils.isGhes()) {
            utils.logWarning("Cache action is not supported on GHES");
            return;
        }

        if (!utils.isValidEvent()) {
            utils.logWarning(
                `Event Validation Error: The event type ${
                    process.env[Events.Key]
                } is not supported because it's not tied to a branch or tag ref.`
            );
            return;
        }

        const state = utils.getCacheState();

        // Inputs are re-evaluted before the post action, so we want the original key used for restore
        const prevPrimaryKey = core.getState(State.CachePrimaryKey);
        const primaryKey = core.getInput(Inputs.Key, { required: true });
        if (!primaryKey) {
            utils.logWarning(`Error retrieving key from state.`);
            return;
        }

        if (utils.isExactKeyMatch(primaryKey, state)) {
            core.info(
                `Cache hit occurred on the primary key ${primaryKey}, not saving cache.`
            );
            core.info(`prevPrimaryKey=${prevPrimaryKey}`);
            return;
        } else {
            core.info(`Cache new or updated; was ${prevPrimaryKey}, now ${primaryKey}`);
        }

        const cachePaths = utils.getInputAsArray(Inputs.Path, {
            required: true
        });

        try {
            await cache.saveCache(cachePaths, primaryKey, {
                uploadChunkSize: utils.getInputAsInt(Inputs.UploadChunkSize)
            });
            core.info(`Cache saved with key: ${primaryKey}`);
        } catch (error) {
            if (error.name === cache.ValidationError.name) {
                throw error;
            } else if (error.name === cache.ReserveCacheError.name) {
                core.info(error.message);
            } else {
                utils.logWarning(error.message);
            }
        }
    } catch (error) {
        utils.logWarning(error.message);
    }
}

run();

export default run;
