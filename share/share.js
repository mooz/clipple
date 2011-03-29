let EXPORTED_SYMBOLS = ["clip", "util", "persist"];

const { interfaces : Ci,
        classes    : Cc,
        utils      : Cu } = Components.classes;

const prefRoot = "extensions.clipple";
const extensionName = "clipple";

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

    pushText: function clip_pushText(aText) {
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
    },

    sync: function clip_sync() {
        let text = util.clipboardGet();

        if (text)
        {
            if (!clip.ring.length || clip.ring[0] !== text)
                clip.pushText(text);
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
            let str = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
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
            let clipboard = Cc["@mozilla.org/widget/clipboard;1"].getService(Ci.nsIClipboard);

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

    clipboardClear: function util_clipboardClear() {
        try
        {
            util.clipboardSet("");
            // let clipboard = Cc["@mozilla.org/widget/clipboard;1"].getService(Ci.nsIClipboard);
            // clipboard.emptyClipboard(clipboard.kGlobalClipboard);
        }
        catch (x) {}
    },

    // Char code {{ ============================================================= //

    /**
     * convert given string's char code
     * original function from sage
     * @param {string} aString target string
     * @param {string} aCharCode aimed charcode
     * @returns {string} charcode converted string
     */
    convertCharCodeFrom: function (aString, aCharCode) {
        let UConvID = "@mozilla.org/intl/scriptableunicodeconverter";
        let UConvIF = Ci.nsIScriptableUnicodeConverter;
        let UConv   = Cc[UConvID].getService(UConvIF);

        let tmpString = "";
        try
        {
            UConv.charset = aCharCode;
            tmpString = UConv.ConvertFromUnicode(aString);
        }
        catch (e)
        {
            tmpString = null;
        }

        return tmpString;
    },

    // }} ======================================================================= //

    /**
     * get extension's special directory
     * original function from sage
     * @param {string} aProp special directory type
     * @returns {file} special directory
     */
    getSpecialDir: function (aProp) {
        return Cc['@mozilla.org/file/directory_service;1'].getService(Ci.nsIProperties)
            .get(aProp, Ci.nsILocalFile);
    },

    // IO {{ ==================================================================== //

    /**
     * Open file specified by <b>aPath</b> and returns it.
     * @param {string} aPath file path to be opened
     * @returns {nsILocalFile} opened file
     */
    openFile: function (aPath) {
        let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
        file.initWithPath(aPath);

        return file;
    },

    /**
     * Open text file, read its content, and returns it.
     * @param {string} aPath file path to be read
     * @param {string} aCharset specify text charset
     * @returns {string} text content of the file
     * @throws {}
     */
    readTextFile: function (aPath, aCharset) {
        let file = util.openFile(aPath);

        if (!file.exists())
            throw new Exception(aPath + " not found");

        let fileStream = Cc["@mozilla.org/network/file-input-stream;1"]
            .createInstance(Ci.nsIFileInputStream);
        fileStream.init(file, 1, 0, false);

        let converterStream = Cc["@mozilla.org/intl/converter-input-stream;1"]
            .createInstance(Ci.nsIConverterInputStream);

        if (!aCharset)
            aCharset = 'UTF-8';
        converterStream.init(fileStream, aCharset, fileStream.available(),
                             converterStream.DEFAULT_REPLACEMENT_CHARACTER);

        let out = {};
        converterStream.readString(fileStream.available(), out);

        converterStream.close();
        fileStream.close();

        return out.value;
    },

    /**
     * Write <b>aString</b> to the local file specified by <b>aPath</b>.
     * Overwrite confirmation will be ommitted if <b>aForce</b> is true.
     * "Don't show me again" checkbox value managed by <b>aCheckID</b>.
     * @param {string} aString
     * @param {string} aPath
     * @param {boolean} aForce
     * @param {string} aCheckID
     * @throws {}
     */
    writeTextFile: function (aString, aPath, aForce) {
        let file = util.openFile(aPath);

        if (file.exists() && !aForce &&
            util.confirm(util.getLocaleString("overWriteConfirmationTitle"),
                         util.getLocaleString("overWriteConfirmation", [aPath])))
        {
            throw new Exception("Canceled by user");
        }

        let fileStream = Cc["@mozilla.org/network/file-output-stream;1"]
            .createInstance(Ci.nsIFileOutputStream);
        fileStream.init(file, 0x02 | 0x08 | 0x20, 0644, false);

        let wrote = fileStream.write(aString, aString.length);
        if (wrote != aString.length)
        {
            throw new Exception("Failed to write whole string");
        }

        fileStream.close();
    },

    createDirectory: function (aLocalFile) {
        if (aLocalFile.exists() && !aLocalFile.isDirectory())
                aLocalFile.remove(false);

        if (!aLocalFile.exists())
            aLocalFile.create(Ci.nsIFile.DIRECTORY_TYPE, 0755);

        return aLocalFile;
    },

    getExtensionLocalDirectoryRoot: function () {
        const extName = extensionName;

        let extDir = util.getSpecialDir("ProfD");
        extDir.append(extName);

        return util.createDirectory(extDir);
    },

    getExtensionLocalDirectory: function (aDirName) {
        let localDir = util.getExtensionLocalDirectoryRoot();
        localDir.append(aDirName);

        return util.createDirectory(localDir);
    },

    // }} ======================================================================= //

    /**
     * window.confirm alternative.
     * This method can specify the window title while window.confirm can't.
     * @param {} aTitle
     * @param {} aMessage
     * @returns {}
     */
    confirm: function (aTitle, aMessage, aWindow) {
        let prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Ci.nsIPromptService);

        return prompts.confirm(aWindow || util.getWindow("navigator:browser"), aTitle, aMessage);
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

    getCallerGlobal: function getCallerGlobal() {
        try {
            let target = getCallerGlobal.caller.caller;
            return ("getGlobalForObject" in Cu) ? Cu.getGlobalForObject(target) : target.__parent__;
        } catch ([]) {
            return null;
        }
    },

    focusedElement: function util_focusedElement(doc) {
        doc = doc || util.getCallerGlobal().document;

        return doc.commandDispatcher.focusedElement
            || doc.commandDispatcher.focusedWindow.document.activeElement;
    },

    emulateKey: function util_emulateKey(type, key, doc) {
        doc = doc || util.getCallerGlobal().document;

        let ev = doc.createEvent('KeyboardEvent');
        ev.initKeyEvent(type,
                        true, true, null,
                        false, false, false, false,
                        key, 0);

        util.focusedElement(doc).dispatchEvent(ev);
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

    getWindow: function (aType) {
        let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
        return wm.getMostRecentWindow(aType);
    },

    visitLink: function (aURI, aBackGround) {
        let mainWindow = util.getWindow("navigator:browser");

        mainWindow.getBrowser().loadOneTab(aURI, null, null, null, aBackGround || false, false);
    }
};

// Persistent object {{ ===================================================== //

let json = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);

let persist = {
    getFile: function (aName) {
        let dir = util.getExtensionLocalDirectory('persistent');
        dir.append(aName.replace(/-/g, "_") + ".json");

        return dir;
    },

    preserve: function (aName, aObj) {
        let file    = persist.getFile(aName);
        let encoded = json.encode(aObj);

        util.writeTextFile(util.convertCharCodeFrom(encoded, "UTF-8"), file.path, true);
    },

    restore: function (aName) {
        let file = persist.getFile(aName);
        let str;

        try {
            str = util.readTextFile(file.path);
        } catch (x) {
            return null;
        }

        return json.decode(str);
    }
};

// }} ======================================================================= //

function hookApplicationQuit() {
    const topicId = 'quit-application-granted';

    function quitObserver() {
        this.register();
    }

    quitObserver.prototype = {
        observe: function(subject, topic, data) {
            if (util.getBoolPref(util.getPrefKey("save_session"), true))
                persist.preserve("clipboard", clip.ring);

            this.unregister();
        },

        register: function() {
            let observerService = Cc["@mozilla.org/observer-service;1"]
                .getService(Ci.nsIObserverService);
            observerService.addObserver(this, topicId, false);
        },

        unregister: function() {
            let observerService = Cc["@mozilla.org/observer-service;1"]
                .getService(Ci.nsIObserverService);
            observerService.removeObserver(this, topicId);
        }
    };

    new quitObserver();
}

// Initialization {{ ======================================================== //

function init() {
    hookApplicationQuit();

    if (util.getBoolPref(util.getPrefKey("save_session"), true))
    {
        clip.ring = persist.restore("clipboard") || [];
    }

    clip.sync();
}

// }} ======================================================================= //

init();