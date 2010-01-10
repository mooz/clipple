let EXPORTED_SYMBOLS = ["clip", "util"];

const Cc = Components.classes;
const Ci = Components.interfaces;

const prefRoot = "extensions.clipple";

// Clipboard Holder {{ ====================================================== //

let clip = {
    ring : [],

    get textLengthMax() {
        return util.getIntPref(util.getPrefKey("text_length_max"), -1);
    },

    get ringSizeMax() {
        return util.getIntPref(util.getPrefKey("number_of_clipboards"), 15);
    },

    get limitByTextLength() {
        return util.getBoolPref(util.getPrefKey("limit_by_text_length"), false);
    },

    pushText : function clip_pushText(aText) {
        let textLen = aText.length;

        let textLengthMax = clip.textLengthMax;
        let ringSizeMax   = clip.ringSizeMax;

        if (textLen && (!clip.limitByTextLength || textLen <= textLengthMax))
        {
            if (!clip.ring.length || clip.ring[0] !== aText)
            {
                if (clip.ring.length >= ringSizeMax)
                    clip.ring.pop();

                clip.ring.unshift(aText);
            }
        }
    }
};

// }} ======================================================================= //

// Utilities {{ ============================================================= //

let mPrefService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);

let util = {
    getPrefKey: function (aName) {
        return prefRoot + "." + aName;
    },

    setBoolPref: function (aPrefName, aPrefValue) {
        try
        {
            mPrefService.setBoolPref(aPrefName, aPrefValue);
        }
        catch (e) {}
    },

    getBoolPref: function (aPrefName, aDefVal) {
        try
        {
            return mPrefService.getBoolPref(aPrefName);
        }
        catch (e)
        {
            return typeof aDefVal === "undefined" ? null : aDefVal;
        }

        return null;
    },

    /**
     * set unicode string preference value
     * @param {string} aStringKey key of the preference
     * @param {string} aValue value of the preference specified by <b>aStringKey</b>
     */
    setUnicharPref: function (aPrefName, aPrefValue) {
        try
        {
            var str = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
            str.data = aPrefValue;
            mPrefService.setComplexValue(aPrefName, Ci.nsISupportsString, str);
        }
        catch (e) {}
    },

    /**
     * get unicode string preference value. when localized version is available,
     * that one is used.
     * @param {string} aStringKey key of the preference
     * @returns {string} fetched preference value specified by <b>aStringKey</b>
     */
    getUnicharPref: function (aStringKey) {
        return self.getLocalizedUnicharPref(aStringKey)
            || self.copyUnicharPref(aStringKey);
    },

    getLocalizedUnicharPref: function (aPrefName, aDefVal) {
        try
        {
            return mPrefService.getComplexValue(aPrefName, Ci.nsIPrefLocalizedString).data;
        }
        catch (e)
        {
            return typeof aDefVal === "undefined" ? null : aDefVal;
        }

        return null;        // quiet warnings
    },

    setIntPref: function (aPrefName, aPrefValue) {
        try
        {
            mPrefService.setIntPref(aPrefName, aPrefValue);
        }
        catch (e) {}
    },

    getIntPref: function (aPrefName, aDefVal) {
        try
        {
            return mPrefService.getIntPref(aPrefName);
        }
        catch (e)
        {
            return typeof aDefVal === "undefined" ? null : aDefVal;
        }

        return null;        // quiet warnings
    },

    /**
     * get localized string
     * @param {string} aStringKey string bundle key
     * @param {[string]} aReplacements arguments be to replace the %S in format
     * @returns {string} localized key on success or string key on failure
     */
    getLocaleString: function util_getLocaleString(aStringKey, aReplacements) {
        if (!util._stringBundle)
        {
            const bundleURI = "chrome://clipple/locale/clipple.properties";
            let   bundleSvc = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService);

            util._stringBundle = bundleSvc.createBundle(bundleURI);
        }

        try
        {
            if (!aReplacements)
                return util._stringBundle.GetStringFromName(aStringKey);
            else
                return util._stringBundle
                .formatStringFromName(aStringKey, aReplacements, aReplacements.length);
        }
        catch (e)
        {
            return aStringKey;
        }
    },

    /**
     * store <b>aText</b> to the system clipboard
     * @param {string} aText
     */
    clipboardSet: function util_clipboardSet(aText) {
        let ss = Cc['@mozilla.org/supports-string;1'].createInstance(Ci.nsISupportsString);
        if (!ss)
            return;

        let trans = Cc['@mozilla.org/widget/transferable;1'].createInstance(Ci.nsITransferable);
        if (!trans)
            return;

        let clipid = Ci.nsIClipboard;
        let clipboard   = Cc['@mozilla.org/widget/clipboard;1'].getService(clipid);
        if (!clipboard)
            return;

        ss.data = aText;
        trans.addDataFlavor('text/unicode');
        trans.setTransferData('text/unicode', ss, aText.length * 2);
        clipboard.setData(trans, null, clipid.kGlobalClipboard);
    },

    /**
     * Get content in the system clipboard
     * @throws Exception
     * @returns {string} content in the clipboard
     */
    clipboardGet: function util_clipboardGet() {
        try
        {
            let clipboard  = Cc["@mozilla.org/widget/clipboard;1"].getService(Ci.nsIClipboard);

            let trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);
            trans.addDataFlavor("text/unicode");

            clipboard.getData(trans, clipboard.kGlobalClipboard);

            let str       = {};
            let strLength = {};

            trans.getTransferData("text/unicode", str, strLength);
            if (str)
                str = str.value.QueryInterface(Ci.nsISupportsString);

            return str ? str.data.substring(0, strLength.value / 2) : null;
        }
        catch (e)
        {
            return null;
        }
    },

    insertText: function util_insertText(text, doc) {
        let command    = 'cmd_insertText';
        let controller = doc.commandDispatcher.getControllerForCommand(command);

        if (controller && controller.isCommandEnabled(command))
        {
            controller = controller.QueryInterface(Ci.nsICommandController);
            let params = Cc['@mozilla.org/embedcomp/command-params;1'];
            params = params.createInstance(Ci.nsICommandParams);
            params.setStringValue('state_data', text);
            controller.doCommandWithParams(command, params);
        }
    },

    format: function util_format(aFormat) {
        for (let i = 1; i < arguments.length; ++i)
            aFormat = aFormat.replace("%s", arguments[i]);
        return aFormat;
    },

    log: function util_log(aMsg) {
        let logs = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);

        try
        {
            logs.logStringMessage(aMsg);
        }
        catch (x)
        {
            logs.logStringMessage(x);
        }
    },

    message: function util_message() {
        util.log(util.format.apply(this, arguments));
    },

    visitLink: function (aURI, aBackGround) {
        var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
        var mainWindow = wm.getMostRecentWindow("navigator:browser");

        mainWindow.getBrowser().loadOneTab(aURI, null, null, null, aBackGround || false, false);
    }
};

// }} ======================================================================= //