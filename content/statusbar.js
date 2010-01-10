/**
 * @fileOverview StatusBar
 * @name statusbar.js
 * @author mooz <stillpedant@gmail.com>
 * @license The MIT License
 */

let clippleStatusbar =
    (function () {
         // Private {{ =============================================================== //

         let clip, util;

         function init() {
             try
             {
                 Components.utils.import("resource://clipple-share/share.js", self.modules);

                 clip = self.modules.clip;
                 util = self.modules.util;
             }
             catch (x) {}
         }

         function $(aId) {
             return document.getElementById(aId);
         }

         function removeAllChilds(aElement) {
             while (aElement.hasChildNodes())
                 aElement.removeChild(aElement.firstChild);
         }

         function updateActionMenuPopup(aPopup, aCommandString) {
             for (let [i, text] in Iterator(clip.ring))
             {
                 let menuItem;
                 menuItem = document.createElement("menuitem");

                 menuItem.setAttribute("label", (i + 1) + ". " + text);
                 menuItem.setAttribute("oncommand", util.format(aCommandString, i));
                 menuItem.setAttribute("tooltiptext", text);

                 aPopup.appendChild(menuItem);
             }
         }

         function updateDeleteMenuPopup(aPopup) {
             let deleteAll = $("clipple-statusbar-menu-delete-all");

             Array.slice(aPopup.childNodes, 0).forEach(
                 function (elem) {
                     if (elem.localName !== "menuseparator" && elem !== deleteAll)
                         aPopup.removeChild(elem);
                 });

             updateActionMenuPopup(aPopup, "clippleStatusbar.removeNthItem(%s);");
         }

         function truncate(aString, aLen) {
             const len = aLen || 100;
             let truncated = aString.substring(0, len);
             return truncated + (aString.length !== truncated.length ? "..." : "");
         }

         // Display {{ =============================================================== //

         const TIMEOUT_NORMAL = 2000;

         let msgTimeOut;

         function echo(aMsg, aTime) {
             let statusBar = $('statusbar-display');

             if (!statusBar) return;

             if (msgTimeOut)
             {
                 clearTimeout(msgTimeOut);
                 msgTimeOut = null;
             }

             statusBar.label = aMsg;

             if (aTime)
                 msgTimeOut = setTimeout(function () { echo('', 0); }, aTime);
         }

         // }} ======================================================================= //

         // Public {{ ================================================================ //

         let self = {
             modules: {

             },

             raiseNthItem: function (n) {
                 if (n >= 1)
                 {
                     let item = clip.ring.splice(n, 1)[0];
                     clip.ring.unshift(item);
                     util.clipboardSet(item);
                 }
             },

             removeAllItem: function () {
                 if (util.confirm(util.getLocaleString("removeItem"),
                                  util.getLocaleString("confirmRemoveAllItem"), window))
                 {
                     clip.ring = [];
                     util.clipboardClear();
                     echo(util.getLocaleString("allItemRemoved"), TIMEOUT_NORMAL);
                 }
             },

             removeNthItem: function (n) {
                 util.message(n);

                 if (util.confirm(util.getLocaleString("removeItem"),
                                  util.getLocaleString("confirmRemoveItem") + "\n\n" + truncate(clip.ring[n]),
                                  window))
                 {
                     clip.ring.splice(n, 1);
                     if (n === 0)
                         util.clipboardClear();
                     echo(util.getLocaleString("itemRemoved"), TIMEOUT_NORMAL);
                 }
             },

             onStatusBarMenuShowing: function (ev) {
                 clip.sync();

                 let menus = [
                     $("clipple-statusbar-menu-raise-menu"),
                     $("clipple-statusbar-menu-delete-menu")
                 ];

                 let disabled = (clip.ring.length === 0);

                 menus.forEach(function (elem) {
                                   if (disabled)
                                   {
                                       elem.setAttribute("disabled", true);
                                       elem.setAttribute("tooltiptext", util.getLocaleString("clipboardEmpty"));
                                   }
                                   else
                                   {
                                       elem.removeAttribute("disabled");
                                       elem.removeAttribute("tooltiptext");
                                   }
                               });
             },

             onDeleteMenuShowing: function (ev) {
                 let popup = $("clipple-statusbar-menu-delete-popup");
                 updateDeleteMenuPopup(popup);
             },

             onRaiseMenuShowing: function (ev) {
                 let popup = $("clipple-statusbar-menu-raise-popup");
                 removeAllChilds(popup);
                 updateActionMenuPopup(popup, "clippleStatusbar.raiseNthItem(%s)");
             }
         };

         // }} ======================================================================= //

         init();

         return self;
     })();
