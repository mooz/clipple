/**
 * @fileOverview Preference
 * @name preference.js
 * @author mooz <stillpedant@gmail.com>
 * @license The MIT License
 */

let clipplePreference =
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

         // Public {{ ================================================================ //

         let self = {
             modules: {

             },

             onLimitByTextLengthChange: function () {
                 let limitByTextLengthBox   = $("limit-by-text-length-box");
                 let limitByTextLengthCheck = $("limit-by-text-length-check");

                 for (let [, elem] in Iterator(limitByTextLengthBox.childNodes))
                 {
                     if (limitByTextLengthCheck.checked)
                         elem.removeAttribute("disabled");
                     else
                         elem.setAttribute("disabled", "true");
                 }
             },

             onGeneralPaneLoad: function () {
                 $("limit-by-text-length-check").checked = clip.limitByTextLength;

                 self.onLimitByTextLengthChange();
             },

             onFinish: function () {
                 return true;
             }
         };

         // }} ======================================================================= //

         init();

         return self;
     })();
