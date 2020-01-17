/**
 * @fileoverview Config Comment Parser
 * @author Nicholas C. Zakas
 */

/* eslint-disable class-methods-use-this*/

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const json5 = require("json5");
const debug = require("debug")("eslint:config-comment-parser");

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

/**
 * Ensure that a JSON-like string is trimmed and wrapped in curly braces.
 * @param {string} string The JSON-like string to format.
 * @returns {string} The formatted string.
 */
function formatAsJSON(string) {
    const trimmedString = string.trim();

    return `${trimmedString.startsWith("{") ? "" : "{"}${trimmedString}${trimmedString.endsWith("}") ? "" : "}"}`;
}

/**
 * Normalizes JSON-like string to valid JSON5.
 * We also allow for the following two exceptions:
 *     1. Allows non-quoted property names - e.g. "no-alert: 0"
 *     2. Allows for values to not be comma-separated - e.g. '"no-alert":0 semi:2'
 * @param {string} string The JSON-like string to normalize.
 * @returns {string} The normalized JSON5 string.
 */
function normalizeJSONlikeString(string) {
    return formatAsJSON(string.replace(/([-a-zA-Z0-9/]+\s*):/gu, "\"$1\":").replace(/(\]|[0-9])\s+(?=")/u, "$1,"));
}

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

/**
 * Object to parse ESLint configuration comments inside JavaScript files.
 * @name ConfigCommentParser
 */
module.exports = class ConfigCommentParser {

    /**
     * Parses a list of "name:string_value" or/and "name" options divided by comma or
     * whitespace. Used for "global" and "exported" comments.
     * @param {string} string The string to parse.
     * @param {Comment} comment The comment node which has the string.
     * @returns {Object} Result map object of names and string values, or null values if no value was provided
     */
    parseStringConfig(string, comment) {
        debug("Parsing String config");

        const items = {};

        // Collapse whitespace around `:` and `,` to make parsing easier
        const trimmedString = string.replace(/\s*([:,])\s*/gu, "$1");

        trimmedString.split(/\s|,+/u).forEach(name => {
            if (!name) {
                return;
            }

            // value defaults to null (if not provided), e.g: "foo" => ["foo", null]
            const [key, value = null] = name.split(":");

            items[key] = { value, comment };
        });
        return items;
    }

    /**
     * Parses a JSON-like config.
     * @param {string} string The string to parse.
     * @param {Object} location Start line and column of comments for potential error message.
     * @returns {({success: true, config: Object}|{success: false, error: Problem})} Result map object
     */
    parseJsonConfig(string, location) {
        debug("Parsing JSON config");

        const normalizedString = normalizeJSONlikeString(string);
        let items = {};

        try {
            items = json5.parse(normalizedString) || {};
        } catch (ex) {
            debug("Parsing of configuration failed.");

            return {
                success: false,
                error: {
                    ruleId: null,
                    fatal: true,
                    severity: 2,
                    message: `Failed to parse JSON from '${string.trim()}': ${ex.message}`,
                    line: location.start.line,
                    column: location.start.column + 1
                }
            };
        }

        return {
            success: true,
            config: items
        };
    }

    /**
     * Parses a config of values separated by comma.
     * @param {string} string The string to parse.
     * @returns {Object} Result map of values and true values
     */
    parseListConfig(string) {
        debug("Parsing list config");

        const items = {};

        // Collapse whitespace around commas
        string.replace(/\s*,\s*/gu, ",").split(/,+/u).forEach(name => {
            const trimmedName = name.trim();

            if (trimmedName) {
                items[trimmedName] = true;
            }
        });
        return items;
    }

};
