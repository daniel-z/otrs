// --
// Copyright (C) 2001-2016 OTRS AG, http://otrs.com/
// --
// This software comes with ABSOLUTELY NO WARRANTY. For details, see
// the enclosed file COPYING for license information (AGPL). If you
// did not receive this file, see http://www.gnu.org/licenses/agpl.txt.
// --
// nofilter(TidyAll::Plugin::OTRS::JavaScript::UnloadEvent)

"use strict";

var Core = Core || {};

/**
 * @namespace Core.App
 * @memberof Core
 * @author OTRS AG
 * @description
 *      This namespace contains main app functionalities.
 */
Core.App = (function (TargetNS) {

    if (!Core.Debug.CheckDependency('Core.App', 'Core.Exception', 'Core.Exception')) {
        return false;
    }

    if (!Core.Debug.CheckDependency('Core.App', 'Core.Config', 'Core.Config')) {
        return false;
    }

    /**
     * @private
     * @name SerializeData
     * @memberof Core.App
     * @function
     * @returns {String} Query string of the data.
     * @param {Object} Data - The data that should be converted.
     * @description
     *      Converts a given hash into a query string.
     */
    function SerializeData(Data) {
        var QueryString = '';
        $.each(Data, function (Key, Value) {
            QueryString += encodeURIComponent(Key) + '=' + encodeURIComponent(Value) + ';';
        });
        return QueryString;
    }

    /**
     * @name BindWindowUnloadEvent
     * @memberof Core.App
     * @function
     * @param {String} Namespace - Namespace for which the event should be bound.
     * @param {Function} CallbackFunction - Function which should be executed once the event is fired.
     * @description
     *      Binds a crossbrowser compatible unload event to the window object
     */
    TargetNS.BindWindowUnloadEvent = function (Namespace, CallbackFunction) {

        if (!$.isFunction(CallbackFunction)) {
            return;
        }

        // we need a special handling for all IE's before 11, because these
        // don't know the pagehide event but support the non-standard
        // unload event.
        if ($.browser.msie && parseInt($.browser.version, 10) < 11) {
            $(window).on('unload.' + Namespace, function () {
                CallbackFunction();
            });
        }
        else {
            $(window).on('pagehide.' + Namespace, function () {
                CallbackFunction();
            });
        }
    };

    /**
     * @name UnbindWindowUnloadEvent
     * @memberof Core.App
     * @function
     * @param {String} Namespace - Namespace for which the event should be removed.
     * @description
     *      Unbinds a crossbrowser compatible unload event to the window object
     */
    TargetNS.UnbindWindowUnloadEvent = function (Namespace) {
        $(window).off('unload.' + Namespace);
        $(window).off('pagehide.' + Namespace);
    };

    /**
     * @name GetSessionInformation
     * @memberof Core.App
     * @function
     * @returns {Object} Hash with session data, if needed.
     * @description
     *      Collects session data in a hash if available.
     */
    TargetNS.GetSessionInformation = function () {
        var Data = {};
        if (!Core.Config.Get('SessionIDCookie')) {
            Data[Core.Config.Get('SessionName')] = Core.Config.Get('SessionID');
            Data[Core.Config.Get('CustomerPanelSessionName')] = Core.Config.Get('SessionID');
        }
        Data.ChallengeToken = Core.Config.Get('ChallengeToken');
        return Data;
    };

    /**
     * @name BrowserCheck
     * @memberof Core.App
     * @function
     * @returns {Boolean} True if the used browser is *not* on the black list.
     * @param {String} Interface - The interface we are in (Agent or Customer)
     * @description
     *      Checks if the used browser is not on the OTRS browser blacklist
     *      of the agent interface.
     */
    TargetNS.BrowserCheck = function (Interface) {
        var AppropriateBrowser = true,
            BrowserBlackList = Core.Config.Get('BrowserBlackList::' + Interface);
        if (typeof BrowserBlackList !== 'undefined') {
            $.each(BrowserBlackList, function (Key, Value) {
                if ($.isFunction(Value)) {
                    if (Value()) {
                        AppropriateBrowser = false;
                    }
                }
            });
            return AppropriateBrowser;
        }
        alert(Core.Language.Translate('Error: Browser Check failed!'));
    };

    /**
     * @name BrowserCheckIECompatibilityMode
     * @memberof Core.App
     * @function
     * @returns {Boolean} True if the used browser is IE in Compatibility Mode.
     * @description
     *      Checks if the used browser is IE in Compatibility Mode.
     *      IE11 in Compatibility Mode is not recognized.
     */
    TargetNS.BrowserCheckIECompatibilityMode = function () {
        var IE7 = ($.browser.msie && $.browser.version === '7.0');

        // if not IE7, we cannot be in compatibilty mode
        if (!IE7) {
            return false;
        }

        // IE8,9,10,11 in Compatibility Mode will claim to be IE7.
        // See also http://msdn.microsoft.com/en-us/library/ms537503%28v=VS.85%29.aspx
        if (
                navigator &&
                navigator.userAgent &&
                (
                    navigator.userAgent.match(/Trident\/4.0/) ||
                    navigator.userAgent.match(/Trident\/5.0/) ||
                    navigator.userAgent.match(/Trident\/6.0/) ||
                    navigator.userAgent.match(/Trident\/7.0/)
                )
            ) {

            return true;
        }

        // if IE7 but no Trident 4-7 is found, we are in a real IE7
        return false;
    };

    /**
     * @name Ready
     * @memberof Core.App
     * @function
     * @param {Function} Callback - The callback function to be executed.
     * @description
     *      This functions callback is executed if all elements and files of this page are loaded.
     */
    TargetNS.Ready = function (Callback) {
        if ($.isFunction(Callback)) {
            $(document).ready(function () {
                var Trace;
                try {
                    Callback();
                }
                catch (Error) {
                    Trace = printStackTrace({e: Error, guess: true}).join('\n');
                    Core.Exception.HandleFinalError(Error, Trace);
                }
            });
        }
        else {
            Core.Exception.ShowError('No function parameter given in Core.App.Ready', 'TypeError');
        }
    };

    /**
     * @name InternalRedirect
     * @memberof Core.App
     * @function
     * @param {Object} Data - The query data (like: {Action: 'MyAction', Subaction: 'Add'})
     * @description
     *      Performs an internal redirect based on the given data parameters.
     *      If needed, session information like SessionID and ChallengeToken are appended.
     */
    TargetNS.InternalRedirect = function (Data) {
        var URL;
        URL = Core.Config.Get('Baselink') + SerializeData(Data);
        URL += SerializeData(TargetNS.GetSessionInformation());
        window.location.href = URL;
    };

    /**
     * @name EscapeSelector
     * @memberof Core.App
     * @function
     * @returns {String} The escaped selector.
     * @param {String} Selector - The original selector (e.g. ID, class, etc.).
     * @description
     *      Escapes the special characters (. :) in the given jQuery Selector
     *      jQ does not allow the usage of dot or colon in ID or class names
     *      An overview of special characters that should be quoted can be found here:
     *      https://api.jquery.com/category/selectors/
     */
    TargetNS.EscapeSelector = function (Selector) {
        if (Selector && Selector.length) {
            return Selector.replace(/( |#|:|\.|\[|\]|@|!|"|\$|%|&|<|=|>|'|\(|\)|\*|\+|,|\?|\/|\;|\\|\^|{|}|`|\||~)/g, '\\$1');
        }
        return '';
    };

    /**
     * @name EscapeHTML
     * @memberof Core.App
     * @function
     * @returns {String} The escaped string.
     * @param {String} StringToEscape - The string which is supposed to be escaped.
     * @description
     *      Escapes the special HTML characters ( < > & ) in supplied string to their
     *      corresponding entities.
     */
    TargetNS.EscapeHTML = function (StringToEscape) {
        var HTMLEntities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        };
        return StringToEscape.replace(/[&<>]/g, function(Entity) {
            return HTMLEntities[Entity] || Entity;
        });
    };

    /**
     * @name Publish
     * @memberof Core.App
     * @function
     * @param {String} Topic - The channel to publish on
     * @param {Array} Args - The data to publish. Each array item is converted into an ordered arguments on the subscribed functions.
     * @description
     *      Publish some data on a named topic.
     */
    TargetNS.Publish = function (Topic, Args) {
        $.publish(Topic, Args);
    };

    /**
     * @name Subscribe
     * @memberof Core.App
     * @function
     * @returns {Array} A handle which can be used to unsubscribe this particular subscription
     * @param {String} Topic - The channel to subscribe to
     * @param {Function} Callback - The handler event. Anytime something is published on a subscribed channel, the callback will be called with the published array as ordered arguments.
     * @description
     *      Register a callback on a named topic.
     */
    TargetNS.Subscribe = function (Topic, Callback) {
        return $.subscribe(Topic, Callback);
    };

    /**
     * @name Unsubscribe
     * @memberof Core.App
     * @function
     * @param {Array} Handle - The return value from a $.subscribe call
     * @description
     *      Disconnect a subscribed function for a topic.
     */
    TargetNS.Unsubscribe = function (Handle) {
        $.unsubscribe(Handle);
    };

    /**
     * @name Init
     * @memberof Core.App
     * @function
     * @description
     *      This function initializes the special functions.
     */
    TargetNS.Init = function () {
        var RefreshSeconds = parseInt(Core.Config.Get('Refresh'), 10) || 0;

        if (RefreshSeconds !== 0) {
            window.setInterval(function() {

                // If there are any open overlay dialogs, don't refresh
                if ($('.Dialog:visible').length) {
                    return;
                }

                // If there are open child popup windows, don't refresh
                if (Core && Core.UI && Core.UI.Popup && Core.UI.Popup.HasOpenPopups()) {
                    return;
                }
                // Now we can reload
                window.location.reload();
            }, RefreshSeconds * 1000);
        }

        // Initialize return to previous page function.
        TargetNS.ReturnToPreviousPage();
    };

    /**
     * @name ReturnToPreviousPage
     * @memberof Core.App
     * @function
     * @description
     *      This function bind on click event to return on previous page.
     */
    TargetNS.ReturnToPreviousPage = function () {

        $('.ReturnToPreviousPage').on('click', function () {

            // Check if an older history entry is available
            if (history.length > 1) {
            history.back();
            return false;
            }

            // If we're in a popup window, close it
            if (Core.UI.Popup.CurrentIsPopupWindow()) {
                Core.UI.Popup.ClosePopup();
                return false;
            }

            // Normal window, no history: no action possible
            return false;
        });
    };

    Core.Init.RegisterNamespace(TargetNS, 'APP_MODULE');

    return TargetNS;
}(Core.App || {}));
