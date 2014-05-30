/***** BEGIN LICENSE BLOCK *****
   - Version: MPL 1.1/GPL 2.0/LGPL 2.1
   -
   - The contents of this file are subject to the Mozilla Public License Version
   - 1.1 (the "License"); you may not use this file except in compliance with
   - the License. You may obtain a copy of the License at
   - http://www.mozilla.org/MPL/
   -
   - Software distributed under the License is distributed on an "AS IS" basis,
   - WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
   - for the specific language governing rights and limitations under the
   - License.
   -
   - The Original Code is "PDF Download".
   -
   - The Initial Developer of the Original Code is Denis Remondini.
   - Portions created by the Initial Developer are Copyright (C) 2005-2006 Denis Remondini.  
   - All Rights Reserved.
   -
   - Contributor(s): Denis Remondini <denistn AT gmail DOT com>
   -
   - Alternatively, the contents of this file may be used under the terms of
   - either the GNU General Public License Version 2 or later (the "GPL"), or
   - the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
   - in which case the provisions of the GPL or the LGPL are applicable instead
   - of those above. If you wish to allow use of your version of this file only
   - under the terms of either the GPL or the LGPL, and not to allow others to
   - use your version of this file under the terms of the MPL, indicate your
   - decision by deleting the provisions above and replace them with the notice
   - and other provisions required by the LGPL or the GPL. If you do not delete
   - the provisions above, a recipient may use your version of this file under
   - the terms of any one of the MPL, the GPL or the LGPL.
   -
   - 
***** END LICENSE BLOCK *****/

var PdfDownloadShared = function() {}


PdfDownloadShared.prototype.openURL = function(aURL) {
	var navWindow;
	try {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
		navWindow = wm.getMostRecentWindow("navigator:browser");
	}	catch (ex) {
	}

	if (navWindow) {
		if ("delayedOpenTab" in navWindow)
			navWindow.delayedOpenTab(aURL);
		else if ("loadURI" in navWindow)
			navWindow.loadURI(aURL);
		else
			navWindow.content.location.href = aURL;
	}	else {
		var ass = Components.classes["@mozilla.org/appshell/appShellService;1"].getService(Components.interfaces.nsIAppShellService);
		w = ass.hiddenDOMWindow;
		w.openDialog(getBrowserURL(), "_blank", "chrome,all,dialog=no", aURL);
	}
}

PdfDownloadShared.prototype.help = function(s) {
	var url = "http://www.rabotat.org/firefox/";
	if (s) {
		url += "#" + s;
	}
	pdfDownloadShared.openURL(url);
}

// create the object
const pdfDownloadShared = new PdfDownloadShared();

