/**
 * @fileOverview Clipple - Provides multiple clipboards to mozilla apps
 * @name clipple.js
 * @author mooz <stillpedant@gmail.com>
 * @license The MIT License
 */

let Clipple = (function () {
    // Private {{ =============================================================== //

    const Cc = Components.classes;
    const Ci = Components.interfaces;

    let _windowType = window.document.documentElement.getAttribute("windowtype");
    let _ignoreNextCommand = false;

    let clip, util;

    const $D = {
        elem: function (name, attrs, props) {
            let elem = document.createElement(name);

            if (attrs)
                for (let [k, v] in Iterator(attrs))
                    elem.setAttribute(k, v);

            if (props)
                for (let [k, v] in Iterator(props))
                    elem[k] = v;

            return elem;
        }
    };

    function init() {
        // load modules
        try
        {
            Components.utils.import("resource://clipple-share/share.js", self.modules);

            clip = self.modules.clip;
            util = self.modules.util;
        }
        catch (x)
        {
            return;
        }

        // arrange information of this extension
        let extmanager = Cc["@mozilla.org/extensions/manager;1"].createInstance(Ci.nsIExtensionManager);
        self.extInfo = extmanager.getItemForID(self.id);

        // for window which does not have goDoCommand()
        if (typeof goDoCommand === 'undefined')
        {
            window.goDoCommand = function (aCommand)
            {
                try
                {
                    let controller = top.document.commandDispatcher.getControllerForCommand(aCommand);
                    if (controller && controller.isCommandEnabled(aCommand))
                        controller.doCommand(aCommand);
                }
                catch (e)
                {
                    util.message("An error %s occurred executing the %s command", e, aCommand);
                }
            };
        }

        // Main window
        if (!self.isThunderbird && _windowType === "navigator:browser")
        {
            hookContentAreaContextMenu();

            // hook location bar copy / cut event
            try
            {
                let controller        = document.getElementById("urlbar")._copyCutController;
                let originalDoCommand = controller.doCommand;

                controller.doCommand = function (aCommand) {
                    originalDoCommand.apply(this, arguments);
                    self.copyCommandCalled();
                };
            }
            catch (x)
            {
                util.message(x);
            }
        }

        // hook contextmenu event
        hookGlobalContextMenu();

        // hook copy event
        hookCopyCommand();
    }

    // }} ======================================================================= //

    function hookCopyCommand() {
        window.addEventListener("copy", function () {
            // we need to insert delay before calling this function
            setTimeout(function () { self.copyCommandCalled(); }, 0);
        }, false);
    }

    const clipplePasteMultipleMenuClass = "clipple-paste-multiple-menu";
    const clipplePasteMultipleItemClass = "clipple-paste-multiple-item";

    function createPopup() {
        let popup = document.createElement("menupopup");
        popup.setAttribute("class", clipplePasteMultipleMenuClass);

        for (let [i, text] in Iterator(clip.ring))
        {
            let menuItem = document.createElement("menuitem");
            menuItem.setAttribute("label", (i + 1) + ". " + text);
            menuItem.setAttribute("value", text);
            menuItem.setAttribute("tooltiptext", text);
            menuItem.setAttribute("class", clipplePasteMultipleItemClass);

            popup.appendChild(menuItem);
        }

        return popup;
    }

    function updateMenu(aMenu) {
        let popup = createPopup();

        if (aMenu.firstChild)
            aMenu.replaceChild(popup, aMenu.firstChild);
        else
            aMenu.appendChild(popup);
    }

    function implantClipple(aContextMenu, aOnPopUp) {
        const pasteIcon = "chrome://clipple/skin/icon16/paste.png";

        let items = Array.slice(aContextMenu.getElementsByTagName("menuitem"), 0)
            .concat(Array.slice(aContextMenu.getElementsByTagName("xul:menuitem"), 0));

        let itemPaste;

        items.some(function (elem) {
            if (typeof elem.getAttribute === "function" &&
                (elem.getAttribute("command") === "cmd_paste" ||
                 elem.getAttribute("cmd")     === "cmd_paste"))
            {
                itemPaste = elem;
                return true;
            }

            return false;
        });

        let menu = document.createElement("menu");
        menu.setAttribute("label", util.getLocaleString("clipplePaste"));
        menu.setAttribute("accesskey", "l");
        menu.setAttribute("class", "menu-iconic");
        menu.setAttribute("image", pasteIcon);

        if (itemPaste)
            itemPaste.parentNode.insertBefore(menu, itemPaste.nextSibling);
        else
            aContextMenu.appendChild(menu);

        menu.addEventListener("command", function (ev) {
            let text = ev.target.getAttribute("value");
            if (text)
                util.insertText(text, document);
        }, false);

        aContextMenu.addEventListener("popupshowing", aOnPopUp, false);

        return menu;
    }

    function climbNodes(aNode, aMaxStairs, aProsess) {
        for (let i = 0; i < aMaxStairs; ++i) if (aNode) {
            aNode = aNode.parentNode;
            if (aProsess(aNode))
                return aNode;
        }

        return null;
    }

    function hookGlobalContextMenu() {
        document.addEventListener(
            "contextmenu",
            function (ev) {
                let target = document.commandDispatcher.focusedElement;

                function hackInputBoxContextMenu() {
                    let inputBox = climbNodes(target, 4, function (node)
                                              ((node.getAttribute("class") || "").indexOf("textbox-input-box") >= 0));

                    let contextMenu = document.getAnonymousElementByAttribute(
                        inputBox,
                        "anonid", "input-box-contextmenu"
                    );

                    if (contextMenu && !contextMenu.__clippleHooked__)
                    {
                        let itemPasteMultiple;

                        function onGlobalPopup(aEvent) {
                            if (aEvent)
                            {
                                let elem = aEvent.target;

                                if ((elem.getAttribute("class") || "").indexOf(clipplePasteMultipleMenuClass) >= 0)
                                    return;
                            }

                            clip.sync();

                            if (!clip.ring.length)
                            {
                                itemPasteMultiple.setAttribute("disabled", true);
                            }
                            else
                            {
                                itemPasteMultiple.removeAttribute("disabled");
                                updateMenu(itemPasteMultiple);
                            }
                        }

                        itemPasteMultiple = implantClipple(contextMenu, onGlobalPopup);
                        contextMenu.__clippleHooked__ = true;

                        onGlobalPopup();
                    }
                }

                if (target)
                    setTimeout(hackInputBoxContextMenu, 10);
            }, true);
    }

    function hookContentAreaContextMenu() {
        let itemPasteMultiple;

        function onContentPopup(aEvent) {
            if (aEvent.target.localName === "menupopup")
                return;

            if (!gContextMenu.onTextInput)
            {
                itemPasteMultiple.hidden = true;
            }
            else
            {
                clip.sync();

                if (!clip.ring.length)
                {
                    itemPasteMultiple.setAttribute("disabled", true);
                }
                else
                {
                    itemPasteMultiple.removeAttribute("disabled");
                    updateMenu(itemPasteMultiple);
                }

                itemPasteMultiple.hidden = false;
            }
        }

        let contextMenu = document.getElementById("contentAreaContextMenu");
        itemPasteMultiple = implantClipple(contextMenu, onContentPopup);
    }

    function isPassword(aElem) {
        if (!aElem)
            return false;

        return (aElem.localName.toLowerCase() === "input" &&
                "getAttribute" in aElem &&
                aElem.getAttribute("type") === "password");
    }

    // }} ======================================================================= //

    // Public {{ ================================================================ //

    let self = {
        modules: {

        },

        get version() {
            return _extInfo.version;
        },

        get id() {
            return "clipple@mooz.github.com";
        },

        get isThunderbird() {
            return !!window.navigator.userAgent.match(/thunderbird/i);
        },

        pasteMultiple: function (ev) {
            let popup = createPopup();
            let elem  = (ev || {target : document.commandDispatcher.focusedElement}).target;

            if (elem)
            {
                document.documentElement.appendChild(popup);

                popup.addEventListener("command", function (ev) {
                    let text = ev.target.getAttribute("value");
                    if (text)
                        util.insertText(text, document);

                    popup.removeEventListener("command", arguments.callee, false);
                }, false);

                popup.addEventListener("popuphidden", function (ev) {
                    popup.removeEventListener("popuphidden", arguments.callee, false);
                    document.documentElement.removeChild(popup);
                }, false);

                popup.openPopup(elem, "after_end", 0, 0, true);
            }
        },

        copyCommandCalled: function (ev) {
            let text = util.clipboardGet() || "";
            let elem = document.commandDispatcher.focusedElement;

            if (!isPassword(elem))
            {
                clip.pushText(text);
            }
            else
            {
                // password
                if (!util.getBoolPref(util.getPrefKey("ignore_password"), true)
                    && elem.value)
                {
                    try
                    {
                        let [start, end] = [elem.selectionStart, elem.selectionEnd];

                        elem.setAttribute("type", "text");
                        elem.focus();

                        let text = elem.value.toString().substring(start, end);

                        util.clipboardSet(text);
                        clip.pushText(text);
                    }
                    catch (x)
                    {
                        util.message(x);
                    }
                    finally
                    {
                        elem.setAttribute("type", "password");
                        elem.focus();
                    }
                }
                else
                {
                    util.clipboardSet(clip.ring[0] || "");
                }
            }
        },

        /**
         * Open preference dialog
         */
        openPreference: function (aForce) {
            let openedWindow = util.getWindow('Clipple:Preference');

            if (openedWindow && !aForce)
            {
                openedWindow.focus();
            }
            else
            {
                window.openDialog("chrome://clipple/content/preference.xul",
                                  "Preferences",
                                  "chrome,titlebar,toolbar,centerscreen,resizable,scrollbars");
            }
        }
    };

    // }} ======================================================================= //

    init();

    return self;
})();
