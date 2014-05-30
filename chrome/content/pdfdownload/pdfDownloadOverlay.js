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
   - The Original Code is "PDFDownload".
   -
   - The Initial Developer of the Original Code is Denis Remondini.
   - Portions created by the Initial Developer are Copyright (C) 2005 Denis Remondini.  
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



var sltPrefs = Components.classes['@mozilla.org/preferences-service;1']
               .getService(Components.interfaces.nsIPrefBranch);

var fileCID  = '@mozilla.org/file/local;1';
var fileIID  = Components.interfaces.nsILocalFile;

// register the event listener for every link present inside the webpage
function registerListener(){
	var links = document.commandDispatcher.focusedWindow.document.getElementsByTagNameNS("*", "a");
	var urls = new Array();
	
	if (links && links.length) {
		var len = links.length;
		
		for (var i = 0; i < len; ++i) {
			links[i].addEventListener("click",checkUrl,false);
		}
		
	}
}

// check if the linked file is a pdf file. In that case, ask to the user what he wants to do with it.
function checkUrl(event) {
   var url = event.currentTarget.href;
   var ext = url.substr(url.lastIndexOf(".")+1,url.length);
   if (ext.toLowerCase() == "pdf") {
	if (confirm("The file you are going to view is a PDF file.\nClick OK to download it!")) {
		savelink(url);
	} else {
		var browser = getBrowser();
		var tab = browser.addTab(url);
		browser.selectedTab = tab;
	}
	event.stopPropagation();
	event.preventDefault();
   }
   
}

// save the linked file 
function savelink(url) {

	var fname = url.substring(url.lastIndexOf('/') + 1);
	var folder;
	var file  = Components.classes[fileCID].createInstance(fileIID);
	try {
		folder = sltPrefs.getCharPref('browser.download.defaultFolder');
	}
	catch(e) {
		// nothing to do
	}
	file.initWithPath(folder);
	var nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"]
      	  .createInstance(nsIFilePicker);
	fp.init(window, "Save PDF File", nsIFilePicker.modeSave);
	fp.appendFilters(Components.interfaces.nsIFilePicker.filterAll);
      fp.defaultString = fname;
	fp.displayDirectory = file;

	var res = fp.show();
	if ((res == Components.interfaces.nsIFilePicker.returnOK) || (res == Components.interfaces.nsIFilePicker.returnReplace)) {
          file = fp.file;
      } else {
          return;
      }
	
	saveURL(url, file, null, false, true);
}



function init() {
	window._content.addEventListener('load', registerListener, true);
}

// do the init on load
window.addEventListener("load",init, true);