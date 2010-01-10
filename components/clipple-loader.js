/**
 * @fileOverview
 * @name clipple-loader.js
 * @author mooz <stillpedant@gmail.com>
 * @license The MIT License
 */

const Cc = Components.classes;
const Ci = Components.interfaces;
const prefService = Cc['@mozilla.org/preferences;1'].getService(Ci.nsIPrefBranch);

const CID = Components.ID('{2949016c-3e8c-4726-988c-6bd2c90f3e8e}');
const CONTRACT_ID = '@github.com/mooz/clipple/loader;1';
const CLASS_NAME = 'clipple Loader';

const STARTUP_TOPIC = 'app-startup';

function message(aMsg) {
    let logs = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);

    try
    {
        logs.logStringMessage(aMsg);
    }
    catch (x)
    {
        logs.logStringMessage(x);
    }
}

function list(aObject) {
    if (!aObject)
    {
        message("listProperty: undefined object passed");
    }
    else
    {
        try
        {
            for (let property in aObject)
                message("[" + property + "] = " + aObject[property] );
        }
        catch (x)
        {
            message(x);
        }
    }
}

let js = Cc["@mozilla.org/moz/jssubscript-loader;1"]
    .getService(Ci.mozIJSSubScriptLoader);

function loadModule(aName, aContext) {
    js.loadSubScript("chrome://clipple/content/" + aName + ".js", aContext);
}

// ====================================================================== //

function ClippleLoader() {
}

ClippleLoader.prototype = {
    observe: function (aSubject, aTopic, aData) {
        switch (aTopic)
        {
        case STARTUP_TOPIC:
            Cc['@mozilla.org/embedcomp/window-watcher;1'].getService(Ci.nsIWindowWatcher).registerNotification(this);
            break;
        case 'domwindowopened':
            aSubject.addEventListener('load', this, false);
            break;
        }
    },

    handleEvent: function (aEvent) {
        aEvent.currentTarget.removeEventListener('load', this, false);

        let doc = aEvent.target;
        let win = doc.defaultView;

        loadModule("clipple", win);
    },

    QueryInterface: function (aIID) {
        if (!aIID.equals(Ci.nsIDOMEventListener) &&
            !aIID.equals(Ci.nsIObserver) &&
            !aIID.equals(Ci.nsISupports)) {
            throw Components.results.NS_ERROR_NO_INTERFACE;
        }
        return this;
    }
};

var module = {
    registerSelf: function (aCompMgr, aFileSpec, aLocation, aType) {
        aCompMgr = aCompMgr.QueryInterface(Ci.nsIComponentRegistrar);
        aCompMgr.registerFactoryLocation(CID,
                                         CLASS_NAME,
                                         CONTRACT_ID,
                                         aFileSpec,
                                         aLocation,
                                         aType);
        var catMgr = Cc['@mozilla.org/categorymanager;1'].getService(Ci.nsICategoryManager);
        catMgr.addCategoryEntry(STARTUP_TOPIC, CLASS_NAME, CONTRACT_ID, true, true, null);
    },

    unregisterSelf: function (aCompMgr, aLocation, aType) {
        aCompMgr = aCompMgr.QueryInterface(Ci.nsIComponentRegistrar);
        aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);
    },

    getClassObject: function (aCompMgr, aCID, aIID) {
        if (!aIID.equals(Ci.nsIFactory))
        {
            throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
        }

        if (!aCID.equals(CID))
        {
            throw Components.results.NS_ERROR_NO_INTERFACE;
        }

        return this.factory;
    },

    canUnload: function (aCompMgr) {
        return true;
    },

    factory: {
        createInstance: function (aOuter, aIID) {
            if (aOuter != null)
            {
                throw Components.results.NS_ERROR_NO_AGGREGATION;
            }
            return (new ClippleLoader()).QueryInterface(aIID);
        }
    }
};

function NSGetModule(aCompMgr, aFileSpec) {
    return module;
}
