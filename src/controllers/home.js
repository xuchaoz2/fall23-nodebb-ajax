'use strict';

const url = require('url');

const { assert } = require('console');

const plugins = require('../plugins');
const meta = require('../meta');
const user = require('../user');



// return type should be string
function adminHomePageRoute() {
    // assert return type string
    const output = ((meta.config.homePageRoute === 'custom' ? meta.config.homePageCustom : meta.config.homePageRoute) || 'tags').replace(/^\//, '');
    assert(typeof output === 'string');
    return output;
}

async function getUserHomeRoute(uid) {
    const settings = await user.getSettings(uid);
    let route = adminHomePageRoute();

    if (settings.homePageRoute !== 'undefined' && settings.homePageRoute !== 'none') {
        route = (settings.homePageRoute || route).replace(/^\/+/, '');
    }

    return route;
}

async function rewrite(req, res, next) {
    if (req.path !== '/' && req.path !== '/api/' && req.path !== '/api') {
        return next();
    }
    let route = adminHomePageRoute();
    if (meta.config.allowUserHomePage) {
        route = await getUserHomeRoute(req.uid, next);
    }

    let parsedUrl;
    try {
        parsedUrl = url.parse(route, true);
    } catch (err) {
        return next(err);
    }

    const { pathname } = parsedUrl;
    const hook = `action:homepage.get:${pathname}`;
    if (!plugins.hooks.hasListeners(hook)) {
        req.url = req.path + (!req.path.endsWith('/') ? '/' : '') + pathname;
    } else {
        res.locals.homePageRoute = pathname;
    }
    req.query = Object.assign(parsedUrl.query, req.query);

    next();
}

exports.rewrite = rewrite;

function pluginHook(req, res, next) {
    const hook = `action:homepage.get:${res.locals.homePageRoute}`;

    plugins.hooks.fire(hook, {
        req: req,
        res: res,
        next: next,
    });
}

exports.pluginHook = pluginHook;
