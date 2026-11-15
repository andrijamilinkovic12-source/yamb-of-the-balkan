const baseConfig = require('./capacitor.config.json');
const {
    getValidatedStagingApplicationId,
    getValidatedStagingClientUrl
} = require('./scripts/reconnect-staging-safety');

const stagingUrl = String(process.env.YAMB_CAPACITOR_SERVER_URL || '').trim();
const config = stagingUrl ? {
    ...baseConfig,
    appId: getValidatedStagingApplicationId(process.env),
    server: {
        ...baseConfig.server,
        url: getValidatedStagingClientUrl(process.env),
        allowNavigation: []
    }
} : baseConfig;

module.exports = process.env.YAMB_ANDROID_FACEBOOK_APP_ID && process.env.YAMB_ANDROID_FACEBOOK_CLIENT_TOKEN
    ? {
        ...config,
        plugins: {
            ...config.plugins,
            FirebaseAuthentication: {
                ...config.plugins.FirebaseAuthentication,
                providers: [...config.plugins.FirebaseAuthentication.providers, 'facebook.com']
            }
        }
    }
    : config;
