const baseConfig = require('./capacitor.config.json');
const {
    getValidatedStagingApplicationId,
    getValidatedStagingClientUrl
} = require('./scripts/reconnect-staging-safety');

const stagingUrl = String(process.env.YAMB_CAPACITOR_SERVER_URL || '').trim();

module.exports = stagingUrl
    ? {
        ...baseConfig,
        appId: getValidatedStagingApplicationId(process.env),
        server: {
            ...(baseConfig.server || {}),
            url: getValidatedStagingClientUrl(process.env),
            allowNavigation: []
        }
    }
    : baseConfig;
