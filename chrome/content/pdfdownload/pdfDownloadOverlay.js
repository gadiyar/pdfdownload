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



// save the linked file 
function savelink(url) {

	saveURL(url, null, null, true, true, null);	
}

// handle the click event
function mouseClick(aEvent) {

    if (!aEvent)
      return;

    // if right click, we do not do anything
    if (aEvent.button == 2)
	return;
      
    if (aEvent.target)
      var targ = aEvent.originalTarget;
  
    /* BEGIN of the code taken by an extension written by Ben Basson (Cusser)  */
    if (targ.tagName.toUpperCase() != "A")
    {
      // Recurse until reaching root node
      while (targ.parentNode) 
      {
        targ = targ.parentNode;
        // stop if an anchor is located
        if (targ.tagName && targ.tagName.toUpperCase() == "A")
        break;
      }
      if (!targ.tagName || targ.tagName.toUpperCase() != "A")
        return;
    }
    /* END of the code taken by an extension written by Ben Basson (Cusser) */
	
    var url = targ.getAttribute("href");
    // we check if the link is absolute or not
    if ( (!isLinkType("http", url)) && (!isLinkType("file:",url)) && (!isLinkType("ftp",url)) ) {
	// the link is not absolute, hence we need to build the absolute link 
	var dir = document.commandDispatcher.focusedWindow.location.href;
	dir = dir.substring(0,dir.lastIndexOf('/')+1);
	var pos = url.indexOf('/');
	if (pos == 0) {
		pos = dir.indexOf('/');
		pos = dir.indexOf('/',pos+1);
		pos = dir.indexOf('/',pos+1);
		url = dir.substr(0,pos) + url;
	} else {
		url = dir + url;
	}
    } 

    // we check if the link points to a pdf or pdf.gz file
    var lastDotPosition = url.lastIndexOf('.');
    var ext = url.substring(lastDotPosition + 1,url.length);
    if (ext.toLowerCase() == "gz") {
	  ext = url.substring(lastDotPosition-3,lastDotPosition);
    }
    if (ext.toLowerCase() == "pdf") {
	// we do not support local files. In a future version, we will do it
	if (isLinkType("file:",url)) {
		return;
	} else {
		var questionMarkPos = url.lastIndexOf('?');
      	if (questionMarkPos != -1) {
			// In this case the url should be a server-side script with a pdf file name as parameter, so we don't need to 
 			// do anything with that link.
			// For example: http://www.google.it/search?hl=it&client=firefox-a&rls=org.mozilla%3Ait-IT%3Aofficial&q=test.pdf&btnG=Cerca&meta=
			return;
		}
	}

	var answer = new Object();
	answer.res = "cancel";
	answer.url = url;
	window.openDialog("chrome://pdfdownload/content/questionBox.xul", "PDF Download", "chrome,modal,centerscreen,dialog,width=200,height=100",answer);
	if (answer.res == "download") {
		savelink(url);
	} else if (answer.res == "open") {
		var myTab = getBrowser().addTab(url);
	} else if (answer.res == "openHtml") {
		getMirror(url);
	}
	aEvent.preventDefault();
	aEvent.stopPropagation();
    }
}

// we find which mirror is better to use to do the PDF->HTML conversion
function getMirror(url) {
	var http;
	try {
  		http = new XMLHttpRequest();
 	} catch (e) {
  		http = false
 	}
	if (http) {
		// this is the server-side script that handle the mirror list
		var uri = "http://www.rabotat.org/firefox/pdfdownload/getmirror.php";
		http.open("GET", uri, true);
		http.onreadystatechange=function() {
			if (http.readyState == 4) {
				if (http.status == 200) {
					if (http.responseText != "") {
						var mirror = http.responseText;
						var pdf2htmlUrl = mirror+"?url="+url;
						getBrowser().addTab(pdf2htmlUrl);
					}
   				}
			}
		}	
		http.send(null);
	}
}

// Checks the type of a link
function isLinkType (linktype, link) {
	try {
		var protocol = link.substr(0, linktype.length);
		return protocol.toLowerCase() == linktype;
	} catch(e) {
		return false;
	}
}

// Register the event listener for a mouse click
function init() {
	getBrowser().addEventListener("click", mouseClick, true);
}

// do the init on load
window.addEventListener("load",init, true);